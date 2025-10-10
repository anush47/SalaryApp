import Employee from "@/app/models/Employee";
import LeaveRequest from "@/app/models/LeaveRequest";
import LeaveType from "@/app/models/LeaveType";
import Company from "@/app/models/Company";

/**
 * Get leave balance summary for an employee
 * Returns all leave types with current balances and usage
 */
export async function getLeaveBalanceSummary(employeeId: string) {
  try {
    const employee = await Employee.findById(employeeId).populate("company");
    if (!employee) {
      throw new Error("Employee not found");
    }

    const company = await Company.findById(employee.company);

    // Determine which leave types to use (employee override or company default)
    let leaveTypes = [];
    if (employee.overrides?.leaveTypes) {
      // Use employee's custom leave types
      leaveTypes = employee.leaveTypes;
    } else {
      // Use company's default leave types
      const companyLeaveTypes = await LeaveType.find({
        company: employee.company,
        isActive: true,
      });

      // Map to employee leave balance format
      leaveTypes = companyLeaveTypes.map((lt: any) => ({
        leaveType: lt._id,
        maxDaysPerYear: lt.maxDaysPerYear,
        balance: lt.maxDaysPerYear, // Default to max if not yet initialized
        carryForward: lt.carryForward,
      }));
    }

    // Populate leave type details and calculate usage
    const summary = await Promise.all(
      leaveTypes.map(async (lt: any) => {
        const leaveType = await LeaveType.findById(lt.leaveType);
        if (!leaveType) return null;

        // Calculate used leaves (approved + pending)
        const usedLeaves = await LeaveRequest.aggregate([
          {
            $match: {
              employee: employee._id,
              leaveType: leaveType._id,
              status: { $in: ["approved", "pending"] },
              startDate: {
                $gte: new Date(new Date().getFullYear(), 0, 1), // Start of current year
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalDays" },
            },
          },
        ]);

        const used = usedLeaves.length > 0 ? usedLeaves[0].total : 0;

        return {
          leaveType: {
            _id: leaveType._id,
            name: leaveType.name,
            code: leaveType.code,
            color: leaveType.color,
            isPaid: leaveType.isPaid,
            requiresApproval: leaveType.requiresApproval,
            requiresDocument: leaveType.requiresDocument,
            maxConsecutiveDays: leaveType.maxConsecutiveDays,
          },
          maxDaysPerYear: lt.maxDaysPerYear,
          used,
          balance: lt.balance,
          available: lt.balance - used,
          carryForward: lt.carryForward,
        };
      })
    );

    return summary.filter((s) => s !== null);
  } catch (error) {
    console.error("Error getting leave balance summary:", error);
    throw error;
  }
}

/**
 * Validate if a leave application is possible
 */
export async function validateLeaveApplication(
  employeeId: string,
  leaveTypeId: string,
  startDate: Date,
  endDate: Date,
  halfDay: boolean = false
): Promise<{ valid: boolean; error?: string; message?: string }> {
  try {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return { valid: false, error: "Employee not found" };
    }

    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType) {
      return { valid: false, error: "Leave type not found" };
    }

    if (!leaveType.isActive) {
      return { valid: false, error: "This leave type is no longer active" };
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return { valid: false, error: "Start date must be before end date" };
    }

    // Calculate total days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    let totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (halfDay) {
      totalDays = 0.5;
    }

    // Check if leave type is applicable for this employee type
    if (!leaveType.applicableFor.includes(employee.employeeType || "permanent")) {
      return {
        valid: false,
        error: `This leave type is not applicable for ${employee.employeeType} employees`,
      };
    }

    // Check gender restrictions
    if (leaveType.gender !== "all" && employee.gender && leaveType.gender !== employee.gender) {
      return {
        valid: false,
        error: `This leave type is only applicable for ${leaveType.gender} employees`,
      };
    }

    // Check balance for paid leaves
    if (leaveType.isPaid) {
      const leaveBalance = employee.leaveTypes.find(
        (lt: any) => lt.leaveType.toString() === leaveTypeId
      );

      if (!leaveBalance) {
        return {
          valid: false,
          error: "Leave type not assigned to this employee",
        };
      }

      if (leaveBalance.balance < totalDays) {
        return {
          valid: false,
          error: `Insufficient leave balance. Available: ${leaveBalance.balance} days, Requested: ${totalDays} days`,
        };
      }

      // Check max consecutive days
      if (leaveType.maxConsecutiveDays && totalDays > leaveType.maxConsecutiveDays) {
        return {
          valid: false,
          error: `Maximum consecutive days for this leave type is ${leaveType.maxConsecutiveDays}`,
        };
      }
    }

    // Check for overlapping leave requests
    const overlappingLeaves = await LeaveRequest.find({
      employee: employeeId,
      status: { $in: ["pending", "approved"] },
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
    });

    if (overlappingLeaves.length > 0) {
      return {
        valid: false,
        error: "You have overlapping leave requests for this period",
      };
    }

    return {
      valid: true,
      message: `Leave application is valid. ${totalDays} day(s) will be deducted.`,
    };
  } catch (error) {
    console.error("Error validating leave application:", error);
    return { valid: false, error: "Validation failed" };
  }
}

