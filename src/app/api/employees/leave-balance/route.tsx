import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";
import dbConnect from "@/app/lib/db";
import { getLeaveBalanceSummary } from "@/app/lib/leaveBalance";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";

export const dynamic = 'force-dynamic';

// GET /api/employees/leave-balance?employeeId=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return ApiResponseUtils.sendUnauthorized("Unauthorized");
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return ApiResponseUtils.sendBadRequest("employeeId is required");
    }

    // Get leave balance summary
    const summary = await getLeaveBalanceSummary(employeeId);

    return ApiResponseUtils.sendSuccess({ summary }, "Leave balance retrieved successfully");
  } catch (error) {
    console.error("Error fetching leave balance:", error);
    if (error instanceof Error) {
      return ApiResponseUtils.sendInternalError(error.message);
    }
    return ApiResponseUtils.sendInternalError("Failed to fetch leave balance");
  }
}
