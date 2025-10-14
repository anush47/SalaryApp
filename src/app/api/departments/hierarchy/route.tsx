import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";
import dbConnect from "@/app/lib/db";
import Department from "@/app/models/Department";
import Employee from "@/app/models/Employee";
import Company from "@/app/models/Company";

export const dynamic = 'force-dynamic';

// GET /api/departments/hierarchy?companyId=xxx
// Returns hierarchical org chart data
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

    // Verify access
    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (
      session.user.role !== "admin" &&
      session.user.role !== "employee" &&
      company.user.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all departments for this company
    const departments = await Department.find({
      company: companyId,
      isActive: true,
    })
      .populate("manager", "name memberNo designation")
      .lean();

    // Get all employees for this company
    const employees = await Employee.find({
      company: companyId,
      active: true,
    })
      .select("name memberNo designation department manager")
      .lean();

    // Build hierarchy tree
    const hierarchy = buildDepartmentHierarchy(departments, employees);

    return NextResponse.json({ hierarchy }, { status: 200 });
  } catch (error) {
    console.error("Error fetching hierarchy:", error);
    return NextResponse.json(
      { error: "Failed to fetch hierarchy" },
      { status: 500 }
    );
  }
}

// Helper function to build hierarchical tree structure
function buildDepartmentHierarchy(departments: any[], employees: any[]) {
  // Create a map of departments by ID for quick lookup
  const deptMap = new Map();
  departments.forEach((dept) => {
    deptMap.set(dept._id.toString(), {
      ...dept,
      children: [],
      employees: [],
      employeeCount: 0,
    });
  });

  // Assign employees to their departments
  employees.forEach((emp) => {
    if (emp.department) {
      const deptId = emp.department.toString();
      const dept = deptMap.get(deptId);
      if (dept) {
        dept.employees.push({
          _id: emp._id,
          name: emp.name,
          memberNo: emp.memberNo,
          designation: emp.designation,
          manager: emp.manager,
        });
        dept.employeeCount++;
      }
    }
  });

  // Build tree structure
  const rootDepartments: any[] = [];

  departments.forEach((dept) => {
    const deptNode = deptMap.get(dept._id.toString());

    if (!dept.parentDepartment) {
      // This is a root department
      rootDepartments.push(deptNode);
    } else {
      // This is a child department
      const parentId = dept.parentDepartment.toString();
      const parentDept = deptMap.get(parentId);
      if (parentDept) {
        parentDept.children.push(deptNode);
      } else {
        // Parent not found or inactive, treat as root
        rootDepartments.push(deptNode);
      }
    }
  });

  // Calculate total employee counts (including sub-departments)
  function calculateTotalEmployees(dept: any): number {
    let total = dept.employeeCount;
    dept.children.forEach((child: any) => {
      total += calculateTotalEmployees(child);
    });
    dept.totalEmployeeCount = total;
    return total;
  }

  rootDepartments.forEach(calculateTotalEmployees);

  return rootDepartments;
}