/**
 * Deduct leave balance when leave is approved
 */
export async function deductLeaveBalance(
  employeeId: string,
  leaveTypeId: string,
  days: number
) {
  try {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType || !leaveType.isPaid) {
      // Only deduct for paid leaves
      return;
    }

    const leaveBalance = employee.leaveTypes.find(
      (lt: any) => lt.leaveType.toString() === leaveTypeId
    );

    if (!leaveBalance) {
      throw new Error("Leave type not found in employee's leave balance");
    }

    if (leaveBalance.balance < days) {
      throw new Error("Insufficient leave balance");
    }

    leaveBalance.balance -= days;
    await employee.save();

    return leaveBalance;
  } catch (error) {
    console.error("Error deducting leave balance:", error);
    throw error;
  }
}

/**
 * Restore leave balance when approved leave is cancelled
 */
export async function restoreLeaveBalance(
  employeeId: string,
  leaveTypeId: string,
  days: number
) {
  try {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType || !leaveType.isPaid) {
      // Only restore for paid leaves
      return;
    }

    const leaveBalance = employee.leaveTypes.find(
      (lt: any) => lt.leaveType.toString() === leaveTypeId
    );

    if (!leaveBalance) {
      throw new Error("Leave type not found in employee's leave balance");
    }

    leaveBalance.balance += days;

    // Don't exceed max days per year
    if (leaveBalance.balance > leaveBalance.maxDaysPerYear) {
      leaveBalance.balance = leaveBalance.maxDaysPerYear;
    }

    await employee.save();

    return leaveBalance;
  } catch (error) {
    console.error("Error restoring leave balance:", error);
    throw error;
  }
}

/**
 * Get leave history for an employee
 */
export async function getLeaveHistory(
  employeeId: string,
  year?: number,
  leaveTypeId?: string
) {
  try {
    const query: any = { employee: employeeId };

    if (year) {
      query.startDate = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31),
      };
    }

    if (leaveTypeId) {
      query.leaveType = leaveTypeId;
    }

    const history = await LeaveRequest.find(query)
      .populate("leaveType", "name code color")
      .populate("approver", "name memberNo")
      .populate("approvedBy", "name memberNo")
      .sort({ startDate: -1 });

    return history;
  } catch (error) {
    console.error("Error getting leave history:", error);
    throw error;
  }
}

/**
 * Get upcoming approved leaves for an employee
 */
export async function getUpcomingLeaves(employeeId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingLeaves = await LeaveRequest.find({
      employee: employeeId,
      status: "approved",
      startDate: { $gte: today },
    })
      .populate("leaveType", "name code color")
      .sort({ startDate: 1 })
      .limit(10);

    return upcomingLeaves;
  } catch (error) {
    console.error("Error getting upcoming leaves:", error);
    throw error;
  }
}

/**
 * Carry forward eligible leaves to next year
 * Should be run at year end for all employees
 */
