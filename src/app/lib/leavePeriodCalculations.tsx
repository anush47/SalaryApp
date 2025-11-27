/**
 * Leave Period Calculation Helpers
 * Handles flexible accrual periods: yearly, monthly, weekly, quarterly, half-yearly, custom
 */

interface LeaveType {
  accrualPeriod: "yearly" | "monthly" | "weekly" | "quarterly" | "half-yearly" | "custom";
  maxDaysPerPeriod: number;
  customPeriodDays?: number;
  accrualMethod: "upfront" | "monthly-accrual" | "pro-rata";
  resetDay?: number;
}

interface PeriodInfo {
  periodStart: Date;
  periodEnd: Date;
  periodNumber: number;
  totalPeriods: number;
  periodLabel: string;
}

/**
 * Get the current period boundaries for a leave type
 */
export function getCurrentPeriod(
  leaveType: LeaveType,
  referenceDate: Date = new Date()
): PeriodInfo {
  const date = new Date(referenceDate);

  switch (leaveType.accrualPeriod) {
    case "yearly":
      return getYearlyPeriod(date);

    case "monthly":
      return getMonthlyPeriod(date, leaveType.resetDay);

    case "weekly":
      return getWeeklyPeriod(date, leaveType.resetDay);

    case "quarterly":
      return getQuarterlyPeriod(date, leaveType.resetDay);

    case "half-yearly":
      return getHalfYearlyPeriod(date, leaveType.resetDay);

    case "custom":
      return getCustomPeriod(date, leaveType.customPeriodDays || 30);

    default:
      return getYearlyPeriod(date);
  }
}

/**
 * Get all periods for a year (for display/reporting)
 */
export function getPeriodsInYear(
  leaveType: LeaveType,
  year: number = new Date().getFullYear()
): PeriodInfo[] {
  const periods: PeriodInfo[] = [];
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const period = getCurrentPeriod(leaveType, currentDate);

    // Check if we already have this period
    const exists = periods.some(
      (p) => p.periodStart.getTime() === period.periodStart.getTime()
    );

    if (!exists) {
      periods.push(period);
    }

    // Move to next period
    switch (leaveType.accrualPeriod) {
      case "yearly":
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
      case "monthly":
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case "weekly":
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case "quarterly":
        currentDate.setMonth(currentDate.getMonth() + 3);
        break;
      case "half-yearly":
        currentDate.setMonth(currentDate.getMonth() + 6);
        break;
      case "custom":
        currentDate.setDate(
          currentDate.getDate() + (leaveType.customPeriodDays || 30)
        );
        break;
    }
  }

  return periods;
}

/**
 * Calculate available leave days based on accrual method
 */
export function calculateAvailableLeaves(
  leaveType: LeaveType,
  employeeStartDate: Date,
  currentDate: Date = new Date()
): number {
  const period = getCurrentPeriod(leaveType, currentDate);
  const { maxDaysPerPeriod, accrualMethod } = leaveType;

  switch (accrualMethod) {
    case "upfront":
      // All leaves available at start of period
      return maxDaysPerPeriod;

    case "monthly-accrual":
      // Leaves accrue monthly, regardless of accrual period
      return calculateMonthlyAccrual(
        maxDaysPerPeriod,
        period.periodStart,
        currentDate
      );

    case "pro-rata":
      // Leaves accrue proportionally based on time in period
      return calculateProRata(
        maxDaysPerPeriod,
        employeeStartDate,
        period.periodStart,
        period.periodEnd,
        currentDate
      );

    default:
      return maxDaysPerPeriod;
  }
}

/**
 * Check if a date range spans multiple periods
 */
export function spansMultiplePeriods(
  leaveType: LeaveType,
  startDate: Date,
  endDate: Date
): boolean {
  const startPeriod = getCurrentPeriod(leaveType, startDate);
  const endPeriod = getCurrentPeriod(leaveType, endDate);

  return startPeriod.periodStart.getTime() !== endPeriod.periodStart.getTime();
}

/**
 * Split days across multiple periods
 */
