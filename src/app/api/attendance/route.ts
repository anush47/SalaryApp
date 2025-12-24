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

export async function PUT(req: NextRequest) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            const body = await req.json();
            console.log("PUT Attendance Payload:", body);
            const { id, status, timestamp } = z.object({
                id: z.string(),
                status: z.enum(["approved", "rejected", "pending"]),
                timestamp: z.string().optional()
            }).parse(body);

            const data = await AttendanceService.recordApproval(id, status as any, context, timestamp);
            console.log("PUT Attendance Success:", data._id);
            return ApiResponseUtils.sendSuccess(data, "Status updated successfully");
        } catch (error) {
            console.error("PUT Attendance Error:", error);
            if (error instanceof z.ZodError) {
                return ApiResponseUtils.sendBadRequest(error.errors[0].message);
            }
            return ApiResponseUtils.sendError(error instanceof Error ? error.message : "An unexpected error occurred");
        }
    });
}

export async function DELETE(req: NextRequest) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            const id = req.nextUrl.searchParams.get("id");
            if (!id) return ApiResponseUtils.sendBadRequest("ID is required");

            await AttendanceService.deleteAttendance(id, context);
            return ApiResponseUtils.sendSuccess(null, "Record deleted successfully");
        } catch (error) {
            return ApiResponseUtils.sendError(error instanceof Error ? error.message : "An unexpected error occurred");
        }
    });
}
