import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../auth/[...nextauth]/options";
import dbConnect from "@/app/lib/db";
import Department from "@/app/models/Department";
import Employee from "@/app/models/Employee";
import Company from "@/app/models/Company";
import {
  getPaginationParams,
  createPaginatedResponse,
  getTotalCount,
} from "@/app/lib/pagination";

// GET /api/departments?companyId=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this company
    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check if user owns this company (or is admin)
    if (
      session.user.role !== "admin" &&
      company.user.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get pagination params
    const { page, limit, skip } = getPaginationParams(req);

    const filter = { company: companyId };

    // Get all departments for this company with populated manager info
    const departments = await Department.find(filter)
      .populate("manager", "name memberNo designation")
      .populate("parentDepartment", "name")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await getTotalCount(Department, filter);

    const response = createPaginatedResponse(departments, page, limit, total);
    return NextResponse.json({ ...response, departments: response.data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

// POST /api/departments - Create new department
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only employer or admin can create departments
    if (session.user.role === "employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const body = await req.json();
    const { name, companyId, managerId, parentDepartmentId, description, costCenter } = body;

    if (!name || !companyId) {
      return NextResponse.json(
        { error: "name and companyId are required" },
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

    // Check for duplicate department name in this company
    const existingDept = await Department.findOne({
      company: companyId,
      name: name.trim(),
    });

    if (existingDept) {
      return NextResponse.json(
        { error: "Department with this name already exists" },
        { status: 400 }
      );
    }

    // Validate manager if provided
    if (managerId) {
      const manager = await Employee.findOne({
        _id: managerId,
        company: companyId,
      });
      if (!manager) {
        return NextResponse.json(
          { error: "Manager not found in this company" },
          { status: 400 }
        );
      }
    }

    // Validate parent department if provided
    if (parentDepartmentId) {
      const parentDept = await Department.findOne({
        _id: parentDepartmentId,
        company: companyId,
      });
      if (!parentDept) {
        return NextResponse.json(
          { error: "Parent department not found" },
          { status: 400 }
        );
      }
    }

    // Create department
    const department = new Department({
      name: name.trim(),
      company: companyId,
      manager: managerId || null,
      parentDepartment: parentDepartmentId || null,
      description: description || "",
      costCenter: costCenter || "",
      isActive: true,
    });

    await department.save();

    // Populate manager info before returning
    await department.populate("manager", "name memberNo designation");
    await department.populate("parentDepartment", "name");

    return NextResponse.json(
      { message: "Department created successfully", department },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 }
    );
  }
}

// PUT /api/departments - Update department
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
    const { departmentId, name, managerId, parentDepartmentId, description, costCenter, isActive } = body;

    if (!departmentId) {
      return NextResponse.json(
        { error: "departmentId is required" },
        { status: 400 }
      );
    }

    // Find department
    const department = await Department.findById(departmentId);
    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Verify access
    const company = await Company.findById(department.company);
    if (
      session.user.role !== "admin" &&
      company.user.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== department.name) {
      const existingDept = await Department.findOne({
        company: department.company,
        name: name.trim(),
        _id: { $ne: departmentId },
      });

      if (existingDept) {
        return NextResponse.json(
          { error: "Department with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Validate manager if provided
    if (managerId) {
      const manager = await Employee.findOne({
        _id: managerId,
        company: department.company,
      });
      if (!manager) {
        return NextResponse.json(
          { error: "Manager not found in this company" },
          { status: 400 }
        );
      }
    }

    // Validate parent department if provided (prevent circular reference)
    if (parentDepartmentId) {
      if (parentDepartmentId === departmentId) {
        return NextResponse.json(
          { error: "Department cannot be its own parent" },
          { status: 400 }
        );
      }

      const parentDept = await Department.findOne({
        _id: parentDepartmentId,
        company: department.company,
      });
      if (!parentDept) {
        return NextResponse.json(
          { error: "Parent department not found" },
          { status: 400 }
        );
      }

      // Check for circular reference (parent's parent chain)
      let currentParent = parentDept;
      while (currentParent.parentDepartment) {
        if (currentParent.parentDepartment.toString() === departmentId) {
          return NextResponse.json(
            { error: "Circular department hierarchy detected" },
            { status: 400 }
          );
        }
        currentParent = await Department.findById(currentParent.parentDepartment);
        if (!currentParent) break;
      }
    }

    // Update fields
    if (name) department.name = name.trim();
    if (managerId !== undefined) department.manager = managerId || null;
    if (parentDepartmentId !== undefined) department.parentDepartment = parentDepartmentId || null;
    if (description !== undefined) department.description = description;
    if (costCenter !== undefined) department.costCenter = costCenter;
    if (isActive !== undefined) department.isActive = isActive;

    await department.save();

    // Populate before returning
    await department.populate("manager", "name memberNo designation");
    await department.populate("parentDepartment", "name");

    return NextResponse.json(
      { message: "Department updated successfully", department },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update department" },
      { status: 500 }
    );
  }
}

// DELETE /api/departments - Delete/deactivate department
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
    const departmentId = searchParams.get("departmentId");

    if (!departmentId) {
      return NextResponse.json(
        { error: "departmentId is required" },
        { status: 400 }
      );
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Verify access
    const company = await Company.findById(department.company);
    if (
      session.user.role !== "admin" &&
      company.user.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if department has employees
    const employeeCount = await Employee.countDocuments({
      department: departmentId,
    });

    if (employeeCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete department with ${employeeCount} employee(s). Please reassign employees first.`,
        },
        { status: 400 }
      );
    }

    // Check if department has sub-departments
    const subDeptCount = await Department.countDocuments({
      parentDepartment: departmentId,
    });

    if (subDeptCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete department with ${subDeptCount} sub-department(s). Please remove sub-departments first.`,
        },
        { status: 400 }
      );
    }

    // Safe to delete
    await Department.findByIdAndDelete(departmentId);

    return NextResponse.json(
      { message: "Department deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete department" },
      { status: 500 }
    );
  }
}
