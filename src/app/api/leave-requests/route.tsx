import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../auth/[...nextauth]/options";
import dbConnect from "@/app/lib/db";
import LeaveRequest from "@/app/models/LeaveRequest";
import LeaveType from "@/app/models/LeaveType";
import Employee from "@/app/models/Employee";
import Company from "@/app/models/Company";
import Department from "@/app/models/Department";
import { isInManagementChain } from "@/app/lib/employeeHierarchy";
import {
  getPaginationParams,
  createPaginatedResponse,
  getTotalCount,
} from "@/app/lib/pagination";

// GET /api/leave-requests - List leave requests with filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const myRequests = searchParams.get("myRequests") === "true";
    const pendingApprovals = searchParams.get("pendingApprovals") === "true";

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    // Verify access to company
    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check access
    if (session.user.role !== "admin") {
      if (session.user.role === "employer") {
        if (company.user.toString() !== session.user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else if (session.user.role === "employee") {
        // Employees can only see their own requests or requests they need to approve
        const employee = await Employee.findOne({
          user: session.user.id,
          company: companyId,
        });
        if (!employee) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    // Build query
    const query: any = {
      company: companyId, // Always filter by company
    };

    // If myRequests, show employee's own requests
    if (myRequests && session.user.role === "employee") {
      const employee = await Employee.findOne({
        user: session.user.id,
        company: companyId,
      });
      if (employee) {
        query.employee = employee._id;
      }
    }

    // If pendingApprovals, show requests assigned to this employee as approver
    if (pendingApprovals && session.user.role === "employee") {
      const employee = await Employee.findOne({
        user: session.user.id,
        company: companyId,
      });
      if (employee) {
        query.approver = employee._id;
        query.status = "pending";
      }
    }

    // For employer/admin, filter by employeeId if provided
    if (employeeId && (session.user.role === "employer" || session.user.role === "admin")) {
      query.employee = employeeId;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.$or = [];
      if (startDate) {
        query.$or.push({ startDate: { $gte: new Date(startDate) } });
      }
      if (endDate) {
        query.$or.push({ endDate: { $lte: new Date(endDate) } });
      }
    }

    // Get pagination params
    const { page, limit, skip } = getPaginationParams(req);

    const leaveRequests = await LeaveRequest.find(query)
      .populate("employee", "name memberNo designation")
      .populate("leaveType", "name code color")
      .populate("approver", "name memberNo")
      .populate("approvedBy", "name memberNo")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await getTotalCount(LeaveRequest, query);

    const response = createPaginatedResponse(leaveRequests, page, limit, total);
    return NextResponse.json({ ...response, leaveRequests: response.data }, { status: 200 });
  } catch (error) {
    // console.error("Error fetching leave requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave requests" },
      { status: 500 }
    );
  }
}

// POST /api/leave-requests - Apply for leave
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const {
      employeeId,
      leaveTypeId,
      startDate,
      endDate,
      halfDay,
      reason,
      documents,
    } = body;

    // Validate required fields
    if (!employeeId || !leaveTypeId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "employeeId, leaveTypeId, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    // Find employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Verify access (employee can only apply for themselves, employer/admin can apply for anyone)
    if (session.user.role === "employee") {
      const employeeUser = await Employee.findOne({
        user: session.user.id,
        company: employee.company,
      });
      if (!employeeUser || employeeUser._id.toString() !== employeeId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (session.user.role === "employer") {
      const company = await Company.findById(employee.company);
      if (company.user.toString() !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Find leave type
    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType) {
      return NextResponse.json(
        { error: "Leave type not found" },
        { status: 404 }
      );
    }

    // Check if leave type is active
    if (!leaveType.isActive) {
      return NextResponse.json(
        { error: "This leave type is no longer active" },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    // Calculate total days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    let totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end dates
    if (halfDay) {
      totalDays = 0.5;
    }

    // Check if employee has sufficient leave balance (only for paid leaves)
    if (leaveType.isPaid) {
      // Find employee's leave balance for this type
      const employeeLeaveBalance = employee.leaveTypes.find(
        (lt: any) => lt.leaveType.toString() === leaveTypeId
      );

      if (!employeeLeaveBalance) {
        return NextResponse.json(
          { error: "Leave type not assigned to this employee" },
          { status: 400 }
        );
      }

      if (employeeLeaveBalance.balance < totalDays) {
        return NextResponse.json(
          { error: `Insufficient leave balance. Available: ${employeeLeaveBalance.balance} days` },
          { status: 400 }
        );
      }

      // Check max consecutive days
      if (leaveType.maxConsecutiveDays && totalDays > leaveType.maxConsecutiveDays) {
        return NextResponse.json(
          { error: `Maximum consecutive days for this leave type is ${leaveType.maxConsecutiveDays}` },
          { status: 400 }
        );
      }
    }

    // Check if document is required
    if (leaveType.requiresDocument && (!documents || documents.length === 0)) {
      return NextResponse.json(
        { error: "Document is required for this leave type" },
        { status: 400 }
      );
    }

    // Check for overlapping leave requests
    const overlappingLeaves = await LeaveRequest.find({
      employee: employeeId,
      status: { $in: ["pending", "approved"] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    if (overlappingLeaves.length > 0) {
      return NextResponse.json(
        { error: "You have overlapping leave requests for this period" },
        { status: 400 }
      );
    }

    // Determine approver (employee's manager)
    let approver = employee.manager;
    if (!approver) {
      // If no manager, check department manager
      if (employee.department) {
        const department = await Department.findById(employee.department).populate("manager");
        if (department && department.manager) {
          approver = department.manager;
        }
      }
    }

    // Auto-approve if no approval required or no approver found
    const autoApprove = !leaveType.requiresApproval || !approver;

    // Create leave request
    const leaveRequest = new LeaveRequest({
      employee: employeeId,
      company: employee.company,
      leaveType: leaveTypeId,
      startDate: start,
      endDate: end,
      totalDays,
      halfDay: halfDay || false,
      reason: reason || "",
      status: autoApprove ? "approved" : "pending",
      approver: approver || null,
      approvedBy: autoApprove ? employeeId : null,
      approvedAt: autoApprove ? new Date() : null,
      documents: documents || [],
    });

    await leaveRequest.save();

    // If auto-approved and paid leave, deduct balance immediately
    if (autoApprove && leaveType.isPaid) {
      const leaveBalance = employee.leaveTypes.find(
        (lt: any) => lt.leaveType.toString() === leaveTypeId
      );
      if (leaveBalance) {
        leaveBalance.balance -= totalDays;
        await employee.save();
      }
    }

    await leaveRequest.populate([
      { path: "employee", select: "name memberNo designation" },
      { path: "leaveType", select: "name code color" },
      { path: "approver", select: "name memberNo" },
    ]);

    return NextResponse.json(
      {
        message: autoApprove
          ? "Leave request auto-approved successfully"
          : "Leave request submitted successfully",
        leaveRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    // console.error("Error creating leave request:", error);
    return NextResponse.json(
      { error: "Failed to create leave request" },
      { status: 500 }
    );
  }
}

// PUT /api/leave-requests - Update leave request (approve/reject/cancel)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { leaveRequestId, action, remarks } = body;

    if (!leaveRequestId || !action) {
      return NextResponse.json(
        { error: "leaveRequestId and action are required" },
        { status: 400 }
      );
    }

    // Find leave request
    const leaveRequest = await LeaveRequest.findById(leaveRequestId)
      .populate("employee")
      .populate("leaveType");

    if (!leaveRequest) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    const employee = await Employee.findById(leaveRequest.employee._id);
    const leaveType = await LeaveType.findById(leaveRequest.leaveType._id);

    // Verify access based on action
    if (action === "approve" || action === "reject") {
      // Only approver, employer, or admin can approve/reject
      if (session.user.role === "employee") {
        const approverEmployee = await Employee.findOne({
          user: session.user.id,
        });
        if (!approverEmployee) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Check if this employee is the assigned approver or in management chain
        const isApprover = leaveRequest.approver &&
          leaveRequest.approver.toString() === approverEmployee._id.toString();
        const inChain = await isInManagementChain(
          approverEmployee._id.toString(),
          leaveRequest.employee._id.toString()
        );

        if (!isApprover && !inChain) {
          return NextResponse.json(
            { error: "You are not authorized to approve/reject this leave request" },
            { status: 403 }
          );
        }
      } else if (session.user.role === "employer") {
        const company = await Company.findById(employee.company);
        if (company.user.toString() !== session.user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    } else if (action === "cancel") {
      // Only the employee themselves or employer/admin can cancel
      if (session.user.role === "employee") {
        const requestingEmployee = await Employee.findOne({
          user: session.user.id,
        });
        if (
          !requestingEmployee ||
          requestingEmployee._id.toString() !== leaveRequest.employee._id.toString()
        ) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else if (session.user.role === "employer") {
        const company = await Company.findById(employee.company);
        if (company.user.toString() !== session.user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    switch (action) {
      case "approve":
        if (leaveRequest.status !== "pending") {
          return NextResponse.json(
            { error: "Only pending requests can be approved" },
            { status: 400 }
          );
        }

        leaveRequest.status = "approved";
        const approvingEmployee = await Employee.findOne({ user: session.user.id });
        leaveRequest.approvedBy = approvingEmployee?._id;
        leaveRequest.approvedAt = new Date();
        leaveRequest.remarks = remarks || "";

        await leaveRequest.save();

        // Deduct leave balance if paid leave
        if (leaveType.isPaid) {
          const leaveBalance = employee.leaveTypes.find(
            (lt: any) => lt.leaveType.toString() === leaveRequest.leaveType._id.toString()
          );
          if (leaveBalance) {
            leaveBalance.balance -= leaveRequest.totalDays;
            await employee.save();
          }
        }

        break;

      case "reject":
        if (leaveRequest.status !== "pending") {
          return NextResponse.json(
            { error: "Only pending requests can be rejected" },
            { status: 400 }
          );
        }

        leaveRequest.status = "rejected";
        leaveRequest.approvedBy = session.user.role === "employee"
          ? (await Employee.findOne({ user: session.user.id }))?._id
          : leaveRequest.approver;
        leaveRequest.approvedAt = new Date();
        leaveRequest.remarks = remarks || "";

        await leaveRequest.save();
        break;

      case "cancel":
        if (leaveRequest.status === "cancelled") {
          return NextResponse.json(
            { error: "Leave request is already cancelled" },
            { status: 400 }
          );
        }

        // Employee can only cancel pending requests
        if (session.user.role === "employee" && leaveRequest.status !== "pending") {
          return NextResponse.json(
            { error: "You can only cancel pending leave requests." },
            { status: 403 }
          );
        }

        // If approved leave is being cancelled, restore balance
        if (leaveRequest.status === "approved" && leaveType.isPaid) {
          const leaveBalance = employee.leaveTypes.find(
            (lt: any) => lt.leaveType.toString() === leaveRequest.leaveType._id.toString()
          );
          if (leaveBalance) {
            leaveBalance.balance += leaveRequest.totalDays;
            await employee.save();
          }
        }

        leaveRequest.status = "cancelled";
        leaveRequest.remarks = remarks || "";
        await leaveRequest.save();
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await leaveRequest.populate([
      { path: "employee", select: "name memberNo designation" },
      { path: "leaveType", select: "name code color" },
      { path: "approver", select: "name memberNo" },
      { path: "approvedBy", select: "name memberNo" },
    ]);

    return NextResponse.json(
      { message: `Leave request ${action}ed successfully`, leaveRequest },
      { status: 200 }
    );
  } catch (error) {
    // console.error("Error updating leave request:", error);
    return NextResponse.json(
      { error: "Failed to update leave request" },
      { status: 500 }
    );
  }
}
