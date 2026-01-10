import { NextRequest, NextResponse } from "next/server";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { KioskService, markAttendanceSchema } from "../service";
import { z } from "zod";

/**
 * POST /api/kiosk/mark-attendance
 * Marks attendance using face recognition
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validate request body
        const { apiKey, faceData, location, deviceId, timestamp } = markAttendanceSchema.parse(body);

        // Mark attendance
        const result = await KioskService.markAttendance(
            apiKey,
            faceData,
            location,
            deviceId,
            timestamp
        );

        return ApiResponseUtils.sendSuccess(result, "Attendance marked successfully");
    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponseUtils.sendBadRequest(error.errors[0].message);
        }

        return ApiResponseUtils.sendError(error);
    }
}
