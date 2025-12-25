import { NextResponse } from "next/server";
import Department from "@/app/models/Department";
import Employee from "@/app/models/Employee";
import Company from "@/app/models/Company";
import dbConnect from "@/app/lib/db";
import {
    departmentCreateSchema,
    departmentUpdateSchema,
} from "@/app/lib/schemas";
import {
    getPaginationParams,
    createPaginatedResponse,
    getTotalCount,
} from "@/app/lib/pagination";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";

export class DepartmentService {
    static async getDepartments(req: Request, context: any) {
        try {
            const { user } = context;
            if (!user) {
                return ApiResponseUtils.sendUnauthorized();
            }

            await dbConnect();

            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get("companyId");

            if (!companyId) {
                return ApiResponseUtils.sendBadRequest("companyId is required");
            }

            // Verify user has access to this company
            const company = await Company.findById(companyId);
            if (!company) {
                return ApiResponseUtils.sendNotFound("Company not found");
            }

            // Check if user owns this company (or is admin)
            if (user.role !== "admin" && company.user.toString() !== user.id) {
                return ApiResponseUtils.sendForbidden();
            }

            // Get pagination params
            const { page, limit, skip } = getPaginationParams(req as any);

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
            return NextResponse.json(
                ApiResponseUtils.paginated(
                    departments,
                    page,
                    limit,
                    total,
                    "Departments retrieved successfully"
                ),
                { status: 200 }
            );
        } catch (error) {
            console.error("Error fetching departments:", error);
            return ApiResponseUtils.sendInternalError("Failed to fetch departments");
        }
    }

    static async createDepartment(req: Request, context: any) {
        try {
            const { user } = context;
            if (!user) {
                return ApiResponseUtils.sendUnauthorized();
            }

            // Only employer or admin can create departments
            if (user.role === "employee") {
                return ApiResponseUtils.sendForbidden();
            }

            await dbConnect();

            const body = await req.json();

            // Validate body against schema
            const validation = departmentCreateSchema.safeParse(body);
            if (!validation.success) {
                return ApiResponseUtils.sendBadRequest("Validation Error", validation.error);
            }

            const { name, company: companyId, manager, parentDepartment, description, costCenter, isActive } = validation.data;

            // Verify company exists and user has access
            const company = await Company.findById(companyId);
            if (!company) {
                return ApiResponseUtils.sendNotFound("Company not found");
            }

            if (user.role !== "admin" && company.user.toString() !== user.id) {
                return ApiResponseUtils.sendForbidden();
            }

            // Check for duplicate department name in this company
            const existingDept = await Department.findOne({
                company: companyId,
                name: name.trim(),
            });

            if (existingDept) {
                return ApiResponseUtils.sendBadRequest("Department with this name already exists");
            }

            // Validate manager if provided
            if (manager) {
                const managerExists = await Employee.findOne({
                    _id: manager,
                    company: companyId,
                });
                if (!managerExists) {
                    return ApiResponseUtils.sendBadRequest("Manager not found in this company");
                }
            }

            // Validate parent department if provided
            if (parentDepartment) {
                const parentDept = await Department.findOne({
                    _id: parentDepartment,
                    company: companyId,
                });
                if (!parentDept) {
                    return ApiResponseUtils.sendBadRequest("Parent department not found");
                }
            }

            // Create department
            const department = new Department({
                name: name.trim(),
                company: companyId,
                manager: manager || null,
                parentDepartment: parentDepartment || null,
                description: description || "",
                costCenter: costCenter || "",
                isActive: isActive !== undefined ? isActive : true,
            });

            await department.save();

            // Populate manager info before returning
            await department.populate("manager", "name memberNo designation");
            await department.populate("parentDepartment", "name");

            return ApiResponseUtils.sendSuccess(
                { department },
                "Department created successfully",
                undefined,
                201
            );
        } catch (error) {
            console.error("Error creating department:", error);
            return ApiResponseUtils.sendInternalError("Failed to create department");
        }
    }