export function splitDaysAcrossPeriods(
  leaveType: LeaveType,
  startDate: Date,
  endDate: Date,
  totalDays: number
): { period: PeriodInfo; days: number }[] {
  const result: { period: PeriodInfo; days: number }[] = [];
  let currentDate = new Date(startDate);
  let remainingDays = totalDays;

  while (currentDate <= endDate && remainingDays > 0) {
    const period = getCurrentPeriod(leaveType, currentDate);

    // Calculate days in this period
    const periodEndDate = new Date(Math.min(period.periodEnd.getTime(), endDate.getTime()));
    const daysInPeriod = Math.min(
      calculateDaysBetween(currentDate, periodEndDate),
      remainingDays
    );

    result.push({ period, days: daysInPeriod });
    remainingDays -= daysInPeriod;

    // Move to next period
    currentDate = new Date(period.periodEnd);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}

// ============================================================================
// Private helper functions
// ============================================================================

function getYearlyPeriod(date: Date): PeriodInfo {
  const year = date.getFullYear();
  return {
    periodStart: new Date(year, 0, 1),
    periodEnd: new Date(year, 11, 31, 23, 59, 59),
    periodNumber: 1,
    totalPeriods: 1,
    periodLabel: `Year ${year}`,
  };
}

function getMonthlyPeriod(date: Date, resetDay: number = 1): PeriodInfo {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  let periodStart: Date;
  let periodEnd: Date;

  if (day >= resetDay) {
    // Current period
    periodStart = new Date(year, month, resetDay);
    periodEnd = new Date(year, month + 1, resetDay - 1, 23, 59, 59);
  } else {
    // Previous period
    periodStart = new Date(year, month - 1, resetDay);
    periodEnd = new Date(year, month, resetDay - 1, 23, 59, 59);
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return {
    periodStart,
    periodEnd,
    periodNumber: periodStart.getMonth() + 1,
    totalPeriods: 12,
    periodLabel: `${monthNames[periodStart.getMonth()]} ${periodStart.getFullYear()}`,
  };
}

function getWeeklyPeriod(date: Date, resetDay: number = 1): PeriodInfo {
  // resetDay: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentDay = date.getDay();
  const diff = (currentDay - resetDay + 7) % 7;

  const periodStart = new Date(date);
  periodStart.setDate(date.getDate() - diff);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodStart.getDate() + 6);
  periodEnd.setHours(23, 59, 59);

  // Calculate week number in year
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((periodStart.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24) + 1) / 7
  );

  return {
    periodStart,
    periodEnd,
    periodNumber: weekNumber,
    totalPeriods: 52,
    periodLabel: `Week ${weekNumber} of ${date.getFullYear()}`,
  };
}

function getQuarterlyPeriod(date: Date, resetDay: number = 1): PeriodInfo {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Determine quarter start month
  let quarterStartMonth = Math.floor(month / 3) * 3;

  // Adjust if before reset day
  if (month % 3 === 0 && day < resetDay) {
    quarterStartMonth -= 3;
  }

  const periodStart = new Date(year, quarterStartMonth, resetDay);
  const periodEnd = new Date(year, quarterStartMonth + 3, resetDay - 1, 23, 59, 59);

  const quarter = Math.floor(quarterStartMonth / 3) + 1;

  return {
    periodStart,
    periodEnd,
    periodNumber: quarter,
    totalPeriods: 4,
    periodLabel: `Q${quarter} ${periodStart.getFullYear()}`,
  };
}

function getHalfYearlyPeriod(date: Date, resetDay: number = 1): PeriodInfo {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  let halfStartMonth = month < 6 ? 0 : 6;

  // Adjust if before reset day
  if (month === 0 && day < resetDay) {
    halfStartMonth = 6;
  } else if (month === 6 && day < resetDay) {
    halfStartMonth = 0;
  }

  const periodStart = new Date(year, halfStartMonth, resetDay);
  const periodEnd = new Date(year, halfStartMonth + 6, resetDay - 1, 23, 59, 59);

  const half = halfStartMonth === 0 ? 1 : 2;

  return {
    periodStart,
    periodEnd,
    periodNumber: half,
    totalPeriods: 2,
    periodLabel: `H${half} ${periodStart.getFullYear()}`,
  };
}

