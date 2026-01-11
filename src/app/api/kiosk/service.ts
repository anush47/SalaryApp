import dbConnect from "@/app/lib/db";
import Company from "@/app/models/Company";
import Employee from "@/app/models/Employee";
import Attendance from "@/app/models/Attendance";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/app/lib/errorHandler";
import { z } from "zod";

import { getNextAttendanceType, getAttendanceTypeExplanation } from "@/app/lib/attendanceTypeLogic";
import { ShiftService } from "@/app/lib/services/shiftService";

// Validation schemas
export const validateApiKeySchema = z.object({
    apiKey: z.string().min(1, "API key is required"),
});

export const getEmployeesSchema = z.object({
    apiKey: z.string().min(1, "API key is required"),
});

export const registerFaceSchema = z.object({
    apiKey: z.string().min(1, "API key is required"),
    employeeId: z.string().min(1, "Employee ID is required"),
    faceData: z.object({
        descriptors: z.array(z.array(z.number())).min(1, "At least one face descriptor is required"),
        images: z.array(z.string()).optional(),
    }),
});

export const markAttendanceSchema = z.object({
    apiKey: z.string().min(1, "API key is required"),
    faceData: z.object({
        descriptors: z.array(z.array(z.number())).min(1, "At least one face descriptor is required"),
        image: z.string().optional(),
    }),
    location: z.object({
        latitude: z.number(),
        longitude: z.number(),
        accuracy: z.number().optional(),
    }).optional(),
    deviceId: z.string().min(1, "Device ID is required"),
    timestamp: z.string().optional(),
});

/**
 * Kiosk Service Layer
 * Handles all kiosk-related operations with API key authentication
 */
export class KioskService {
    /**
     * Validate API key and return company information
     */
    static async validateApiKey(apiKey: string) {
        await dbConnect();

        // Updated to use the nested path
        const company = await Company.findOne({ "attendanceConfig.apiKey": apiKey, active: true })
            .select("_id name timezone attendanceConfig")
            .lean();

        if (!company) {
            throw new UnauthorizedError("Invalid or inactive API key");
        }

        return {
            companyId: company._id.toString(),
            companyName: company.name,
            timezone: company.timezone || "Asia/Colombo",
            attendanceConfig: company.attendanceConfig,
            geoFencing: company.geoFencing,
        };
    }

    /**
     * Get list of active employees for face registration
     */
    static async getEmployeesForKiosk(apiKey: string) {
        // Validate API key first (Includes dbConnect)
        const companyInfo = await this.validateApiKey(apiKey);
        const employees = await Employee.find({
            company: companyInfo.companyId,
            active: true,
        })
            .select("_id name memberNo faceData.registeredAt")
            .sort({ memberNo: 1 })
            .lean();

        return employees.map((emp) => ({
            _id: emp._id.toString(),
            name: emp.name,
            memberNo: emp.memberNo,
            hasFaceData: !!(emp.faceData && emp.faceData.registeredAt),
        }));
    }

    /**
     * Register face data for an employee
     */
    static async registerEmployeeFace(
        apiKey: string,
        employeeId: string,
        faceData: { descriptors: number[][]; images?: string[] }
    ) {
        // Validate API key (Includes dbConnect)
        const companyInfo = await this.validateApiKey(apiKey);

        // Find employee
        const employee = await Employee.findOne({
            _id: employeeId,
            company: companyInfo.companyId,
            active: true,
        });

        if (!employee) {
            throw new NotFoundError("Employee not found or inactive");
        }

        // Update employee with face data
        employee.faceData = {
            descriptors: faceData.descriptors,
            registeredAt: new Date(),
        };

        await employee.save();

        console.log(`[KIOSK] Face registered: ${employee.name} | Descriptors: ${faceData.descriptors.length}`);

        return {
            success: true,
            employeeId: (employee._id as any).toString(),
            employeeName: employee.name,
        };
    }