    static async updateDepartment(req: Request, context: any) {
        try {
            const { user } = context;
            if (!user) {
                return ApiResponseUtils.sendUnauthorized();
            }

            if (user.role === "employee") {
                return ApiResponseUtils.sendForbidden();
            }

            await dbConnect();

            const body = await req.json();

            // Validate body against schema
            const validation = departmentUpdateSchema.safeParse(body);
            if (!validation.success) {
                return ApiResponseUtils.sendBadRequest("Validation Error", validation.error);
            }

            const { id: departmentId, name, manager, parentDepartment, description, costCenter, isActive } = validation.data;

            // Find department
            const department = await Department.findById(departmentId);
            if (!department) {
                return ApiResponseUtils.sendNotFound("Department not found");
            }

            // Verify access
            const company = await Company.findById(department.company);
            if (!company) {
                return ApiResponseUtils.sendNotFound("Company not found");
            }
            if (user.role !== "admin" && company.user.toString() !== user.id) {
                return ApiResponseUtils.sendForbidden();
            }

            // Check for duplicate name if name is being changed
            if (name && name.trim() !== department.name) {
                const existingDept = await Department.findOne({
                    company: department.company,
                    name: name.trim(),
                    _id: { $ne: departmentId },
                });

                if (existingDept) {
                    return ApiResponseUtils.sendBadRequest("Department with this name already exists");
                }
            }

            // Validate manager if provided
            if (manager) {
                const managerExists = await Employee.findOne({
                    _id: manager,
                    company: department.company,
                });
                if (!managerExists) {
                    return ApiResponseUtils.sendBadRequest("Manager not found in this company");
                }
            }

            // Validate parent department if provided (prevent circular reference)
            if (parentDepartment) {
                if (parentDepartment === departmentId) {
                    return ApiResponseUtils.sendBadRequest("Department cannot be its own parent");
                }

                const parentDept = await Department.findOne({
                    _id: parentDepartment,
                    company: department.company,
                });
                if (!parentDept) {
                    return ApiResponseUtils.sendBadRequest("Parent department not found");
                }

                // Check for circular reference (parent's parent chain)
                let currentParent = parentDept;
                while (currentParent.parentDepartment) {
                    if (currentParent.parentDepartment.toString() === departmentId) {
                        return ApiResponseUtils.sendBadRequest("Circular department hierarchy detected");
                    }
                    currentParent = await Department.findById(currentParent.parentDepartment);
                    if (!currentParent) break;
                }
            }

            // Update fields
            if (name) department.name = name.trim();
            if (manager !== undefined) department.manager = manager || null;
            if (parentDepartment !== undefined) department.parentDepartment = parentDepartment || null;
            if (description !== undefined) department.description = description;
            if (costCenter !== undefined) department.costCenter = costCenter;
            if (isActive !== undefined) department.isActive = isActive;

            await department.save();

            // Populate before returning
            await department.populate("manager", "name memberNo designation");
            await department.populate("parentDepartment", "name");

            return ApiResponseUtils.sendSuccess(
                { department },
                "Department updated successfully"
            );
        } catch (error) {
            console.error("Error updating department:", error);
            return ApiResponseUtils.sendInternalError("Failed to update department");
        }
    }

    static async deleteDepartment(req: Request, context: any) {
        try {
            const { user } = context;
            if (!user) {
                return ApiResponseUtils.sendUnauthorized();
            }

            if (user.role === "employee") {
                return ApiResponseUtils.sendForbidden();
            }

            await dbConnect();

            const { searchParams } = new URL(req.url);
            let departmentId = searchParams.get("id") || searchParams.get("departmentId");

            if (!departmentId) {
                try {
                    const body = await req.json();
                    departmentId = body.id || body.departmentId;
                } catch (e) {
                    // Body might be empty, which is fine if we found it in params
                }
            }

            if (!departmentId) {
                return ApiResponseUtils.sendBadRequest("departmentId is required");
            }

            const department = await Department.findById(departmentId);
            if (!department) {
                return ApiResponseUtils.sendNotFound("Department not found");
            }

            // Verify access
            const company = await Company.findById(department.company);
            if (!company) {
                return ApiResponseUtils.sendNotFound("Company not found");
            }
            if (user.role !== "admin" && company.user.toString() !== user.id) {
                return ApiResponseUtils.sendForbidden();
            }

            // Check if department has employees
            const employeeCount = await Employee.countDocuments({
                department: departmentId,
            });

            if (employeeCount > 0) {
                return ApiResponseUtils.sendBadRequest(
                    `Cannot delete department with ${employeeCount} employee(s). Please reassign employees first.`
                );
            }

            // Check if department has sub-departments
            const subDeptCount = await Department.countDocuments({
                parentDepartment: departmentId,
            });

            if (subDeptCount > 0) {
                return ApiResponseUtils.sendBadRequest(
                    `Cannot delete department with ${subDeptCount} sub-department(s). Please remove sub-departments first.`
                );
            }

            // Safe to delete
            await Department.findByIdAndDelete(departmentId);

            return ApiResponseUtils.sendSuccess(
                null,
                "Department deleted successfully"
            );
        } catch (error) {
            console.error("Error deleting department:", error);
            return ApiResponseUtils.sendInternalError("Failed to delete department");
        }
    }

