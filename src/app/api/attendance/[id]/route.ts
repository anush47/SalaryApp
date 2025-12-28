import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { AttendanceService } from "../service";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    return ApiMiddleware.authenticated(req, async (req, authContext) => {
        try {
            const { id } = await context.params;
            const data = await AttendanceService.getAttendanceById(id, authContext);
            if (!data) return ApiResponseUtils.sendNotFound("Attendance record not found");
            return ApiResponseUtils.sendSuccess(data);
        } catch (error) {
            return ApiResponseUtils.sendError(error instanceof Error ? error.message : "An unexpected error occurred");
        }
    });
}
