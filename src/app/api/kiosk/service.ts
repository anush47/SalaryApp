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

        const company = await Company.findOne({ apiKey, active: true })
            .select("_id name timezone attendanceConfig geoFencing")
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
        await dbConnect();

        // Validate API key first
        const companyInfo = await this.validateApiKey(apiKey);

        const employees = await Employee.find({
            company: companyInfo.companyId,
            active: true,
        })
            .select("_id name memberNo faceData")
            .sort({ memberNo: 1 })
            .lean();

        return employees.map((emp) => ({
            _id: emp._id.toString(),
            name: emp.name,
            memberNo: emp.memberNo,
            hasFaceData: !!(emp.faceData && emp.faceData.descriptors && emp.faceData.descriptors.length > 0),
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
        await dbConnect();

        // Validate API key
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
            images: faceData.images || [],
        };

        await employee.save();

        console.log(`[KIOSK] Face registered for employee: ${employee.name} (${employee.memberNo})`);
        console.log(`[KIOSK] Descriptors count: ${faceData.descriptors.length}`);
        console.log(`[KIOSK] Images count: ${faceData.images?.length || 0}`);

        return {
            success: true,
            employeeId: employee._id.toString(),
            employeeName: employee.name,
        };
    }

    /**
     * Mark attendance using face recognition
     * This is a placeholder - actual face comparison will be implemented
     */
    static async markAttendance(
        apiKey: string,
        faceData: { descriptors: number[][]; image?: string },
        location?: { latitude: number; longitude: number; accuracy?: number },
        deviceId?: string,
        timestamp?: string
    ) {
        await dbConnect();

        // Log raw request
        console.log(`\n========== [KIOSK] RAW ATTENDANCE REQUEST ==========`);
        console.log(`API Key: ${apiKey.substring(0, 8)}...`);
        console.log(`Face Descriptors Count: ${faceData.descriptors.length}`);
        console.log(`First Descriptor Length: ${faceData.descriptors[0]?.length || 0}`);
        console.log(`First Descriptor Sample (first 5):`, faceData.descriptors[0]?.slice(0, 5) || []);
        console.log(`Location:`, location ? `${location.latitude}, ${location.longitude}` : 'Not provided');
        console.log(`Device ID: ${deviceId || 'Not provided'}`);
        console.log(`Timestamp: ${timestamp || new Date().toISOString()}`);
        console.log(`Has Image: ${!!faceData.image}`);
        console.log(`====================================================\n`);

        // Validate API key
        const companyInfo = await this.validateApiKey(apiKey);

        console.log(`[KIOSK] Attendance marking attempt for company: ${companyInfo.companyName}`);

        // Get all employees with face data for this company
        const employees = await Employee.find({
            company: companyInfo.companyId,
            active: true,
            "faceData.descriptors": { $exists: true, $ne: [] },
        })
            .select("_id name memberNo faceData")
            .lean();

        console.log(`[KIOSK] Found ${employees.length} employees with registered faces`);

        if (employees.length === 0) {
            throw new BadRequestError("No employees with registered faces found for this company");
        }

        // Find best match using the first descriptor (from live capture)
        const matchResult = await this.findBestFaceMatch(faceData.descriptors[0], employees);

        if (!matchResult) {
            console.log(`[KIOSK] No matching face found (Threshold: 0.6)`);
            throw new BadRequestError("Face not recognized. Please try again.");
        }

        const { employee: matchedEmployee, confidence, distance } = matchResult;

        console.log(`\n[KIOSK] ✓ MATCH FOUND: ${matchedEmployee.name} (${matchedEmployee.memberNo})`);
        console.log(`[KIOSK] Confidence: ${(confidence * 100).toFixed(2)}% | Distance: ${distance.toFixed(4)}`);

        // Check for recent attendance (5-minute cooldown)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentAttendance = await Attendance.findOne({
            employee: matchedEmployee._id,
            timestamp: { $gte: fiveMinutesAgo },
        }).sort({ timestamp: -1 });

        if (recentAttendance) {
            const timeSinceLastMark = Math.floor((Date.now() - recentAttendance.timestamp.getTime()) / 1000);
            const timeRemaining = 300 - timeSinceLastMark; // 5 minutes = 300 seconds
            console.log(`[KIOSK] ✗ REJECTED: Recent attendance found (${timeSinceLastMark}s ago)`);
            throw new BadRequestError(
                `Please wait ${Math.ceil(timeRemaining / 60)} more minute(s) before marking attendance again.`
            );
        }

        // Get last attendance to determine type using centralized logic
        const lastAttendance = await Attendance.findOne({
            employee: matchedEmployee._id,
        }).sort({ timestamp: -1 }).lean();

        // Use centralized attendance type logic
        const attendanceTypeResult = getNextAttendanceType(lastAttendance);
        const explanation = getAttendanceTypeExplanation(attendanceTypeResult);

        console.log(`\n[KIOSK] Attendance Type Determination:`);
        console.log(`[KIOSK] → Next Type: ${attendanceTypeResult.nextType.toUpperCase()}`);
        console.log(`[KIOSK] → Reason: ${attendanceTypeResult.reason}`);
        console.log(`[KIOSK] → Explanation: ${explanation}`);
        if (attendanceTypeResult.hoursSinceLastIn) {
            console.log(`[KIOSK] → Hours Since Last IN: ${attendanceTypeResult.hoursSinceLastIn.toFixed(2)}`);
        }

        // Prepare timestamp - ALWAYS use server time for Kiosk to ensure integrity
        const eventTime = new Date(); // Use server time

        // --- SHIFT LOGIC START ---
        // Resolve Shift using centralized service
        // Kiosk always assumes "system" resolution unless we add UI to select shift (which we haven't yet)
        const dateStr = eventTime.toISOString().split('T')[0];
        const checkInTime = eventTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: companyInfo.timezone || 'Asia/Colombo' });

        let resolvedShift = null;
        let finalResolutionMode = "system";

        // Logic similar to AttendanceService.createAttendance
        const employeeDoc = await Employee.findById(matchedEmployee._id); // Re-fetch full doc for methods/virtuals if needed, or cast matchedEmployee

        // We need the full employee document for ShiftService (assignments etc)
        // matchedEmployee from 'find' is lean() so it might miss some deep fields if not selected?
        // Actually earlier we selected: "_id name memberNo faceData". 
        // ShiftService might need 'company', 'shiftAssignments' etc.
        // Let's re-fetch safely or ensure we have data. 
        // But for performance, let's try to fetch what's needed or just fetch full doc if ShiftService requires it.
        // ShiftService.resolveActiveShift takes (employee, company, ...)

        // Re-fetching full employee to be safe for complicated shift logic
        const fullEmployee = await Employee.findById(matchedEmployee._id);
        const fullCompany = await Company.findById(companyInfo.companyId); // we have companyInfo but ShiftService might expect Mongoose doc or specific shape

        if (fullEmployee && fullCompany) {
            const shiftResult = await ShiftService.resolveActiveShift(fullEmployee, fullCompany, dateStr, checkInTime);
            resolvedShift = shiftResult.shift;
            // Note: We are ignoring shiftResult.checkInBlocked for Kiosk for now, 
            // or should we block? User asked to "pick the shift".
            // If we want to be strict:
            // if (shiftResult.checkInBlocked) { throw new ForbiddenError(...) }
            // For now, we just assign the shift if found.
        }
        // --- SHIFT LOGIC END ---

        // Save to Database
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

        console.log(`[KIOSK] ✓ SAVED: Attendance ID ${attendance._id} for ${matchedEmployee.name}`);

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
            attendanceId: attendance._id.toString(),
            shiftName: resolvedShift?.name // Return shift name to frontend
        };
    }

    /**
     * Helper: Calculate Euclidean distance between two face descriptors
     * Lower distance = more similar faces
     */
    private static calculateEuclideanDistance(descriptor1: number[], descriptor2: number[]): number {
        if (descriptor1.length !== descriptor2.length) {
            throw new Error("Descriptors must have the same length");
        }

        let sum = 0;
        for (let i = 0; i < descriptor1.length; i++) {
            const diff = descriptor1[i] - descriptor2[i];
            sum += diff * diff;
        }

        return Math.sqrt(sum);
    }

    /**
     * Helper: Find best matching employee based on face descriptor
     * TODO: Implement this properly with confidence threshold
     */
    private static async findBestFaceMatch(
        inputDescriptor: number[],
        employees: any[],
        threshold: number = 0.6
    ) {
        let bestMatch = null;
        let bestDistance = Infinity;

        for (const employee of employees) {
            // Check if employee has valid descriptors array
            if (!employee.faceData || !employee.faceData.descriptors || !Array.isArray(employee.faceData.descriptors)) {
                continue;
            }

            // Compare against EACH registered descriptor for this employee
            for (const storedDescriptor of employee.faceData.descriptors) {
                if (!storedDescriptor || storedDescriptor.length !== 128) continue;

                const distance = this.calculateEuclideanDistance(
                    inputDescriptor,
                    storedDescriptor
                );

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMatch = employee;
                }
            }
        }

        // Check if best match meets threshold
        // Note: Lower distance = better match, so we check if distance is below threshold
        if (bestMatch && bestDistance < threshold) {
            return {
                employee: bestMatch,
                confidence: 1 - bestDistance, // Convert distance to confidence score
                distance: bestDistance,
            };
        }

        return null;
    }
}
