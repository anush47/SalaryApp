import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { AttendanceService } from "./service";
import { z } from "zod";

export async function GET(req: NextRequest) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            const data = await AttendanceService.getAttendance(req, context);
            return ApiResponseUtils.sendSuccess(data);
        } catch (error) {
            return ApiResponseUtils.sendError(error instanceof Error ? error.message : "An unexpected error occurred");
        }
    });
}

export async function POST(req: NextRequest) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            const body = await req.json();
            const data = await AttendanceService.createAttendance(body, context);
            return ApiResponseUtils.sendSuccess(data, "Attendance recorded successfully");
        } catch (error) {
            if (error instanceof z.ZodError) {
                return ApiResponseUtils.sendBadRequest(error.errors[0].message);
            }
            return ApiResponseUtils.sendError(error instanceof Error ? error.message : "An unexpected error occurred");
        }
    });
}
