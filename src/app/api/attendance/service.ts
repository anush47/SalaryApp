import dbConnect from "@/app/lib/db";
import mongoose from "mongoose";
import Attendance from "@/app/models/Attendance";
import Company from "@/app/models/Company";
import Employee from "@/app/models/Employee";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/app/lib/errorHandler";
import { RequestContext } from "@/app/lib/apiResponse";
import { z } from "zod";
import { ShiftService } from "@/app/lib/services/shiftService";

// Schemas
export const attendanceCreateSchema = z.object({
    type: z.enum(["in", "out"]),
    location: z.object({
        lat: z.number(),
        lng: z.number(),
        accuracy: z.number(),
    }),
    deviceId: z.string().optional(),
    deviceDetails: z.string().optional(),
    shiftId: z.string().optional(),
    // Admin Overrides
    employeeId: z.string().optional(),
    timestamp: z.string().optional(),
    dayStatus: z.string().optional(),
    resolutionMode: z.string().optional(),
});

export const externalAttendanceSchema = z.object({
    machineId: z.string(),
    records: z.array(z.object({
        memberNo: z.number(),
        timestamp: z.string(), // ISO String
        type: z.enum(["in", "out"]),
        recordId: z.string().optional()
    }))
});

// Helper: Haversine Distance Calculation (Meters)
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const q1 = (lat1 * Math.PI) / 180;
    const q2 = (lat2 * Math.PI) / 180;
    const dq = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(dq / 2) * Math.sin(dq / 2) +
        Math.cos(q1) * Math.cos(q2) *
        Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

export class AttendanceService {



