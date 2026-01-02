import { IEmployee } from "@/app/models/Employee";

/**
 * Calculate daily rate for an employee
 * Uses override if specified, otherwise calculates from basic salary
 */
export function calculateDailyRate(employee: IEmployee): number {
    if (employee.dailyRateOverride) {
        return employee.dailyRateOverride;
    }

    const rateDivisor = employee.rateDivisor || 30;
    return employee.basic / employee.divideBy / rateDivisor;
}

/**
 * Calculate weekly rate for an employee
 * Uses override if specified, otherwise calculates from daily rate
 */
export function calculateWeeklyRate(employee: IEmployee): number {
    if (employee.weeklyRateOverride) {
        return employee.weeklyRateOverride;
    }

    const dailyRate = calculateDailyRate(employee);
    return dailyRate * 7;
}

/**
 * Calculate bi-weekly rate for an employee
 */
export function calculateBiWeeklyRate(employee: IEmployee): number {
    const dailyRate = calculateDailyRate(employee);
    return dailyRate * 14;
}

/**
 * Calculate monthly rate for an employee
 * Uses override if specified, otherwise uses basic salary
 */
export function calculateMonthlyRate(employee: IEmployee): number {
    if (employee.monthlyRateOverride) {
        return employee.monthlyRateOverride;
    }

    return employee.basic;
}

/**
 * Calculate base salary for a period based on employee's salary period type
 */
export function calculateBaseSalaryForPeriod(
    employee: IEmployee,
    workDays: number,
    periodDays: number
): number {
    const { salaryPeriod } = employee;

    switch (salaryPeriod) {
        case "daily":
            return calculateDailyRate(employee) * workDays;

        case "weekly":
            return calculateWeeklyRate(employee);

        case "bi-weekly":
            return calculateBiWeeklyRate(employee);

        case "monthly":
            return calculateMonthlyRate(employee);

        case "custom":
            // For custom periods, use daily rate × period days
            return calculateDailyRate(employee) * periodDays;

        default:
            throw new Error(`Unsupported salary period: ${salaryPeriod}`);
    }
}

/**
 * Calculate hourly rate for OT calculations
 */
export function calculateHourlyRate(employee: IEmployee): number {
    const dailyRate = calculateDailyRate(employee);
    // Assuming 8-hour workday
    return dailyRate / 8;
}
