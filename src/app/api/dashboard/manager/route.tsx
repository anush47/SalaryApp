import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";
import dbConnect from "@/app/lib/db";
import Employee from "@/app/models/Employee";
import LeaveRequest from "@/app/models/LeaveRequest";

export const dynamic = "force-dynamic";

// GET /api/dashboard/manager?employeeId=xxx
// Returns manager's team overview and statistics
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

    // Verify the employee exists and belongs to the user
    const manager = await Employee.findById(employeeId)
      .select("_id name company")
      .lean();
    if (!manager) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
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

    if (teamMemberIds.length === 0) {
      return NextResponse.json({
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
          avgSalary: 0, // Placeholder - salary data removed for privacy
          trends: [], // Placeholder - salary data removed for privacy
        },
      });
    }

    // Parallel data fetching
    const [leaveRequests, employeesByType, employeesByDept] = await Promise.all(
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
      ]
    );

    // Get leave balance for each team member
    const teamWithLeaves = await Promise.all(
      teamMembers.map(async (member) => {
        try {
          // Fetch leave balance using the existing helper
          const balanceResponse = await fetch(
            `${
              process.env.NEXTAUTH_URL || "http://localhost:3000"
            }/api/employees/leave-balance?employeeId=${member._id}`,
            {
              headers: {
                cookie: req.headers.get("cookie") || "",
              },
            }
          );

          let leaveBalance = [];
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            leaveBalance = balanceData.summary || [];
          }

          return {
            ...member,
            leaveBalance,
          };
        } catch (err) {
          console.error(`Error fetching leave balance for ${member._id}:`, err);
          return {
            ...member,
            leaveBalance: [],
          };
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

    return NextResponse.json({
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
      performance: {
        avgSalary: 0, // Removed for privacy - managers cannot see employee salaries
        trends: [], // Removed for privacy - managers cannot see employee salaries
      },
    });
  } catch (error) {
    console.error("Error fetching manager dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch manager dashboard data" },
      { status: 500 }
    );
  }
}
