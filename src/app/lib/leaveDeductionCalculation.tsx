import LeaveRequest from "@/app/models/LeaveRequest";
import LeaveType from "@/app/models/LeaveType";

/**
 * Calculate leave deductions for salary generation
 *
 * This function:
 * 1. Finds all approved no-pay leave requests for the salary period
 * 2. Calculates deduction amount based on employee's basic salary and divideBy
 * 3. Returns total deduction and detailed leaveDeductions array
 *
 * Formula: Deduction = (basic / divideBy) × leave days
 *
 * @param employeeId - Employee ID
 * @param period - Salary period (YYYY-MM format)
 * @param basic - Employee's basic salary
 * @param divideBy - Divisor for hourly rate calculation (240 or 200)
 * @returns Object with totalLeaveDeduction, leaveDeductions array, and reason string
 */
/**
 * Calculate single leave deduction for one day context
 */
export function calculateSingleLeaveDeduction(
  leaveRequest: any,
  leaveType: any,
  basic: number,
  divideBy: number = 240
) {
  if (leaveType.isPaid) {
    return { amount: 0, days: 0, description: "" };
  }

  let deductionAmount = 0;
  let daysForDeduction = 0;
  let description = "";

  // Short Leave Logic
  if (leaveType.isShortLeave || leaveRequest.totalMinutes) {
    const mins = leaveRequest.totalMinutes || 0;
    const dailyRate = basic / divideBy;
    const hourlyRate = dailyRate / 8;
    deductionAmount = hourlyRate * (mins / 60);
    // daysForDeduction = 0; // Not a day count

    const start = new Date(leaveRequest.startDate);
    const end = new Date(leaveRequest.endDate);
    const timeStr = !isNaN(start.getTime()) && !isNaN(end.getTime())
      ? `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : `${mins} mins`;
    description = `${leaveType.name} (${timeStr})`;
  }
  // Half Day Logic
  else if (leaveRequest.halfDay) {
    const dailyRate = basic / divideBy;
    deductionAmount = dailyRate * 0.5;
    daysForDeduction = 0.5;
    const periodLabel = leaveRequest.halfDayPeriod === "first_half" ? "First Half" : "Final Half";
    description = `${leaveType.name} (${periodLabel})`;
  }
  // Full Day Logic (Single Day context)
  else {
    const dailyRate = basic / divideBy;
    deductionAmount = dailyRate * 1;
    daysForDeduction = 1;
    description = `${leaveType.name}`;
  }

  return { amount: deductionAmount, days: daysForDeduction, description };
}

export async function calculateLeaveDeductions(
  employeeId: string,
  period: string,
  basic: number,
  divideBy: number = 240
) {
  try {
    // Parse period to get start and end dates
    const [year, month] = period.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1); // First day of the month
    const endDate = new Date(year, month, 0); // Last day of the month

    // Find all approved leave requests for this period that are no-pay leaves
    const leaveRequests = await LeaveRequest.find({
      employee: employeeId,
      status: "approved",
      $or: [
        // Leave starts in this period
        { startDate: { $gte: startDate, $lte: endDate } },
        // Leave ends in this period
        { endDate: { $gte: startDate, $lte: endDate } },
        // Leave spans this period
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
      ],
    }).populate("leaveType");

    let totalLeaveDeduction = 0;
    const leaveDeductions: {
      leaveRequestId: any;
      leaveType: string;
      days: number;
      amount: number;
    }[] = [];
    const leaveReasons: string[] = [];

    for (const leaveRequest of leaveRequests) {
      const leaveType = leaveRequest.leaveType as any;

      // Only process no-pay leaves
      if (!leaveType.isPaid) {
        let deductionAmount = 0;
        let daysForDeduction = 0;
        let description = "";

        // Short Leave Logic
        if (leaveType.isShortLeave || leaveRequest.totalMinutes) {
          const mins = leaveRequest.totalMinutes || 0;
          // Assume Basic / DivideBy = Daily Rate
          // Hourly Rate = Daily Rate / 8 (Assuming 8 hour workday standard for conversion)
          // Deduction = Hourly Rate * Hours 
          const dailyRate = basic / divideBy;
          const hourlyRate = dailyRate / 8;
          deductionAmount = hourlyRate * (mins / 60);
          daysForDeduction = 0; // It's not a "day" deduction in terms of count, but amount.

          // Format time range if valid dates
          const start = new Date(leaveRequest.startDate);
          const end = new Date(leaveRequest.endDate);
          const timeStr = !isNaN(start.getTime()) && !isNaN(end.getTime())
            ? `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : `${mins} mins`;
          description = `${leaveType.name} (${timeStr})`;

        } else if (leaveRequest.halfDay) {
          // Half Day Logic
          const daysInPeriod = 1; // Half day is 1 instance
          // Check overlap? Usually half day is single day.
          // If it spans?? Half day usually single day.
          // We assume start==end for half day.

          const dailyRate = basic / divideBy;
          deductionAmount = dailyRate * 0.5;
          daysForDeduction = 0.5;
          const periodLabel = leaveRequest.halfDayPeriod === "first_half" ? "First Half" : "Final Half";
          description = `${leaveType.name} (${periodLabel})`;

        } else {
          // Full Day Logic (Original)
          const leaveStart = new Date(leaveRequest.startDate);
          const leaveEnd = new Date(leaveRequest.endDate);
          const overlapStart = leaveStart > startDate ? leaveStart : startDate;
          const overlapEnd = leaveEnd < endDate ? leaveEnd : endDate;
          const daysInPeriod = calculateDaysBetween(overlapStart, overlapEnd);

          if (daysInPeriod > 0) {
            const dailyRate = basic / divideBy;
            deductionAmount = dailyRate * daysInPeriod;
            daysForDeduction = daysInPeriod;
            description = `${daysInPeriod} day${daysInPeriod > 1 ? "s" : ""} ${leaveType.name}`;
          }
        }

        if (deductionAmount > 0) {
          totalLeaveDeduction += deductionAmount;

          leaveDeductions.push({
            leaveRequestId: leaveRequest._id,
            leaveType: leaveType.name,
            days: daysForDeduction,
            amount: deductionAmount,
          });

          leaveReasons.push(description);
        }
      }
    }

    const leaveDeductionReason = leaveReasons.length > 0
      ? leaveReasons.join(", ")
      : "";

    return {
      totalLeaveDeduction,
      leaveDeductions,
      leaveDeductionReason,
    };
  } catch (error) {
    console.error("Error calculating leave deductions:", error);
    return {
      totalLeaveDeduction: 0,
      leaveDeductions: [],
      leaveDeductionReason: "",
    };
  }
}