export async function carryForwardLeaves(
  employeeId: string,
  fromYear: number,
  toYear: number
) {
  try {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    const results = [];

    for (const leaveBalance of employee.leaveTypes) {
      const leaveType = await LeaveType.findById(leaveBalance.leaveType);

      if (!leaveType) continue;

      // Only carry forward if enabled for this leave type
      if (!leaveBalance.carryForward || !leaveType.carryForward) {
        // Reset balance to max days for new year
        leaveBalance.balance = leaveBalance.maxDaysPerYear;
        results.push({
          leaveType: leaveType.name,
          carriedForward: 0,
          newBalance: leaveBalance.balance,
        });
        continue;
      }

      const currentBalance = leaveBalance.balance;
      const maxCarryForward = leaveType.maxCarryForwardDays || 0;

      // Calculate carry forward amount
      const carryForwardAmount = Math.min(currentBalance, maxCarryForward);

      // New balance = max days for new year + carried forward amount
      leaveBalance.balance = leaveBalance.maxDaysPerYear + carryForwardAmount;

      results.push({
        leaveType: leaveType.name,
        carriedForward: carryForwardAmount,
        newBalance: leaveBalance.balance,
      });
    }

    await employee.save();

    return results;
  } catch (error) {
    console.error("Error carrying forward leaves:", error);
    throw error;
  }
}

/**
 * Initialize leave balances for a new employee or when new leave types are added
 */
export async function initializeLeaveBalances(employeeId: string) {
  try {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    // Get all active leave types for the company
    const companyLeaveTypes = await LeaveType.find({
      company: employee.company,
      isActive: true,
      isPaid: true, // Only initialize paid leave types
    });

    // Check which leave types are missing from employee's balance
    const existingLeaveTypeIds = employee.leaveTypes.map((lt: any) =>
      lt.leaveType.toString()
    );

    const missingLeaveTypes = companyLeaveTypes.filter(
      (lt: any) => !existingLeaveTypeIds.includes(lt._id.toString())
    );

    // Add missing leave types
    for (const leaveType of missingLeaveTypes) {
      employee.leaveTypes.push({
        leaveType: leaveType._id,
        maxDaysPerYear: leaveType.maxDaysPerYear,
        balance: leaveType.maxDaysPerYear,
        carryForward: leaveType.carryForward,
      });
    }

    if (missingLeaveTypes.length > 0) {
      await employee.save();
    }

    return {
      initialized: missingLeaveTypes.length,
      leaveTypes: missingLeaveTypes.map((lt: any) => ({
        name: lt.name,
        code: lt.code,
        balance: lt.maxDaysPerYear,
      })),
    };
  } catch (error) {
    console.error("Error initializing leave balances:", error);
    throw error;
  }
}

/**
 * Get leave statistics for reporting
 */
export async function getLeaveStatistics(companyId: string, year?: number) {
  try {
    const currentYear = year || new Date().getFullYear();

    const stats = await LeaveRequest.aggregate([
      {
        $lookup: {
          from: "employees",
          localField: "employee",
          foreignField: "_id",
          as: "employeeData",
        },
      },
      {
        $unwind: "$employeeData",
      },
      {
        $match: {
          "employeeData.company": companyId,
          startDate: {
            $gte: new Date(currentYear, 0, 1),
            $lte: new Date(currentYear, 11, 31),
          },
        },
      },
      {
        $group: {
          _id: {
            leaveType: "$leaveType",
            status: "$status",
          },
          totalDays: { $sum: "$totalDays" },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "leavetypes",
          localField: "_id.leaveType",
          foreignField: "_id",
          as: "leaveTypeData",
        },
      },
      {
        $unwind: "$leaveTypeData",
      },
      {
        $project: {
          leaveType: "$leaveTypeData.name",
          leaveCode: "$leaveTypeData.code",
          status: "$_id.status",
          totalDays: 1,
          count: 1,
        },
      },
    ]);

    return stats;
  } catch (error) {
    console.error("Error getting leave statistics:", error);
    throw error;
  }
}
