import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";
import dbConnect from "@/app/lib/db";
import Department from "@/app/models/Department";
import Employee from "@/app/models/Employee";
import Company from "@/app/models/Company";

// GET /api/departments/[id] - Get department details with employees
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const departmentId = params.id;

    // Get department with populated fields
    const department = await Department.findById(departmentId)
      .populate("manager", "name memberNo designation email phoneNumber")
      .populate("parentDepartment", "name");

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
      session.user.role !== "employee" &&
      company.user.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all employees in this department
    const employees = await Employee.find({
      department: departmentId,
      active: true,
    })
      .select("name memberNo designation email phoneNumber manager")
      .populate("manager", "name memberNo")
      .sort({ memberNo: 1 });

    // Get sub-departments
    const subDepartments = await Department.find({
      parentDepartment: departmentId,
      isActive: true,
    })
      .populate("manager", "name memberNo")
      .sort({ name: 1 });

    // Count total employees (including sub-departments)
    const allDeptIds = await getAllSubDepartmentIds(departmentId);
    const totalEmployees = await Employee.countDocuments({
      department: { $in: [...allDeptIds, departmentId] },
      active: true,
    });

    return NextResponse.json(
      {
        department,
        employees,
        subDepartments,
        totalEmployees,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching department:", error);
    return NextResponse.json(
      { error: "Failed to fetch department" },
      { status: 500 }
    );
  }
}

// Helper function to get all sub-department IDs recursively
async function getAllSubDepartmentIds(departmentId: string): Promise<string[]> {
  const subDepts = await Department.find({
    parentDepartment: departmentId,
  }).select("_id");

  const subDeptIds = subDepts.map((d) => d._id.toString());

  // Recursively get sub-departments of sub-departments
  const nestedIds = await Promise.all(
    subDeptIds.map((id) => getAllSubDepartmentIds(id))
  );

  return [...subDeptIds, ...nestedIds.flat()];
}
