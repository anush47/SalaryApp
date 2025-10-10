import Employee from "@/app/models/Employee";
import Department from "@/app/models/Department";

/**
 * Get all subordinates (direct reports) for a manager
 */
export async function getSubordinates(managerId: string) {
  try {
    const subordinates = await Employee.find({
      manager: managerId,
      active: true,
    })
      .select("name memberNo designation department email phoneNumber")
      .populate("department", "name")
      .sort({ memberNo: 1 });

    return subordinates;
  } catch (error) {
    console.error("Error fetching subordinates:", error);
    throw error;
  }
}

/**
 * Get entire team (all subordinates recursively) for a manager
 */
export async function getEntireTeam(managerId: string): Promise<any[]> {
  try {
    const directReports = await getSubordinates(managerId);

    // Recursively get subordinates of subordinates
    const allSubordinates = await Promise.all(
      directReports.map(async (employee) => {
        const subTeam = await getEntireTeam(employee._id.toString());
        return [employee, ...subTeam];
      })
    );

    return allSubordinates.flat();
  } catch (error) {
    console.error("Error fetching entire team:", error);
    throw error;
  }
}

/**
 * Get manager chain (all managers up to the top)
 */
export async function getManagerChain(employeeId: string): Promise<any[]> {
  try {
    const employee = await Employee.findById(employeeId).populate(
      "manager",
      "name memberNo designation"
    );

    if (!employee || !employee.manager) {
      return [];
    }

    const managerChain = [employee.manager];
    const upperManagers = await getManagerChain(
      employee.manager._id.toString()
    );

    return [...managerChain, ...upperManagers];
  } catch (error) {
    console.error("Error fetching manager chain:", error);
    throw error;
  }
}

/**
 * Check if employee A is in the management chain of employee B
 * (i.e., can employee A approve leaves for employee B?)
 */
export async function isInManagementChain(
  managerId: string,
  employeeId: string
): Promise<boolean> {
  try {
    const managerChain = await getManagerChain(employeeId);
    return managerChain.some(
      (manager) => manager._id.toString() === managerId
    );
  } catch (error) {
    console.error("Error checking management chain:", error);
    return false;
  }
}

/**
 * Validate manager assignment (prevent circular references)
 */
export async function validateManagerAssignment(
  employeeId: string,
  newManagerId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Can't be your own manager
    if (employeeId === newManagerId) {
      return { valid: false, error: "Employee cannot be their own manager" };
    }

    // Check if new manager is in the employee's subordinate chain
    // (would create circular reference)
    const subordinates = await getEntireTeam(employeeId);
    const isSubordinate = subordinates.some(
      (sub) => sub._id.toString() === newManagerId
    );

    if (isSubordinate) {
      return {
        valid: false,
        error: "Cannot assign a subordinate as manager (circular reference)",
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("Error validating manager assignment:", error);
    return { valid: false, error: "Validation failed" };
  }
}

/**
 * Get department hierarchy with employee counts
 */
export async function getDepartmentWithCounts(departmentId: string) {
  try {
    const department = await Department.findById(departmentId)
      .populate("manager", "name memberNo designation")
      .populate("parentDepartment", "name");

    if (!department) {
      return null;
    }

    // Count direct employees
    const directEmployeeCount = await Employee.countDocuments({
      department: departmentId,
      active: true,
    });

    // Get sub-departments and their counts
    const subDepartments = await Department.find({
      parentDepartment: departmentId,
      isActive: true,
    });

    let totalEmployeeCount = directEmployeeCount;
    for (const subDept of subDepartments) {
      const subDeptData = await getDepartmentWithCounts(
        subDept._id.toString()
      );
      if (subDeptData) {
        totalEmployeeCount += subDeptData.totalEmployeeCount;
      }
    }

    return {
      department,
      directEmployeeCount,
      totalEmployeeCount,
      subDepartmentCount: subDepartments.length,
    };
  } catch (error) {
    console.error("Error fetching department counts:", error);
    throw error;
  }
}

/**
 * Get available managers for an employee (employees in same company, excluding subordinates)
 */
export async function getAvailableManagers(
  companyId: string,
  employeeId?: string
) {
  try {
    const query: any = {
      company: companyId,
      active: true,
    };

    // Exclude the employee themselves
    if (employeeId) {
      query._id = { $ne: employeeId };

      // Also exclude the employee's subordinates to prevent circular references
      const subordinates = await getEntireTeam(employeeId);
      const subordinateIds = subordinates.map((sub) => sub._id);
      if (subordinateIds.length > 0) {
        query._id = { $nin: [employeeId, ...subordinateIds] };
      }
    }

    const managers = await Employee.find(query)
      .select("name memberNo designation department")
      .populate("department", "name")
      .sort({ memberNo: 1 });

    return managers;
  } catch (error) {
    console.error("Error fetching available managers:", error);
    throw error;
  }
}
