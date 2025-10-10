import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";
import dbConnect from "@/app/lib/db";
import Employee from "@/app/models/Employee";
import Company from "@/app/models/Company";
import Department from "@/app/models/Department";
import {
  getSubordinates,
  getEntireTeam,
  validateManagerAssignment,
  getAvailableManagers,
} from "@/app/lib/employeeHierarchy";

// POST /api/employees/hierarchy - Assign manager or department
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only employer or admin can modify hierarchy
    if (session.user.role === "employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const body = await req.json();
    const { action, employeeId, managerId, departmentId } = body;

    if (!action || !employeeId) {
      return NextResponse.json(
        { error: "action and employeeId are required" },
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

    // Verify access to company
    const company = await Company.findById(employee.company);
    if (
      session.user.role !== "admin" &&
      company.user.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    switch (action) {
      case "assign-manager":
        if (!managerId) {
          return NextResponse.json(
            { error: "managerId is required" },
            { status: 400 }
          );
        }

        // Validate manager exists and is in same company
        const manager = await Employee.findOne({
          _id: managerId,
          company: employee.company,
          active: true,
        });

        if (!manager) {
          return NextResponse.json(
            { error: "Manager not found in same company" },
            { status: 400 }
          );
        }

        // Validate assignment (prevent circular references)
        const validation = await validateManagerAssignment(
          employeeId,
          managerId
        );
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }

        employee.manager = managerId;
        await employee.save();

        await employee.populate("manager", "name memberNo designation");

        return NextResponse.json(
          { message: "Manager assigned successfully", employee },
          { status: 200 }
        );

      case "remove-manager":
        employee.manager = null;
        await employee.save();

        return NextResponse.json(
          { message: "Manager removed successfully", employee },
          { status: 200 }
        );

      case "assign-department":
        if (!departmentId) {
          return NextResponse.json(
            { error: "departmentId is required" },
            { status: 400 }
          );
        }

        // Validate department exists and is in same company
        const department = await Department.findOne({
          _id: departmentId,
          company: employee.company,
          isActive: true,
        });

        if (!department) {
          return NextResponse.json(
            { error: "Department not found in same company" },
            { status: 400 }
          );
        }

        employee.department = departmentId;
        await employee.save();

        await employee.populate("department", "name");

        return NextResponse.json(
          { message: "Department assigned successfully", employee },
          { status: 200 }
        );

      case "remove-department":
        employee.department = null;
        await employee.save();

        return NextResponse.json(
          { message: "Department removed successfully", employee },
          { status: 200 }
        );

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error updating employee hierarchy:", error);
    return NextResponse.json(
      { error: "Failed to update hierarchy" },
      { status: 500 }
    );
  }
}

// GET /api/employees/hierarchy?action=xxx&employeeId=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const employeeId = searchParams.get("employeeId");
    const companyId = searchParams.get("companyId");

    if (!action) {
      return NextResponse.json(
        { error: "action is required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "subordinates":
        if (!employeeId) {
          return NextResponse.json(
            { error: "employeeId is required" },
            { status: 400 }
          );
        }

        const subordinates = await getSubordinates(employeeId);
        return NextResponse.json({ subordinates }, { status: 200 });

      case "team":
        if (!employeeId) {
          return NextResponse.json(
            { error: "employeeId is required" },
            { status: 400 }
          );
        }

        const team = await getEntireTeam(employeeId);
        return NextResponse.json({ team, count: team.length }, { status: 200 });

      case "available-managers":
        if (!companyId) {
          return NextResponse.json(
            { error: "companyId is required" },
            { status: 400 }
          );
        }

        const managers = await getAvailableManagers(companyId, employeeId || undefined);
        return NextResponse.json({ managers }, { status: 200 });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error fetching hierarchy data:", error);
    return NextResponse.json(
      { error: "Failed to fetch hierarchy data" },
      { status: 500 }
    );
  }
}
