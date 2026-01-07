import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";
import dbConnect from "@/app/lib/db";
import Employee from "@/app/models/Employee";
import LeaveRequest from "@/app/models/LeaveRequest";
import Attendance from "@/app/models/Attendance";
import { getLeaveBalanceSummary } from "@/app/lib/leaveBalance";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";

export const dynamic = "force-dynamic";

// GET /api/dashboard/manager?employeeId=xxx
// Returns manager's team overview and statistics
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

    // Verify the employee exists and belongs to the user
    const manager = await Employee.findById(employeeId)
      .select("_id name company")
      .lean();
    if (!manager) {
      return ApiResponseUtils.sendNotFound("Employee not found");
    }

    // Get all team members (employees who report to this manager)
    const teamMembers = await Employee.find({
      manager: employeeId,
      active: true,
    })
      .select("_id name memberNo designation employeeType department")
      .populate("department", "name")
      .lean();

    const teamMemberIds = teamMembers.map((m) => m._id);
    console.log("Manager Dashboard API: employeeId:", employeeId, "Team Count:", teamMemberIds.length);

    if (teamMemberIds.length === 0) {
      console.log("Manager Dashboard API: No team members found for:", employeeId);
      return ApiResponseUtils.sendSuccess({
        manager: {
          _id: (manager as any)._id,
          name: (manager as any).name,
        },
        team: {
          total: 0,
          members: [],
          byType: {},
          byDepartment: {},
        },
        leaves: {
          pending: [],
          approved: [],
          totalPending: 0,
        },
        performance: {
          avgSalary: 0,
          trends: [],
        },
      });
    }

    // Parallel data fetching
    const [leaveRequests, employeesByType, employeesByDept, attendanceApprovalsData] = await Promise.all(
      [
        // Leave requests for team members
        LeaveRequest.find({
          employee: { $in: teamMemberIds },
          status: { $in: ["pending", "approved"] },
        })
          .populate("employee", "name memberNo")
          .populate("leaveType", "name code color")
          .sort({ createdAt: -1 })
          .limit(50)
          .lean(),

        // Team members by type
        Employee.aggregate([
          { $match: { _id: { $in: teamMemberIds } } },
          {
            $group: {
              _id: "$employeeType",
              count: { $sum: 1 },
            },
          },
        ]),

        // Team members by department
        Employee.aggregate([
          { $match: { _id: { $in: teamMemberIds } } },
          {
            $lookup: {
              from: "departments",
              localField: "department",
              foreignField: "_id",
              as: "deptData",
            },
          },
          { $unwind: { path: "$deptData", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: "$deptData.name",
              count: { $sum: 1 },
            },
          },
        ]),

        // Attendance records for team members with pending status
        Attendance.find({
          employee: { $in: teamMemberIds },
          status: "pending",
        })
          .populate("employee", "name memberNo")
          .populate("shift", "name startTime endTime")
          .sort({ timestamp: -1 })
          .limit(50)
          .lean(),
      ]
    );

    // Format results
    const attendanceApprovals = (attendanceApprovalsData as any[] || []).map((rec: any) => ({
      ...rec,
      type: (rec.type || "unknown").toUpperCase(),
    }));

    // Get leave balance for each team member
    const teamWithLeaves = await Promise.all(
      teamMembers.map(async (member) => {
        try {
          const leaveBalance = await getLeaveBalanceSummary(member._id.toString());
          return {
            ...member,
            leaveBalance: leaveBalance || [],
          };
        } catch (e) {
          console.error(`Error fetching balance for ${member._id}:`, e);
          return { ...member, leaveBalance: [] };
        }
      })
    );

    // Format leave requests
    const pendingLeaves = leaveRequests.filter(
      (req) => req.status === "pending"
    );
    const approvedLeaves = leaveRequests.filter(
      (req) => req.status === "approved"
    );

    // Format employee type breakdown
    const byType = employeesByType.reduce((acc, curr) => {
      acc[curr._id || "permanent"] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    // Format department breakdown
    const byDepartment = employeesByDept.reduce((acc, curr) => {
      acc[curr._id || "Unassigned"] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    return ApiResponseUtils.sendSuccess({
      manager: {
        _id: (manager as any)._id,
        name: (manager as any).name,
      },
      team: {
        total: teamMembers.length,
        members: teamWithLeaves,
        byType,
        byDepartment,
      },
      leaves: {
        pending: pendingLeaves.map((req) => ({
          _id: req._id,
          employee: req.employee,
          leaveType: req.leaveType,
          startDate: req.startDate,
          endDate: req.endDate,
          totalDays: req.totalDays,
          reason: req.reason,
          createdAt: req.createdAt,
        })),
        approved: approvedLeaves
          .filter((req) => new Date(req.startDate) >= new Date())
          .slice(0, 10)
          .map((req) => ({
            _id: req._id,
            employee: req.employee,
            leaveType: req.leaveType,
            startDate: req.startDate,
            endDate: req.endDate,
            totalDays: req.totalDays,
          })),
        totalPending: pendingLeaves.length,
      },
      attendance: {
        pending: attendanceApprovals,
        totalPending: attendanceApprovals.length,
      },
      performance: {
        avgSalary: 0,
        trends: [],
      },
    });
  } catch (error) {
    console.error("Error fetching manager dashboard:", error);
    return ApiResponseUtils.sendInternalError(
      "Failed to fetch manager dashboard data",
      error instanceof Error ? error.message : undefined
    );
  }
}
