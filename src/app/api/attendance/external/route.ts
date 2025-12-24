import { NextRequest } from "next/server";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { externalAttendanceSchema } from "../service";
import dbConnect from "@/app/lib/db";
import Company from "@/app/models/Company";
import Employee from "@/app/models/Employee";
import Attendance from "@/app/models/Attendance";
import { z } from "zod";

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        // 1. API Key Authentication
        const apiKey = req.headers.get("x-api-key");
        if (!apiKey) {
            return ApiResponseUtils.sendUnauthorized("Missing API Key");
        }

        const company = await Company.findOne({ "attendanceConfig.apiKey": apiKey });
        if (!company) {
            return ApiResponseUtils.sendForbidden("Invalid API Key");
        }

        // 2. Feature Check
        if (!company.attendanceConfig?.enabled || !company.attendanceConfig?.features?.hardwareIntegration) {
            return ApiResponseUtils.sendForbidden("Hardware integration is disabled for this company");
        }

        // 3. Validation & Processing
        const body = await req.json();
        const { machineId, records } = externalAttendanceSchema.parse(body);

        const results = { success: 0, failed: 0, errors: [] as string[] };
        const validRecords = [];

        // Pre-fetch employees for efficiency
        const memberNos = records.map(r => r.memberNo);
        const employees = await Employee.find({
            company: company._id,
            memberNo: { $in: memberNos }
        }).select("_id memberNo");

        const employeeMap = new Map(employees.map(e => [e.memberNo, e._id]));

        // 4. Process Records
        for (const record of records) {
            const employeeId = employeeMap.get(record.memberNo);

            if (!employeeId) {
                results.failed++;
                results.errors.push(`Employee not found for MemberNo: ${record.memberNo}`);
                continue;
            }

            validRecords.push({
                company: company._id,
                employee: employeeId,
                timestamp: new Date(record.timestamp),
                type: record.type,
                method: "external_api",
                externalMachineId: machineId,
                externalRecordId: record.recordId,
                location: {
                    lat: 0, lng: 0, accuracy: 0, isVerified: true // Assume verified by hardware
                }
            });
            results.success++;
        }

        if (validRecords.length > 0) {
            await Attendance.insertMany(validRecords);
        }

        return ApiResponseUtils.sendSuccess(results, "Sync processed");

    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponseUtils.sendBadRequest(error.errors[0].message);
        }
        return ApiResponseUtils.sendError(error instanceof Error ? error.message : "An unexpected error occurred");
    }
}