/**
 * Calculate number of days between two dates (inclusive)
 */
function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
  return diffDays;
}

/**
 * Get summary of leave deductions for a salary period
 * Used for display in payslips and salary reports
 */
export async function getLeaveDeductionSummary(
  employeeId: string,
  period: string
) {
  try {
    const [year, month] = period.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const leaveRequests = await LeaveRequest.find({
      employee: employeeId,
      status: "approved",
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
      ],
    })
      .populate("leaveType")
      .sort({ startDate: 1 });

    const paidLeaves: any[] = [];
    const noPayLeaves: any[] = [];

    for (const leaveRequest of leaveRequests) {
      const leaveType = leaveRequest.leaveType as any;
      const leaveStart = new Date(leaveRequest.startDate);
      const leaveEnd = new Date(leaveRequest.endDate);

      const overlapStart = leaveStart > startDate ? leaveStart : startDate;
      const overlapEnd = leaveEnd < endDate ? leaveEnd : endDate;
      const daysInPeriod = calculateDaysBetween(overlapStart, overlapEnd);

      const leaveInfo = {
        leaveRequestId: leaveRequest._id,
        leaveType: leaveType.name,
        leaveCode: leaveType.code,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        daysInPeriod,
        totalDays: leaveRequest.totalDays,
        halfDay: leaveRequest.halfDay,
      };

      if (leaveType.isPaid) {
        paidLeaves.push(leaveInfo);
      } else {
        noPayLeaves.push(leaveInfo);
      }
    }

    return {
      paidLeaves,
      noPayLeaves,
      totalPaidLeaveDays: paidLeaves.reduce((sum, l) => sum + l.daysInPeriod, 0),
      totalNoPayLeaveDays: noPayLeaves.reduce((sum, l) => sum + l.daysInPeriod, 0),
    };
  } catch (error) {
    console.error("Error getting leave deduction summary:", error);
    return {
      paidLeaves: [],
      noPayLeaves: [],
      totalPaidLeaveDays: 0,
      totalNoPayLeaveDays: 0,
    };
  }
}

/**
 * Validate if salary can be generated for an employee with approved leaves
 * Checks for any conflicts or issues
 */
export async function validateSalaryWithLeaves(
  employeeId: string,
  period: string
) {
  try {
    const [year, month] = period.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Check for pending leave requests in this period
    const pendingLeaves = await LeaveRequest.find({
      employee: employeeId,
      status: "pending",
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
      ],
    }).populate("leaveType");

    if (pendingLeaves.length > 0) {
      const pendingDays = pendingLeaves.reduce(
        (sum, leave) => sum + leave.totalDays,
        0
      );
      return {
        valid: true, // Still valid, but with warning
        warning: `${pendingLeaves.length} pending leave request(s) (${pendingDays} days) in this period. Only approved leaves will affect salary.`,
        pendingLeaves: pendingLeaves.map((leave) => ({
          leaveType: (leave.leaveType as any).name,
          startDate: leave.startDate,
          endDate: leave.endDate,
          totalDays: leave.totalDays,
        })),
      };
    }

    return {
      valid: true,
      warning: null,
      pendingLeaves: [],
    };
  } catch (error) {
    console.error("Error validating salary with leaves:", error);
    return {
      valid: false,
      error: "Failed to validate leave requests for salary period",
    };
  }
}