function getCustomPeriod(date: Date, periodDays: number): PeriodInfo {
  // For custom periods, calculate based on start of year
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const daysSinceYearStart = calculateDaysBetween(yearStart, date);

  const periodNumber = Math.floor(daysSinceYearStart / periodDays) + 1;
  const daysSincePeriodStart = daysSinceYearStart % periodDays;

  const periodStart = new Date(date);
  periodStart.setDate(date.getDate() - daysSincePeriodStart);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodStart.getDate() + periodDays - 1);
  periodEnd.setHours(23, 59, 59);

  const totalPeriods = Math.ceil(365 / periodDays);

  return {
    periodStart,
    periodEnd,
    periodNumber,
    totalPeriods,
    periodLabel: `Period ${periodNumber} (${periodDays} days)`,
  };
}

function calculateMonthlyAccrual(
  maxDaysPerPeriod: number,
  periodStart: Date,
  currentDate: Date
): number {
  const monthsElapsed = getMonthsDifference(periodStart, currentDate);
  const monthsInPeriod = 12; // Assuming annual calculation

  const accrualPerMonth = maxDaysPerPeriod / monthsInPeriod;
  const accruedDays = Math.min(accrualPerMonth * monthsElapsed, maxDaysPerPeriod);

  return Math.floor(accruedDays * 10) / 10; // Round to 1 decimal
}

function calculateProRata(
  maxDaysPerPeriod: number,
  employeeStartDate: Date,
  periodStart: Date,
  periodEnd: Date,
  currentDate: Date
): number {
  // If employee started before period, they get full allocation
  if (employeeStartDate <= periodStart) {
    const totalDays = calculateDaysBetween(periodStart, periodEnd);
    const elapsedDays = calculateDaysBetween(periodStart, currentDate);
    const ratio = Math.min(elapsedDays / totalDays, 1);
    return Math.floor(maxDaysPerPeriod * ratio * 10) / 10;
  }

  // If employee started during period, pro-rate based on their start date
  const totalDays = calculateDaysBetween(periodStart, periodEnd);
  const employeeDaysInPeriod = calculateDaysBetween(employeeStartDate, periodEnd);
  const ratio = employeeDaysInPeriod / totalDays;

  return Math.floor(maxDaysPerPeriod * ratio * 10) / 10;
}

function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getMonthsDifference(startDate: Date, endDate: Date): number {
  const yearDiff = endDate.getFullYear() - startDate.getFullYear();
  const monthDiff = endDate.getMonth() - startDate.getMonth();
  return yearDiff * 12 + monthDiff + 1;
}

/**
 * Format period label for display
 */
export function formatPeriodLabel(period: PeriodInfo): string {
  return period.periodLabel;
}

/**
 * Get period description for UI
 */
export function getPeriodDescription(accrualPeriod: string): string {
  switch (accrualPeriod) {
    case "yearly":
      return "Leaves reset annually (January 1st)";
    case "monthly":
      return "Leaves reset every month";
    case "weekly":
      return "Leaves reset every week";
    case "quarterly":
      return "Leaves reset every 3 months (Jan, Apr, Jul, Oct)";
    case "half-yearly":
      return "Leaves reset twice a year (Jan, Jul)";
    case "custom":
      return "Leaves reset based on custom period";
    default:
      return "Leaves reset annually";
  }
}

/**
 * Get accrual method description for UI
 */
export function getAccrualMethodDescription(accrualMethod: string): string {
  switch (accrualMethod) {
    case "upfront":
      return "All leaves available at the start of the period";
    case "monthly-accrual":
      return "Leaves accrue gradually each month";
    case "pro-rata":
      return "Leaves accrue proportionally based on time worked";
    default:
      return "All leaves available at the start of the period";
  }
}