    static async getHierarchy(req: Request, context: any) {
        try {
            const { user } = context;
            if (!user) {
                return ApiResponseUtils.sendUnauthorized();
            }

            await dbConnect();

            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get("companyId");

            if (!companyId) {
                return ApiResponseUtils.sendBadRequest("companyId is required");
            }

            // Verify access
            const company = await Company.findById(companyId);
            if (!company) {
                return ApiResponseUtils.sendNotFound("Company not found");
            }

            if (
                user.role !== "admin" &&
                user.role !== "employee" &&
                company.user.toString() !== user.id
            ) {
                return ApiResponseUtils.sendForbidden();
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
            const hierarchy = DepartmentService.buildDepartmentHierarchy(departments, employees);

            return ApiResponseUtils.sendSuccess({ hierarchy }, "Hierarchy retrieved successfully");
        } catch (error) {
            console.error("Error fetching hierarchy:", error);
            return ApiResponseUtils.sendInternalError("Failed to fetch hierarchy");
        }
    }

    // Helper function to build hierarchical tree structure
    private static buildDepartmentHierarchy(departments: any[], employees: any[]) {
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

    static async getDepartmentById(req: Request, context: any) {
        try {
            const { user } = context;
            if (!user) {
                return ApiResponseUtils.sendUnauthorized();
            }

            await dbConnect();

            const { params } = context;
            const departmentId = params.id;

            if (!departmentId) {
                return ApiResponseUtils.sendBadRequest("departmentId is required");
            }

            // Get department with populated fields
            const department = await Department.findById(departmentId)
                .populate("manager", "name memberNo designation email phoneNumber")
                .populate("parentDepartment", "name");

            if (!department) {
                return ApiResponseUtils.sendNotFound("Department not found");
            }

            // Verify access
            const company = await Company.findById(department.company);
            if (!company) {
                return ApiResponseUtils.sendNotFound("Company not found");
            }
            if (
                user.role !== "admin" &&
                user.role !== "employee" &&
                company.user.toString() !== user.id
            ) {
                return ApiResponseUtils.sendForbidden();
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
            const allDeptIds = await DepartmentService.getAllSubDepartmentIds(departmentId);
            const totalEmployees = await Employee.countDocuments({
                department: { $in: [...allDeptIds, departmentId] },
                active: true,
            });

            return ApiResponseUtils.sendSuccess(
                {
                    department,
                    employees,
                    subDepartments,
                    totalEmployees,
                },
                "Department retrieved successfully"
            );
        } catch (error) {
            console.error("Error fetching department:", error);
            return ApiResponseUtils.sendInternalError("Failed to fetch department");
        }
    }

    // Helper function to get all sub-department IDs recursively
    private static async getAllSubDepartmentIds(departmentId: string): Promise<string[]> {
        const subDepts = await Department.find({
            parentDepartment: departmentId,
        }).select("_id");

        const subDeptIds = subDepts.map((d) => d._id.toString());

        // Recursively get sub-departments of sub-departments
        const nestedIds = await Promise.all(
            subDeptIds.map((id) => DepartmentService.getAllSubDepartmentIds(id))
        );

        return [...subDeptIds, ...nestedIds.flat()];
    }
}
