import { IEmployee } from "@/app/models/Employee";

interface PeriodDates {
    startDate: Date;
    endDate: Date;
    periodDays: number;
}

/**
 * Calculate period start and end dates based on employee's salary period configuration
 */
/**
 * Calculate period start and end dates based on employee's salary period configuration
 */
export function calculatePeriodDates(
    employee: IEmployee,
    period: string,
    company?: any
): PeriodDates {
    let salaryPeriod = employee.salaryPeriod;
    let payPeriodConfig = employee.payPeriodConfig;
    let customPeriodDays = employee.customPeriodDays;

    // Logic to determine effective configuration
    // If overrides are enabled, prioritize employee settings
    const isOverrideEnabled = employee.overrides?.salaryPeriod;

    // Debug logging for configuration source
    console.log(`[SalaryGen] Resolving Period Config for ${employee.name} (${employee._id})`);
    console.log(`[SalaryGen] Employee Override Enabled: ${isOverrideEnabled}`);
    console.log(`[SalaryGen] Employee Config: Period=${salaryPeriod}, Type=${payPeriodConfig?.type}`);

    if (!isOverrideEnabled && company?.salaryPeriodDefaults) {
        // Use company defaults if override is NOT enabled
        const defaults = company.salaryPeriodDefaults;
        salaryPeriod = defaults.salaryPeriod;
        payPeriodConfig = defaults.payPeriodConfig;
        customPeriodDays = defaults.customPeriodDays;

        console.log(`[SalaryGen] Using Company Defaults: Period=${salaryPeriod}`);
    } else {
        // Fallback or explicit override: ensure salaryPeriod exists
        if (!salaryPeriod) {
            console.warn(`[SalaryGen] Salary period missing for employee ${employee._id} (Override: ${isOverrideEnabled}). Defaulting to monthly.`);
            salaryPeriod = "monthly";
        } else {
            console.log(`[SalaryGen] Using Employee Override/Config: Period=${salaryPeriod}`);
        }
    }

    switch (salaryPeriod) {
        case "monthly":
            return calculateMonthlyPeriod(period, payPeriodConfig);
        case "weekly":
            return calculateWeeklyPeriod(period);
        case "bi-weekly":
            return calculateBiWeeklyPeriod(period);
        case "daily":
            return calculateDailyPeriod(period);
        case "custom":
            return calculateCustomPeriod(period, customPeriodDays);
        default:
            console.warn(`Unknown salary period '${salaryPeriod}', defaulting to monthly.`);
            return calculateMonthlyPeriod(period, payPeriodConfig);
    }
}

/**
 * Calculate monthly period dates
 * Supports custom pay period configurations (e.g., 25th to 24th)
 */
function calculateMonthlyPeriod(
    period: string, // YYYY-MM format
    config?: {
        startDay: number;
        endDay?: number;
        type: "fixed_dates" | "start_to_end_of_month" | "end_to_end_of_month";
    }
): PeriodDates {
    const [year, month] = period.split("-").map(Number);

    if (!config) {
        // Standard: 1st to end of month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month
        return {
            startDate,
            endDate,
            periodDays: endDate.getDate(),
        };
    }

    // Custom pay period configuration
    const startDay = config.startDay || 1;
    const endDay = config.endDay;
    const type = config.type || "fixed_dates";

    let startDate: Date;
    let endDate: Date;

    if (type === "start_to_end_of_month") {
        // e.g., 15th to end of month
        startDate = new Date(year, month - 1, startDay);
        endDate = new Date(year, month, 0);
    } else if (type === "end_to_end_of_month") {
        // e.g., last day of previous month to last day of current month
        startDate = new Date(year, month - 2, 0); // Last day of previous month
        endDate = new Date(year, month, 0); // Last day of current month
    } else {
        // fixed_dates: e.g., 25th to 24th (crosses month boundary)
        startDate = new Date(year, month - 1, startDay);

        if (!endDay || endDay === 0) {
            // End of month
            endDate = new Date(year, month, 0);
        } else if (endDay < startDay) {
            // Crosses to next month (e.g., 25th to 24th)
            endDate = new Date(year, month, endDay);
        } else {
            // Same month
            endDate = new Date(year, month - 1, endDay);
        }
    }

    const periodDays =
        Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return { startDate, endDate, periodDays };
}