    // Client App Check-in/out & Admin Manual Entry
    static async createAttendance(body: any, context: RequestContext) {
        await dbConnect();

        const { type, location, deviceId, deviceDetails, employeeId, timestamp, dayStatus, resolutionMode: inputResolutionMode } = attendanceCreateSchema.parse(body);

        // 1. User Validation
        const isEmployer = context.user?.role === 'employer' || context.user?.role === 'admin';

        let targetEmployeeId = context.user?.id;

        if (isEmployer) {
            if (employeeId) {
                // creating for specific employee
                targetEmployeeId = employeeId; // This is the employee _ID not user ID? 
                // Wait. employeeId passed usually acts as ID.
                // But context.user.id is USER ID.
                // We need to fetch Employee by _id if passed, or by user id if self.
            } else {
                throw new BadRequestError("Employee ID is required for manual entry.");
            }
        } else if (!context.user || context.user.role !== 'employee') {
            throw new ForbiddenError("Only employees can check in/out via this API.");
        }

        // Logic split
        let employee;
        if (isEmployer && employeeId) {
            employee = await Employee.findById(employeeId);
        } else {
            employee = await Employee.findOne({ user: context.user?.id });
        }

        if (!employee) {
            throw new NotFoundError("Employee record not found.");
        }

        const company = await Company.findById(employee.company);
        if (!company) {
            throw new NotFoundError("Company record not found.");
        }

        // 2. feature check...
        if (!company.attendanceConfig?.enabled) {
            throw new ForbiddenError("Attendance system is disabled for this company.");
        }
        if (!company.attendanceConfig?.pwaCheckIn) {
            throw new ForbiddenError("Mobile check-in is disabled for this company.");
        }

        // 2.5 Shift Validation & Resolution
        let resolvedShift: any = null;
        let resolutionMode = inputResolutionMode || "system"; // Default to input or system

        if (type === 'in') {
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const checkInTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' });

            // Determine Settings to know Mode
            const settings = ShiftService.getEffectiveSettings(employee, company);
            if (inputResolutionMode !== 'status_only') {
                resolutionMode = settings?.mode || "fixed";
            }

            // Manual Mode: Use provided shiftId
            if (resolutionMode === 'manual' && body.shiftId) {
                // Verify provided shiftId exists in pool
                const shift = settings?.shifts?.find((s: any) => s._id === body.shiftId);
                if (shift) {
                    resolvedShift = shift;
                    resolutionMode = "manual";
                } else {
                    throw new BadRequestError("Invalid shift ID provided.");
                }
            } else {
                // System Resolution
                const shiftResult = await ShiftService.resolveActiveShift(employee, company, dateStr, checkInTime);

                if (shiftResult.checkInBlocked) {
                    throw new ForbiddenError(shiftResult.blockReason || "Check-in blocked by shift rules.");
                }

                if (shiftResult.isOffDay) {
                    throw new ForbiddenError("Today is marked as an Off Day.");
                }

                if (resolutionMode === 'dynamic' && !settings?.autoSelect) {
                    resolvedShift = null;
                } else {
                    resolvedShift = shiftResult.shift;
                }

                if (resolvedShift && resolutionMode !== 'status_only') {
                    const validation = ShiftService.validateCheckIn(resolvedShift, checkInTime);
                    if (!validation.valid) {
                        throw new ForbiddenError(validation.message || "Invalid check-in time for the current shift.");
                    }
                }
            }
        } else {
            // Check-out: Inherit shift from most recent check-in
            const lastIn = await Attendance.findOne({
                employee: employee._id,
                type: 'in'
            }).sort({ timestamp: -1 });

            if (lastIn && lastIn.shift) {
                resolvedShift = {
                    _id: lastIn.shift.shiftId,
                    name: lastIn.shift.name,
                    startTime: lastIn.shift.startTime,
                    endTime: lastIn.shift.endTime,
                    type: lastIn.shift.type
                };
                resolutionMode = lastIn.resolutionMode || "system";
            }
        }

        // 3. Geolocation Validation
        let isVerified = false;
        let allowedRadius = company.geoFencing?.radiusMeters || 100;

        // Check Overrides
        const overrides = employee.attendanceOverrides;
        if (overrides?.enabled && overrides.isRemote) {
            // Remote worker - Bypass check, but mark verified
            isVerified = true;
        } else {
            // Standard Validation
            let validLocations = [];

            // STRICT OVERRIDE LOGIC: If overrides are enabled and geoFencing is set, use ONLY overrides.
            if (overrides?.enabled && overrides.geoFencing?.enabled) {
                const geo = overrides.geoFencing;
                // Primary Override Zone
                if (geo.latitude && geo.longitude) {
                    validLocations.push({
                        lat: geo.latitude,
                        lng: geo.longitude,
                        radius: geo.radiusMeters || 100,
                        name: "Primary Override"
                    });
                }
                // Multiple Override Zones
                if (geo.allowedLocations && geo.allowedLocations.length > 0) {
                    validLocations.push(...geo.allowedLocations);
                }
            } else {
                // FALLBACK TO COMPANY SETTINGS

                // Add Company Default Location
                if (company.geoFencing?.enabled &&
                    company.geoFencing.latitude &&
                    company.geoFencing.longitude) {

                    validLocations.push({
                        lat: company.geoFencing.latitude,
                        lng: company.geoFencing.longitude,
                        radius: allowedRadius,
                        name: "Company Primary"
                    });
                }

                // Add Company Multiple Locations
                if (company.geoFencing?.allowedLocations && company.geoFencing.allowedLocations.length > 0) {
                    validLocations.push(...company.geoFencing.allowedLocations);
                }
            }
            // Note: Previously, logic was mixing them (Additive). Now it is Exclusive based on user request "if overriden then them or else company ones".

            // Check if user is within ANY valid location
            if (validLocations.length === 0) {
                // No locations set up - Assuming validation is open/not configured yet
                isVerified = true;
            } else {
                for (const loc of validLocations) {
                    const distance = getDistance(
                        location.lat, location.lng,
                        loc.lat, loc.lng
                    );
                    if (distance <= (loc.radius || allowedRadius)) {
                        isVerified = true;
                        break;
                    }
                }
            }

            // Enforcement
            const effectiveEnforce = (overrides?.enabled && overrides.geoFencing?.enabled)
                ? overrides.geoFencing.enforceValidation
                : company.geoFencing?.enforceValidation;

            if (!isVerified && effectiveEnforce) {
                throw new ForbiddenError("You are not within the allowed clock-in range.");
            }
        }

        // 4. Approval Check
        let status: "pending" | "approved" = "approved";
        const requireApproval = overrides?.enabled
            ? overrides.requireApproval
            : company.attendanceConfig?.requireApproval;

        if (requireApproval) {
            status = "pending";
        }

        // Determine Timestamp
        const recordTime = (isEmployer && timestamp) ? new Date(timestamp) : new Date();

        // 5. Create Record
        const attendance = await Attendance.create({
            company: company._id,
            employee: employee._id,
            timestamp: recordTime,
            type,
            method: isEmployer ? "manual" : "web",
            status,
            location: {
                ...location,
                isVerified
            },
            deviceId,
            deviceDetails,
            remarks: body.remarks,
            dayStatus: dayStatus as any,
            shift: resolvedShift ? {
                shiftId: resolvedShift._id,
                name: resolvedShift.name,
                startTime: resolvedShift.startTime,
                endTime: resolvedShift.endTime,
                type: resolvedShift.type
            } : undefined,
            resolutionMode: (isEmployer && resolutionMode !== 'status_only') ? "manual_admin" : resolutionMode
        });

        return attendance;
    }

