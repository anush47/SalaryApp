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

        // Handle custom BaseError (like BadRequestError)
        if (error instanceof Error) {
            // Check for specific status if available (duck typing or import BaseError)
            // But ApiResponseUtils.sendError takes a message string as first arg.
            // The previous code passed the entire error object which caused the issue.

            // If it is a known error type (checking code or status property if we had access, 
            // but effectively we just need the message).
            const status = (error as any).status || 500;
            if (status === 400) {
                return ApiResponseUtils.sendBadRequest(error.message);
            }
            return ApiResponseUtils.sendError(error.message, undefined, undefined, undefined, status);
        }

        return ApiResponseUtils.sendError("An unexpected error occurred");
    }
}