/**
 * Calculate weekly period dates
 * Period format: YYYY-Www (e.g., 2025-W03)
 * Fallback: YYYY-MM (treat as monthly duration for weekly rate employee)
 */
function calculateWeeklyPeriod(period: string): PeriodDates {
    // Check for monthly format first to handle bulk generation
    if (/^\d{4}-\d{2}$/.test(period)) {
        return calculateMonthlyPeriod(period);
    }

    const match = period.match(/^(\d{4})-W(\d{2})$/);
    if (!match) {
        throw new Error("Invalid weekly period format. Expected YYYY-Www (e.g., 2025-W03) or YYYY-MM");
    }

    const year = parseInt(match[1]);
    const week = parseInt(match[2]);

    // Calculate the start date (Monday of the week)
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7; // Sunday = 7
    const weekStart = new Date(jan4);
    weekStart.setDate(jan4.getDate() - jan4Day + 1 + (week - 1) * 7);

    const startDate = weekStart;
    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 6); // Sunday

    return {
        startDate,
        endDate,
        periodDays: 7,
    };
}

/**
 * Calculate bi-weekly period dates
 * Period format: YYYY-Bww (e.g., 2025-B03 for 3rd bi-weekly period)
 * Fallback: YYYY-MM (treat as monthly duration)
 */
function calculateBiWeeklyPeriod(period: string): PeriodDates {
    // Check for monthly format first
    if (/^\d{4}-\d{2}$/.test(period)) {
        return calculateMonthlyPeriod(period);
    }

    const match = period.match(/^(\d{4})-B(\d{2})$/);
    if (!match) {
        throw new Error("Invalid bi-weekly period format. Expected YYYY-Bww (e.g., 2025-B03) or YYYY-MM");
    }

    const year = parseInt(match[1]);
    const biWeekNum = parseInt(match[2]);

    // Start from first day of year
    const startDate = new Date(year, 0, 1);
    startDate.setDate(startDate.getDate() + (biWeekNum - 1) * 14);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 13);

    return {
        startDate,
        endDate,
        periodDays: 14,
    };
}

/**
 * Calculate daily period dates
 * Period format: YYYY-MM-DD
 * Fallback: YYYY-MM (treat as monthly duration)
 */
function calculateDailyPeriod(period: string): PeriodDates {
    // Check for monthly format first
    if (/^\d{4}-\d{2}$/.test(period)) {
        return calculateMonthlyPeriod(period);
    }

    const match = period.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        throw new Error("Invalid daily period format. Expected YYYY-MM-DD or YYYY-MM");
    }

    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);

    const date = new Date(year, month - 1, day);

    return {
        startDate: date,
        endDate: date,
        periodDays: 1,
    };
}

/**
 * Calculate custom period dates
 * Period format: YYYY-MM-DD (start date)
 */
function calculateCustomPeriod(period: string, customPeriodDays?: number): PeriodDates {
    if (!customPeriodDays || customPeriodDays <= 0) {
        throw new Error("Custom period days must be specified and greater than 0");
    }

    const match = period.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        throw new Error("Invalid custom period format. Expected YYYY-MM-DD (start date)");
    }

    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);

    const startDate = new Date(year, month - 1, day);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + customPeriodDays - 1);

    return {
        startDate,
        endDate,
        periodDays: customPeriodDays,
    };
}

/**
 * Calculate expected working days based on employee's working days configuration
 */
export function calculateExpectedWorkingDays(
    employee: IEmployee,
    startDate: Date,
    endDate: Date
): number {
    const workingDays = employee.workingDays;
    let totalDays = 0;

    const current = new Date(startDate);
    while (current <= endDate) {
        const dayOfWeek = current.getDay();
        const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
        const dayName = dayNames[dayOfWeek];

        const dayStatus = workingDays[dayName];
        if (dayStatus === "full") {
            totalDays += 1;
        } else if (dayStatus === "half") {
            totalDays += 0.5;
        }
        // "off" = 0 days

        current.setDate(current.getDate() + 1);
    }

    return totalDays;
}
