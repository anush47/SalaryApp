import Employee from "@/app/models/Employee";
import LeaveRequest from "@/app/models/LeaveRequest";
import LeaveType from "@/app/models/LeaveType";
import Company from "@/app/models/Company";
import {
  getCurrentPeriod,
  calculateAvailableLeaves,
  spansMultiplePeriods,
  splitDaysAcrossPeriods,
  formatPeriodLabel,
} from "@/app/lib/leavePeriodCalculations";
import { getNICDetails } from "@/app/lib/nicUtils";
import { EmployeeService } from "@/app/api/employees/service";

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

    // Determine gender from NIC
    const { gender } = employee.nic ? getNICDetails(employee.nic) : { gender: "" };

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
        maxDaysPerPeriod: lt.maxDaysPerPeriod || lt.maxDaysPerYear,
        balance: lt.maxDaysPerPeriod || lt.maxDaysPerYear,
        carryForward: lt.carryForward,
        currentPeriodStart: null,
        lastAccrualDate: null,
        carriedForwardBalance: 0,
      }));
    }

    // Populate leave type details and calculate usage
    const summary = [];
    for (const lt of leaveTypes) {
      const leaveType = await LeaveType.findById(lt.leaveType);
      if (!leaveType) continue;

      // Filter by Gender
      if (leaveType.gender && leaveType.gender !== "all" && leaveType.gender !== gender) {
        continue;
      }

      // Get current period for this leave type
      const currentPeriod = getCurrentPeriod(leaveType, new Date());

      // Check if we need to reset period
      const needsReset = !lt.currentPeriodStart ||
        new Date(lt.currentPeriodStart).getTime() !== currentPeriod.periodStart.getTime();

      if (needsReset) {
        // Period has changed - reset balance
        // Note: This saves the employee document. Since we are in a loop, sequential execution
        // prevents VersionError (optimistic concurrency control)
        await resetPeriodBalance(employee, lt, leaveType, currentPeriod);
      }

      // Calculate available leaves based on accrual method
      const availableLeaves = calculateAvailableLeaves(
        leaveType,
        new Date(employee.startedAt || new Date()),
        new Date()
      );

      // Calculate usage stats (approved vs pending)
      const usageStats = await LeaveRequest.aggregate([
        {
          $match: {
            employee: employee._id,
            leaveType: leaveType._id,
            status: { $in: ["approved", "pending"] },
            startDate: {
              $gte: currentPeriod.periodStart,
              $lte: currentPeriod.periodEnd,
            },
          },
        },
        {
          $group: {
            _id: "$status",
            total: { $sum: "$totalDays" },
          },
        },
      ]);

      const approvedUsed = usageStats.find(s => s._id === "approved")?.total || 0;
      const pendingUsed = usageStats.find(s => s._id === "pending")?.total || 0;

      // Calculate effective balance robustly
      const maxDays = lt.maxDaysPerPeriod || 0;
      let effectiveBalance = lt.balance;

      // Safety cap: Remaining cannot exceed (Max - Approved Usage)
      const theoreticalRemaining = Math.max(0, maxDays - approvedUsed);
      effectiveBalance = Math.min(effectiveBalance, theoreticalRemaining);

      summary.push({
        leaveType: {
          _id: leaveType._id,
          name: leaveType.name,
          code: leaveType.code,
          color: leaveType.color,
          isPaid: leaveType.isPaid,
          requiresApproval: leaveType.requiresApproval,
          requiresDocument: leaveType.requiresDocument,
          maxConsecutiveDays: leaveType.maxConsecutiveDays,
          accrualPeriod: leaveType.accrualPeriod,
          accrualMethod: leaveType.accrualMethod,
        },
        maxDaysPerPeriod: lt.maxDaysPerPeriod,
        availableLeaves,
        used: approvedUsed,
        pending: pendingUsed,
        balance: effectiveBalance,
        available: Math.max(0, effectiveBalance - pendingUsed),
        carryForward: lt.carryForward,
        carriedForwardBalance: lt.carriedForwardBalance || 0,
        currentPeriod: {
          start: currentPeriod.periodStart,
          end: currentPeriod.periodEnd,
          label: formatPeriodLabel(currentPeriod),
        },
      });
    }

    return summary.filter((s) => s !== null);
  } catch (error) {
    console.error("Error getting leave balance summary:", error);
    throw error;
  }
}

/**
 * Reset employee leave balance for new period
 */
