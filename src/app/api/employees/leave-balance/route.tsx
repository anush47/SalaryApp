import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";
import dbConnect from "@/app/lib/db";
import { getLeaveBalanceSummary } from "@/app/lib/leaveBalance";

export const dynamic = 'force-dynamic';

// GET /api/employees/leave-balance?employeeId=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId is required" },
        { status: 400 }
      );
    }

    // Get leave balance summary
    const summary = await getLeaveBalanceSummary(employeeId);

    return NextResponse.json({ summary }, { status: 200 });
  } catch (error) {
    console.error("Error fetching leave balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave balance" },
      { status: 500 }
    );
  }
}
