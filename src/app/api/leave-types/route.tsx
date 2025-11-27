import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../auth/[...nextauth]/options";
import dbConnect from "@/app/lib/db";
import LeaveType from "@/app/models/LeaveType";
import Company from "@/app/models/Company";
import Employee from "@/app/models/Employee";
import {
  getPaginationParams,
  createPaginatedResponse,
  getTotalCount,
} from "@/app/lib/pagination";

// GET /api/leave-types?companyId=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const includeInactive = searchParams.get("includeInactive") === "true";

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

    // Check access (admin, employer, or employee of this company)
    if (session.user.role !== "admin") {
      if (session.user.role === "employer") {
        if (company.user.toString() !== session.user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else if (session.user.role === "employee") {
        // Verify employee belongs to this company
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
    const query: any = { company: companyId };
    if (!includeInactive) {
      query.isActive = true;
    }

    // Get pagination params
    const { page, limit, skip } = getPaginationParams(req);

    const leaveTypes = await LeaveType.find(query)
      .sort({ code: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await getTotalCount(LeaveType, query);

    const response = createPaginatedResponse(leaveTypes, page, limit, total);
    return NextResponse.json({ ...response, leaveTypes: response.data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch leave types" },
      { status: 500 }
    );
  }
}

// POST /api/leave-types - Create new leave type
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only employer or admin can create leave types
    if (session.user.role === "employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const body = await req.json();
    const {
      name,
      code,
      companyId,
      accrualPeriod,
      maxDaysPerPeriod,
      customPeriodDays,
      accrualMethod,
      resetDay,
      maxConsecutiveDays,
      carryForward,
      maxCarryForwardDays,
      requiresApproval,
      requiresDocument,
      isPaid,
      applicableFor,
      gender,
      color,
      description,
    } = body;

    // Validate required fields
    if (!name || !code || !companyId) {
      return NextResponse.json(
        { error: "name, code, and companyId are required" },
        { status: 400 }
      );
    }

    // Verify company exists and user has access
    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (
      session.user.role !== "admin" &&
      company.user.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check for duplicate code in this company
    const existingLeaveType = await LeaveType.findOne({
      company: companyId,
      code: code.toUpperCase(),
    });

    if (existingLeaveType) {
      return NextResponse.json(
        { error: "Leave type with this code already exists" },
        { status: 400 }
      );
    }

    // Validate accrual period and method
    const validAccrualPeriods = ["yearly", "monthly", "weekly", "quarterly", "half-yearly", "custom"];
    const validAccrualMethods = ["upfront", "monthly-accrual", "pro-rata"];

    if (accrualPeriod && !validAccrualPeriods.includes(accrualPeriod)) {
      return NextResponse.json(
        { error: `Invalid accrualPeriod. Must be one of: ${validAccrualPeriods.join(", ")}` },
        { status: 400 }
      );
    }

    if (accrualMethod && !validAccrualMethods.includes(accrualMethod)) {
      return NextResponse.json(
        { error: `Invalid accrualMethod. Must be one of: ${validAccrualMethods.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate custom period days
    if (accrualPeriod === "custom" && (!customPeriodDays || customPeriodDays <= 0)) {
      return NextResponse.json(
        { error: "customPeriodDays is required and must be > 0 for custom accrual period" },
        { status: 400 }
      );
    }

    // Create leave type
    const finalMaxDaysPerPeriod = maxDaysPerPeriod || 14;

    const leaveType = new LeaveType({
      name: name.trim(),
      code: code.toUpperCase(),
      company: companyId,
      // New flexible period fields
      accrualPeriod: accrualPeriod || "yearly",
      maxDaysPerPeriod: finalMaxDaysPerPeriod,
      customPeriodDays: customPeriodDays || undefined,
      accrualMethod: accrualMethod || "upfront",
      resetDay: resetDay || undefined,
      maxConsecutiveDays: maxConsecutiveDays || finalMaxDaysPerPeriod,
      carryForward: carryForward || false,
      maxCarryForwardDays: maxCarryForwardDays || 0,
      requiresApproval: requiresApproval !== undefined ? requiresApproval : true,
      requiresDocument: requiresDocument || false,
      isPaid: isPaid !== undefined ? isPaid : true,
      applicableFor: applicableFor || ["permanent", "contract", "intern", "temporary"],
      gender: gender || "all",
      color: color || "#4CAF50",
      description: description || "",
      isActive: true,
    });

    await leaveType.save();

    // Add this leave type to all active employees in the company (if paid)
    if (leaveType.isPaid) {
      const now = new Date();

      await Employee.updateMany(
        {
          company: companyId,
          active: true,
          "overrides.leaveTypes": false, // Only update employees without custom leave config
        },
        {
          $push: {
            leaveTypes: {
              leaveType: leaveType._id,
              maxDaysPerPeriod: finalMaxDaysPerPeriod,
              balance: finalMaxDaysPerPeriod,
              carryForward: leaveType.carryForward,
              currentPeriodStart: now,
              lastAccrualDate: now,
              carriedForwardBalance: 0,
            },
          },
        }
      );
    }

    return NextResponse.json(
      { message: "Leave type created successfully", leaveType },
      { status: 201 }
    );
  } catch (error) {
    // console.error("Error creating leave type:", error);
    return NextResponse.json(
      { error: "Failed to create leave type" },
      { status: 500 }
    );
  }
}

// PUT /api/leave-types - Update leave type
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const body = await req.json();
    const {
      leaveTypeId,
      name,
      accrualPeriod,
      maxDaysPerPeriod,
      customPeriodDays,
      accrualMethod,
      resetDay,
      maxConsecutiveDays,
      carryForward,
      maxCarryForwardDays,
      requiresApproval,
      requiresDocument,
      isPaid,
      applicableFor,
      gender,
      color,
      description,
      isActive,
    } = body;

    if (!leaveTypeId) {
      return NextResponse.json(
        { error: "leaveTypeId is required" },
        { status: 400 }
      );
    }

    // Find leave type
    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType) {
      return NextResponse.json(
        { error: "Leave type not found" },
        { status: 404 }
      );
    }

    // Verify access
    const company = await Company.findById(leaveType.company);
    if (
      session.user.role !== "admin" &&
      company.user.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate accrual period and method if provided
    const validAccrualPeriods = ["yearly", "monthly", "weekly", "quarterly", "half-yearly", "custom"];
    const validAccrualMethods = ["upfront", "monthly-accrual", "pro-rata"];

    if (accrualPeriod && !validAccrualPeriods.includes(accrualPeriod)) {
      return NextResponse.json(
        { error: `Invalid accrualPeriod. Must be one of: ${validAccrualPeriods.join(", ")}` },
        { status: 400 }
      );
    }

    if (accrualMethod && !validAccrualMethods.includes(accrualMethod)) {
      return NextResponse.json(
        { error: `Invalid accrualMethod. Must be one of: ${validAccrualMethods.join(", ")}` },
        { status: 400 }
      );
    }

    // Update fields
    if (name) leaveType.name = name.trim();
    if (accrualPeriod !== undefined) leaveType.accrualPeriod = accrualPeriod;
    if (maxDaysPerPeriod !== undefined) leaveType.maxDaysPerPeriod = maxDaysPerPeriod;
    if (customPeriodDays !== undefined) leaveType.customPeriodDays = customPeriodDays;
    if (accrualMethod !== undefined) leaveType.accrualMethod = accrualMethod;
    if (resetDay !== undefined) leaveType.resetDay = resetDay;
    if (maxConsecutiveDays !== undefined) leaveType.maxConsecutiveDays = maxConsecutiveDays;
    if (carryForward !== undefined) leaveType.carryForward = carryForward;
    if (maxCarryForwardDays !== undefined) leaveType.maxCarryForwardDays = maxCarryForwardDays;
    if (requiresApproval !== undefined) leaveType.requiresApproval = requiresApproval;
    if (requiresDocument !== undefined) leaveType.requiresDocument = requiresDocument;
    if (isPaid !== undefined) leaveType.isPaid = isPaid;
    if (applicableFor) leaveType.applicableFor = applicableFor;
    if (gender) leaveType.gender = gender;
    if (color) leaveType.color = color;
    if (description !== undefined) leaveType.description = description;
    if (isActive !== undefined) leaveType.isActive = isActive;

    // Validate custom period
    if (leaveType.accrualPeriod === "custom" && (!leaveType.customPeriodDays || leaveType.customPeriodDays <= 0)) {
      return NextResponse.json(
        { error: "customPeriodDays is required and must be > 0 for custom accrual period" },
        { status: 400 }
      );
    }

    await leaveType.save();

    return NextResponse.json(
      { message: "Leave type updated successfully", leaveType },
      { status: 200 }
    );
  } catch (error) {
    // console.error("Error updating leave type:", error);
    return NextResponse.json(
      { error: "Failed to update leave type" },
      { status: 500 }
    );
  }
}

// DELETE /api/leave-types - Delete leave type
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const leaveTypeId = searchParams.get("leaveTypeId");

    if (!leaveTypeId) {
      return NextResponse.json(
        { error: "leaveTypeId is required" },
        { status: 400 }
      );
    }

    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType) {
      return NextResponse.json(
        { error: "Leave type not found" },
        { status: 404 }
      );
    }

    // Verify access
    const company = await Company.findById(leaveType.company);
    if (
      session.user.role !== "admin" &&
      company.user.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Instead of deleting, deactivate it
    leaveType.isActive = false;
    await leaveType.save();

    // Remove from employees' leave balance (optional - you might want to keep historical data)
    // await Employee.updateMany(
    //   { company: leaveType.company },
    //   { $pull: { leaveTypes: { leaveType: leaveTypeId } } }
    // );

    return NextResponse.json(
      { message: "Leave type deactivated successfully" },
      { status: 200 }
    );
  } catch (error) {
    // console.error("Error deleting leave type:", error);
    return NextResponse.json(
      { error: "Failed to delete leave type" },
      { status: 500 }
    );
  }
}