    // Get single attendance record by ID
    static async getAttendanceById(id: string, context: RequestContext) {
        await dbConnect(); // Ensure DB connection
        if (!context.user) throw new ForbiddenError("Authentication required");

        // Permission check: Employer of that company OR the employee themselves
        // First fetch the record to check permissions
        const record = await Attendance.findById(id)
            .populate('employee', 'name memberNo attendanceOverrides role')
            .populate('shift', 'name startTime endTime');

        if (!record) return null;

        const isEmployer = await Company.exists({ _id: record.company, user: context.user.id });
        const isSelf = (record.employee as any)._id.toString() === context.user.id;
        const isCompanyAdmin = false; // TODO: Check if user is an admin of the company

        if (!isEmployer && !isSelf && !isCompanyAdmin) {
            throw new Error("Unauthorized to access this record");
        }

        return record;
    }

    // Dashboard / Report
    static async getAttendance(req: any, context: RequestContext) {
        await dbConnect();

        // Filters: Date Range, Employee, Company
        const companyId = req.nextUrl.searchParams.get("companyId");
        const date = req.nextUrl.searchParams.get("date"); // YYYY-MM-DD
        const startDateParam = req.nextUrl.searchParams.get("startDate");
        const endDateParam = req.nextUrl.searchParams.get("endDate");

        if (!companyId) throw new BadRequestError("Company ID is required");

        // Auth Check & Multi-role visibility logic
        if (!context.user) throw new ForbiddenError("Authentication required");

        const isEmployer = context.user.role === 'employer' || context.user.role === 'admin';
        let filter: any = { company: companyId };

        if (!isEmployer) {
            // Find employee record for the current user
            const currentEmployee = await Employee.findOne({ user: context.user.id });
            if (!currentEmployee) throw new ForbiddenError("Employee record not found.");

            // Check if this employee is a manager for others
            const subordinates = await Employee.find({ manager: currentEmployee._id }, "_id");

            if (subordinates.length > 0) {
                // Manager: sees own and subordinates
                const allowedEmployeeIds = [currentEmployee._id, ...subordinates.map(s => s._id)];
                filter.employee = { $in: allowedEmployeeIds };
            } else {
                // Regular Employee: only sees own
                filter.employee = currentEmployee._id;
            }
        }

        // Date Range Logic
        if (startDateParam || endDateParam) {
            filter.timestamp = {};
            if (startDateParam) filter.timestamp.$gte = new Date(startDateParam);
            if (endDateParam) filter.timestamp.$lte = new Date(endDateParam);
        } else if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            filter.timestamp = { $gte: startOfDay, $lte: endOfDay };
        }

        // Fetch
        const records = await Attendance.find(filter)
            .populate("employee", "name memberNo nic designation attendanceOverrides")
            .sort({ timestamp: -1 })
            .lean();

