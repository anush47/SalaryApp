import dbConnect from "@/app/lib/db";
import Company from "@/app/models/Company";
import Employee from "@/app/models/Employee";
import Attendance from "@/app/models/Attendance";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/app/lib/errorHandler";
import { z } from "zod";

import { getNextAttendanceType, getAttendanceTypeExplanation } from "@/app/lib/attendanceTypeLogic";

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
        descriptor: z.array(z.number()).length(128, "Face descriptor must be 128 dimensions"),
        images: z.array(z.string()).optional(),
    }),
});

export const markAttendanceSchema = z.object({
    apiKey: z.string().min(1, "API key is required"),
    faceData: z.object({
        descriptor: z.array(z.number()).length(128, "Face descriptor must be 128 dimensions"),
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
            hasFaceData: !!(emp.faceData && emp.faceData.descriptor && emp.faceData.descriptor.length > 0),
        }));
    }

    /**
     * Register face data for an employee
     */
    static async registerEmployeeFace(
        apiKey: string,
        employeeId: string,
        faceData: { descriptor: number[]; images?: string[] }
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
            descriptor: faceData.descriptor,
            registeredAt: new Date(),
            images: faceData.images || [],
        };

        await employee.save();

        console.log(`[KIOSK] Face registered for employee: ${employee.name} (${employee.memberNo})`);
        console.log(`[KIOSK] Descriptor length: ${faceData.descriptor.length}`);
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
        faceData: { descriptor: number[]; image?: string },
        location?: { latitude: number; longitude: number; accuracy?: number },
        deviceId?: string,
        timestamp?: string
    ) {
        await dbConnect();

        // Log raw request
        console.log(`\n========== [KIOSK] RAW ATTENDANCE REQUEST ==========`);
        console.log(`API Key: ${apiKey.substring(0, 8)}...`);
        console.log(`Face Descriptor Length: ${faceData.descriptor.length}`);
        console.log(`Face Descriptor Sample (first 5):`, faceData.descriptor.slice(0, 5));
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
            "faceData.descriptor": { $exists: true, $ne: [] },
        })
            .select("_id name memberNo faceData")
            .lean();

        console.log(`[KIOSK] Found ${employees.length} employees with registered faces`);

        if (employees.length === 0) {
            throw new BadRequestError("No employees with registered faces found for this company");
        }

        // Find best match
        const matchResult = await this.findBestFaceMatch(faceData.descriptor, employees);

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

        console.log(`\n[KIOSK] ⚠️  LOG ONLY MODE: Attendance NOT saved to database`);
        console.log(`[KIOSK] Would mark: ${attendanceTypeResult.nextType.toUpperCase()} for ${matchedEmployee.name}\n`);

        // Prepare timestamp
        const eventTime = timestamp ? new Date(timestamp) : new Date();

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
            if (!employee.faceData || !employee.faceData.descriptor) {
                continue;
            }

            const distance = this.calculateEuclideanDistance(
                inputDescriptor,
                employee.faceData.descriptor
            );

            if (distance < bestDistance) {
                bestDistance = distance;
                bestMatch = employee;
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