async function resetPeriodBalance(
  employee: any,
  leaveBalance: any,
  leaveType: any,
  newPeriod: any
) {
  try {
    // Calculate carry forward if applicable
    let carriedForward = 0;
    if (leaveBalance.carryForward && leaveType.carryForward) {
      const remainingBalance = leaveBalance.balance || 0;
      const maxCarryForward = leaveType.maxCarryForwardDays || 0;
      carriedForward = Math.min(remainingBalance, maxCarryForward);
    }

    // Reset balance for new period
    const maxForPeriod = leaveType.maxDaysPerPeriod || leaveType.maxDaysPerYear;

    // Find and update the specific leave type
    const leaveTypeIndex = employee.leaveTypes.findIndex(
      (lt: any) => lt.leaveType.toString() === leaveType._id.toString()
    );

    if (leaveTypeIndex !== -1) {
      employee.leaveTypes[leaveTypeIndex].balance = maxForPeriod + carriedForward;
      employee.leaveTypes[leaveTypeIndex].currentPeriodStart = newPeriod.periodStart;
      employee.leaveTypes[leaveTypeIndex].lastAccrualDate = new Date();
      employee.leaveTypes[leaveTypeIndex].carriedForwardBalance = carriedForward;
      employee.leaveTypes[leaveTypeIndex].maxDaysPerPeriod = maxForPeriod;

      // Repair legacy data before saving
      await EmployeeService.ensureValidLeaveTypes(employee);
      await employee.save();
    }
  } catch (error) {
    console.error("Error resetting period balance:", error);
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
): Promise<{ valid: boolean; error?: string; message?: string; warning?: string }> {
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
    if (leaveType.gender !== "all" && (employee as any).gender && leaveType.gender !== (employee as any).gender) {
      return {
        valid: false,
        error: `This leave type is only applicable for ${leaveType.gender} employees`,
      };
    }

    // Check if leave spans multiple periods
    const spansMultiple = spansMultiplePeriods(leaveType, start, end);
    let warning = undefined;

    if (spansMultiple) {
      // Split days across periods
      const periodSplits = splitDaysAcrossPeriods(leaveType, start, end, totalDays);

      warning = `This leave spans multiple ${leaveType.accrualPeriod} periods: ` +
        periodSplits.map(ps => `${ps.days} day(s) in ${formatPeriodLabel(ps.period)}`).join(", ");

      // Validate balance for each period
      if (leaveType.isPaid) {
        for (const split of periodSplits) {
          const leaveBalance = employee.leaveTypes.find(
            (lt: any) => lt.leaveType.toString() === leaveTypeId
          );

          if (!leaveBalance) {
            return {
              valid: false,
              error: "Leave type not assigned to this employee",
            };
          }

          // For future periods, we can't accurately check balance yet
          const currentPeriod = getCurrentPeriod(leaveType, new Date());
          if (split.period.periodStart.getTime() > currentPeriod.periodStart.getTime()) {
            warning += `. Note: Balance for future periods will be validated when the period begins.`;
            continue;
          }

          // Check current period balance
          if (leaveBalance.balance < split.days) {
            return {
              valid: false,
              error: `Insufficient leave balance for ${formatPeriodLabel(split.period)}. Available: ${leaveBalance.balance} days, Requested: ${split.days} days`,
            };
          }
        }
      }
    } else {
      // Single period validation
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
      }
    }

    // Check max consecutive days
    if (leaveType.maxConsecutiveDays && totalDays > leaveType.maxConsecutiveDays) {
      return {
        valid: false,
        error: `Maximum consecutive days for this leave type is ${leaveType.maxConsecutiveDays}`,
      };
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
      warning,
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
    // Repair legacy data before saving
    await EmployeeService.ensureValidLeaveTypes(employee);
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
    if (leaveBalance.balance > leaveBalance.maxDaysPerPeriod) {
      leaveBalance.balance = leaveBalance.maxDaysPerPeriod;
    }

    await EmployeeService.ensureValidLeaveTypes(employee);
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
        leaveBalance.balance = (leaveBalance as any).maxDaysPerPeriod;
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
      leaveBalance.balance = (leaveBalance as any).maxDaysPerPeriod + carryForwardAmount;

      results.push({
        leaveType: leaveType.name,
        carriedForward: carryForwardAmount,
        newBalance: leaveBalance.balance,
      });
    }

    await EmployeeService.ensureValidLeaveTypes(employee);
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

    // Add missing leave types with period awareness
    for (const leaveType of missingLeaveTypes) {
      const currentPeriod = getCurrentPeriod(leaveType, new Date());
      const maxDays = leaveType.maxDaysPerPeriod || leaveType.maxDaysPerYear;

      // Calculate available balance based on accrual method
      const availableBalance = calculateAvailableLeaves(
        leaveType,
        new Date(employee.startedAt || new Date()),
        new Date()
      );

      employee.leaveTypes.push({
        leaveType: leaveType._id,
        maxDaysPerPeriod: maxDays,
        balance: availableBalance,
        carryForward: leaveType.carryForward,
        currentPeriodStart: currentPeriod.periodStart,
        lastAccrualDate: new Date(),
        carriedForwardBalance: 0,
      });
    }

    if (missingLeaveTypes.length > 0) {
      await EmployeeService.ensureValidLeaveTypes(employee);
      await employee.save();
    }

    return {
      initialized: missingLeaveTypes.length,
      leaveTypes: missingLeaveTypes.map((lt: any) => ({
        name: lt.name,
        code: lt.code,
        accrualPeriod: lt.accrualPeriod,
        accrualMethod: lt.accrualMethod,
        balance: lt.maxDaysPerPeriod || lt.maxDaysPerYear,
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