        return records;
    }

    static async recordApproval(attendanceId: string, status: "approved" | "rejected" | "pending", context: RequestContext, timestamp?: string, shiftId?: string, remarks?: string, dayStatus?: string) {
        console.log(`[AttendanceService] recordApproval called for ID: ${attendanceId}, Status: ${status}, Timestamp: ${timestamp}`);
        await dbConnect();

        if (!context.user) throw new ForbiddenError("Auth required");

        const attendance = await Attendance.findById(attendanceId);
        if (!attendance) throw new NotFoundError("Attendance record not found");

        // Verify authority
        const isEmployer = context.user.role === 'employer' || context.user.role === 'admin';

        if (!isEmployer) {
            // Check if user is the manager of the employee who marked attendance
            const currentEmployee = await Employee.findOne({ user: context.user.id });
            const targetEmployee = await Employee.findById(attendance.employee);

            if (!currentEmployee || !targetEmployee || targetEmployee.manager?.toString() !== (currentEmployee as any)._id.toString()) {
                throw new ForbiddenError("You are not authorized to approve this record");
            }
        }

        // Logic check: New timestamp cannot be earlier than the previous record of the employee
        if (timestamp) {
            const newDate = new Date(timestamp);
            const prevRecord = await Attendance.findOne({
                employee: attendance.employee,
                timestamp: { $lt: attendance.timestamp },
                _id: { $ne: attendance._id }
            }).sort({ timestamp: -1 });

            if (prevRecord && newDate < prevRecord.timestamp) {
                throw new BadRequestError(`Cannot set time earlier than previous record (${prevRecord.timestamp.toLocaleString()})`);
            }
            console.log(`[AttendanceService] Updating timestamp to: ${timestamp}`);
            attendance.timestamp = newDate;
        }

        // Manual Shift Override
        if (shiftId) {
            const company = await Company.findById(attendance.company);
            if (company && company.shiftSettings?.shifts) {
                const newShift = company.shiftSettings.shifts.find((s: any) => s._id === shiftId);
                if (newShift) {
                    attendance.shift = {
                        shiftId: (newShift._id as string) || "",
                        name: newShift.name || "",
                        startTime: newShift.startTime || "",
                        endTime: newShift.endTime || "",
                        type: newShift.type || ""
                    };
                    attendance.resolutionMode = "manual_override";
                    console.log(`[AttendanceService] Shift manually overridden to: ${newShift.name}`);
                }
            }
        }

        attendance.status = status;
        attendance.approvedBy = new mongoose.Types.ObjectId(context.user.id);
        attendance.approvedAt = new Date();
        if (remarks !== undefined) {
            attendance.remarks = remarks;
        }
        if (dayStatus) {
            // @ts-ignore
            attendance.dayStatus = dayStatus;
        }
        await attendance.save();
        console.log(`[AttendanceService] Successfully saved attendance record: ${attendanceId}`);

        return attendance;
    }

    static async deleteAttendance(attendanceId: string, context: RequestContext) {
        await dbConnect();

        if (!context.user) throw new ForbiddenError("Auth required");

        const attendance = await Attendance.findById(attendanceId);
        if (!attendance) throw new NotFoundError("Attendance record not found");

        // Authorization check: Only employers, admins, or managers can delete
        const isEmployer = context.user.role === 'employer' || context.user.role === 'admin';
        if (!isEmployer) {
            const currentEmployee = await Employee.findOne({ user: context.user.id });
            const targetEmployee = await Employee.findById(attendance.employee);

            if (!currentEmployee || !targetEmployee || targetEmployee.manager?.toString() !== (currentEmployee as any)._id.toString()) {
                throw new ForbiddenError("You are not authorized to delete this record");
            }
        }

        await Attendance.findByIdAndDelete(attendanceId);
        return { success: true };
    }

    // Integration with Salary Generation
    static async getAttendanceForSalaryPeriod(
        companyId: string,
        period: string,
        employeeIds: string[]
    ): Promise<{ [key: string]: Date[] }> {
        await dbConnect();

        // Calculate date range for the period (e.g., "2023-10")
        const [year, month] = period.split("-").map(Number);
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

        // Fetch validated attendance records
        const attendanceRecords = await Attendance.find({
            company: companyId,
            timestamp: { $gte: startDate, $lte: endDate },
            employee: { $in: employeeIds }
        }).sort({ timestamp: 1 });

        // Group by Employee ID
        const liveAttendanceMap: { [key: string]: Date[] } = {};

        attendanceRecords.forEach(record => {
            const empId = record.employee.toString();
            if (!liveAttendanceMap[empId]) {
                liveAttendanceMap[empId] = [];
            }
            liveAttendanceMap[empId].push(record.timestamp);
        });

        return liveAttendanceMap;
    }
}
