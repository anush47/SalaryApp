import { NextRequest } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { AttendanceService } from "../../service";
import { z } from "zod";

const approvalSchema = z.object({
    status: z.enum(["approved", "rejected"]),
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return ApiMiddleware.authenticated(req, async (req, context) => {
        try {
            const { id } = await params;
            const body = await req.json();
            const { status } = approvalSchema.parse(body);

            const data = await AttendanceService.recordApproval(id, status, context);
            return ApiResponseUtils.sendSuccess(data, `Attendance record ${status} successfully`);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return ApiResponseUtils.sendBadRequest(error.errors[0].message);
            }
            return ApiResponseUtils.sendError(error instanceof Error ? error.message : "An unexpected error occurred");
        }
    });
}