    /**
     * Mark attendance using face recognition
     * Optimized for speed: Parallelizes I/O and inference
     */
    static async markAttendance(
        apiKey: string,
        faceData: { descriptors: number[][]; image?: string },
        location?: { latitude: number; longitude: number; accuracy?: number },
        deviceId?: string,
        timestamp?: string
    ) {
        const totalStartTime = Date.now();
        console.log(`[KIOSK] 🕒 Starting markAttendance performance trace...`);

        // 1. Validate API key and get company info (Includes dbConnect)
        const validateStartTime = Date.now();
        const companyInfo = await this.validateApiKey(apiKey);
        const { companyId, attendanceConfig } = companyInfo;
        console.log(`[KIOSK] ⏱️ API Key Validation & DB Connect: ${Date.now() - validateStartTime}ms`);

        // 2. Start Parallel Tasks: Employee fetching
        const parallelStartTime = Date.now();
        const employeesPromise = Employee.find({
            company: companyId,
            active: true,
            "faceData.descriptors": { $exists: true }, // Only index-covered query
        })
            .select("_id name memberNo +faceData.descriptors")
            .lean();

        // 3. Await employees and run face matching
        const employees = await employeesPromise;
        console.log(`[KIOSK] ⏱️ Employee Fetching: ${Date.now() - parallelStartTime}ms | Count: ${employees?.length || 0}`);

        if (!employees || employees.length === 0) {
            throw new BadRequestError("No employees with registered faces found for this company");
        }

        const matchStartTime = Date.now();
        const matchResult = await this.findBestFaceMatch(faceData.descriptors[0], employees);
        const matchTime = Date.now() - matchStartTime;
        console.log(`[KIOSK] ⏱️ Face Matching: ${matchTime}ms`);

        if (!matchResult) {
            throw new BadRequestError("Face not recognized. Please try again.");
        }

        const { employee: matchedEmployee, confidence, distance } = matchResult;

        // 4. Parallelize the remaining DB checks
        const finalChecksStartTime = Date.now();
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const [recentAttendance, lastAttendance, fullEmployee, fullCompany] = await Promise.all([
            // 4a. Cooldown check
            Attendance.findOne({
                employee: matchedEmployee._id as any,
                timestamp: { $gte: fiveMinutesAgo },
            }).sort({ timestamp: -1 }).lean(),

            // 4b. Fetch last attendance for type logic mapping
            Attendance.findOne({
                employee: matchedEmployee._id,
            }).sort({ timestamp: -1 }).lean(),

            // 4c. Fetch full documents for ShiftService logic
            Employee.findById(matchedEmployee._id).lean(),
            Company.findById(companyId).lean(),
        ]);
        console.log(`[KIOSK] ⏱️ Parallel Multi-Checks: ${Date.now() - finalChecksStartTime}ms`);

        // Handle Cooldown
        if (recentAttendance) {
            const timeSinceLast = Date.now() - (recentAttendance.timestamp as Date).getTime();
            const timeRemaining = Math.ceil((300000 - timeSinceLast) / 60000);
            throw new BadRequestError(`Please wait ${timeRemaining} more minute(s) before marking attendance again.`);
        }

        // 5. Determine attendance type (IN/OUT)
        const typeStartTime = Date.now();
        const attendanceTypeResult = getNextAttendanceType(lastAttendance);
        const explanation = getAttendanceTypeExplanation(attendanceTypeResult);

        console.log(`\n[KIOSK] Attendance Type Determination:`);
        console.log(`[KIOSK] → Next Type: ${attendanceTypeResult.nextType.toUpperCase()}`);
        console.log(`[KIOSK] → Reason: ${attendanceTypeResult.reason}`);
        console.log(`[KIOSK] ⏱️ Type Determination Logic: ${Date.now() - typeStartTime}ms`);

        // Prepare timestamp
        const eventTime = new Date();

        // --- SHIFT LOGIC START ---
        const shiftStartTime = Date.now();
        let resolvedShift = null;
        if (fullEmployee && fullCompany) {
            const dateStr = eventTime.toISOString().split('T')[0];
            const checkInTime = eventTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: companyInfo.timezone || 'Asia/Colombo' });

            // Note: ShiftService.resolveActiveShift might do more DB lookups internally (populate roster),
            // but we've mitigated the primary bottlenecks.
            const shiftResult = await ShiftService.resolveActiveShift(fullEmployee as any, fullCompany as any, dateStr, checkInTime);
            resolvedShift = shiftResult.shift;
        }
        console.log(`[KIOSK] ⏱️ Shift Selection Completion: ${Date.now() - shiftStartTime}ms`);
        // --- SHIFT LOGIC END ---
        // --- SHIFT LOGIC END ---

        // 7. Save attendance
        const saveStartTime = Date.now();
        const attendance = await Attendance.create({
            company: companyInfo.companyId,
            employee: matchedEmployee._id,
            timestamp: eventTime,
            type: attendanceTypeResult.nextType,
            method: "kiosk",
            status: "approved", // Kiosk is considered verified
            location: location ? {
                lat: location.latitude,
                lng: location.longitude,
                radius: location.accuracy,
                isVerified: true, // Kiosk location is trusted (or verified by deviceId)
                name: "Kiosk Device"
            } : undefined,
            deviceId: deviceId,
            deviceDetails: "Kiosk Face Recognition",
            confidence: confidence, // Store facial recognition confidence if schema supports it
            verified: true,
            resolutionMode: "system",
            shift: resolvedShift ? {
                shiftId: resolvedShift._id,
                name: resolvedShift.name,
                startTime: resolvedShift.startTime,
                endTime: resolvedShift.endTime,
                type: resolvedShift.type
            } : undefined
        });

        console.log(`[KIOSK] ⏱️ DB Save: ${Date.now() - saveStartTime}ms`);
        console.log(`[KIOSK] ✅ Total Time: ${Date.now() - totalStartTime}ms`);

        // Return real match response
        return {
            success: true,
            matched: true,
            employeeId: matchedEmployee._id.toString(),
            employeeName: matchedEmployee.name,
            memberNo: matchedEmployee.memberNo,
            type: attendanceTypeResult.nextType,
            timestamp: eventTime.toISOString(),
            verified: true,
            confidence: confidence,
            attendanceTypeReason: attendanceTypeResult.reason,
            attendanceId: (attendance._id as any).toString(),
            shiftName: resolvedShift?.name // Return shift name to frontend
        };
    }

    /**
     * Helper: Calculate Euclidean distance between two face descriptors
     */
    private static calculateEuclideanDistance(descriptor1: number[], descriptor2: number[]): number {
        let sum = 0;
        for (let i = 0; i < descriptor1.length; i++) {
            const diff = descriptor1[i] - descriptor2[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    /**
     * Helper: Find best matching employee based on face descriptor
     * Threshold set to 0.4 (60% confidence) per security requirements
     */
    private static async findBestFaceMatch(
        inputDescriptor: number[],
        employees: any[],
        threshold: number = 0.4
    ) {
        let bestMatch = null;
        let bestDistance = Infinity;

        for (const employee of employees) {
            if (!employee.faceData?.descriptors?.length) continue;

            for (const storedDescriptor of employee.faceData.descriptors) {
                if (!storedDescriptor || storedDescriptor.length !== 128) continue;

                const distance = this.calculateEuclideanDistance(inputDescriptor, storedDescriptor);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMatch = employee;
                }
            }
        }

        if (bestMatch && bestDistance < threshold) {
            return {
                employee: bestMatch,
                confidence: 1 - bestDistance,
                distance: bestDistance,
            };
        }

        return null;
    }
}
