import dbConnect from "@/app/lib/db";
import Company from "@/app/models/Company";
import Employee from "@/app/models/Employee";
import Attendance from "@/app/models/Attendance";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/app/lib/errorHandler";
import { z } from "zod";

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

        // Validate API key
        const companyInfo = await this.validateApiKey(apiKey);

        console.log(`[KIOSK] Attendance marking attempt for company: ${companyInfo.companyName}`);
        console.log(`[KIOSK] Face descriptor length: ${faceData.descriptor.length}`);
        console.log(`[KIOSK] Location:`, location);
        console.log(`[KIOSK] Device ID: ${deviceId}`);
        console.log(`[KIOSK] Timestamp: ${timestamp || new Date().toISOString()}`);

        // TODO: Implement face comparison logic
        // For now, return a placeholder response

        // Get all employees with face data for this company
        const employees = await Employee.find({
            company: companyInfo.companyId,
            active: true,
            "faceData.descriptor": { $exists: true, $ne: [] },
        })
            .select("_id name memberNo faceData")
            .lean();

        console.log(`[KIOSK] Found ${employees.length} employees with registered faces`);

        // Placeholder: Compare with first employee (will be replaced with actual comparison)
        if (employees.length === 0) {
            throw new BadRequestError("No employees with registered faces found");
        }

        // TODO: Implement actual face comparison using euclidean distance
        // const bestMatch = await this.findBestFaceMatch(faceData.descriptor, employees);

        // For now, use first employee as placeholder
        const matchedEmployee = employees[0];

        console.log(`[KIOSK] PLACEHOLDER: Matched with employee: ${matchedEmployee.name}`);

        // Determine if this is check-in or check-out
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastAttendance = await Attendance.findOne({
            employee: matchedEmployee._id,
            timestamp: { $gte: today },
        }).sort({ timestamp: -1 });

        const attendanceType = !lastAttendance || lastAttendance.type === "out" ? "in" : "out";

        console.log(`[KIOSK] Attendance type: ${attendanceType}`);
        console.log(`[KIOSK] Last attendance:`, lastAttendance ? lastAttendance.type : "none");

        // Return placeholder response
        return {
            success: true,
            matched: true,
            employeeId: matchedEmployee._id.toString(),
            employeeName: matchedEmployee.name,
            memberNo: matchedEmployee.memberNo,
            type: attendanceType,
            timestamp: timestamp || new Date().toISOString(),
            verified: true, // Placeholder
            confidence: 0.95, // Placeholder confidence score
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
