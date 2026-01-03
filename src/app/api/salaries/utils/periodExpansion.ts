import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import dayOfYear from 'dayjs/plugin/dayOfYear';

dayjs.extend(isoWeek);
dayjs.extend(dayOfYear);

/**
 * Expand a monthly period (YYYY-MM) into an array of daily periods (YYYY-MM-DD)
 * @param month - Month in YYYY-MM format
 * @returns Array of daily period strings
 */
export function expandMonthToDaily(month: string): string[] {
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = dayjs(`${year}-${monthNum}-01`).daysInMonth();

    const dailyPeriods: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const date = dayjs(`${year}-${monthNum}-${day}`);
        dailyPeriods.push(date.format('YYYY-MM-DD'));
    }

    return dailyPeriods;
}

/**
 * Expand a monthly period (YYYY-MM) into an array of weekly periods (YYYY-Www)
 * @param month - Month in YYYY-MM format
 * @returns Array of weekly period strings
 */
export function expandMonthToWeekly(month: string): string[] {
    const [year, monthNum] = month.split('-').map(Number);
    const startOfMonth = dayjs(`${year}-${monthNum}-01`);
    const endOfMonth = startOfMonth.endOf('month');

    const weeklyPeriods: string[] = [];
    const seenWeeks = new Set<string>();

    let current = startOfMonth;
    while (current.isBefore(endOfMonth) || current.isSame(endOfMonth, 'day')) {
        const weekNumber = current.isoWeek();
        const weekYear = current.isoWeekYear();
        const weekPeriod = `${weekYear}-W${String(weekNumber).padStart(2, '0')}`;

        if (!seenWeeks.has(weekPeriod)) {
            weeklyPeriods.push(weekPeriod);
            seenWeeks.add(weekPeriod);
        }

        current = current.add(1, 'day');
    }

    return weeklyPeriods;
}

/**
 * Expand a monthly period (YYYY-MM) into an array of bi-weekly periods (YYYY-Bww)
 * @param month - Month in YYYY-MM format
 * @returns Array of bi-weekly period strings
 */
export function expandMonthToBiWeekly(month: string): string[] {
    const [year, monthNum] = month.split('-').map(Number);
    const startOfMonth = dayjs(`${year}-${monthNum}-01`);
    const endOfMonth = startOfMonth.endOf('month');

    const biWeeklyPeriods: string[] = [];
    const seenPeriods = new Set<string>();

    let current = startOfMonth;
    while (current.isBefore(endOfMonth) || current.isSame(endOfMonth, 'day')) {
        // Calculate bi-weekly period number (1-26 for a year, roughly)
        const dayOfYear = current.dayOfYear();
        const biWeekNumber = Math.ceil(dayOfYear / 14);
        const biWeekPeriod = `${year}-B${String(biWeekNumber).padStart(2, '0')}`;

        if (!seenPeriods.has(biWeekPeriod)) {
            biWeeklyPeriods.push(biWeekPeriod);
            seenPeriods.add(biWeekPeriod);
        }

        current = current.add(1, 'day');
    }

    return biWeeklyPeriods;
}

/**
 * Expand a date range into an array of daily periods
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Array of daily period strings
 */
export function expandDateRange(startDate: string, endDate: string): string[] {
    const start = dayjs(startDate);
    const end = dayjs(endDate);

    const dailyPeriods: string[] = [];
    let current = start;

    while (current.isBefore(end) || current.isSame(end, 'day')) {
        dailyPeriods.push(current.format('YYYY-MM-DD'));
        current = current.add(1, 'day');
    }

    return dailyPeriods;
}

/**
 * Parse a period string that may contain comma-separated periods
 * @param period - Period string (e.g., "2025-12-15,2025-12-16,2025-12-17")
 * @returns Array of individual period strings
 */
export function parsePeriodString(period: string): string[] {
    if (period.includes(',')) {
        return period.split(',').map(p => p.trim()).filter(p => p.length > 0);
    }
    return [period];
}

/**
 * Determine if a period string represents a date range (contains "to" or "..")
 * @param period - Period string
 * @returns Object with isRange flag and start/end dates if applicable
 */
export function parseDateRange(period: string): { isRange: boolean; start?: string; end?: string } {
    const rangeMatch = period.match(/^(\d{4}-\d{2}-\d{2})\s*(?:to|\.\.)\s*(\d{4}-\d{2}-\d{2})$/i);
    if (rangeMatch) {
        return {
            isRange: true,
            start: rangeMatch[1],
            end: rangeMatch[2]
        };
    }
    return { isRange: false };
}

/**
 * Expand a period string based on employee's salary period type
 * @param period - Period string (e.g., "2025-12", "2025-12-15", "2025-W03,2025-W04")
 * @param salaryPeriod - Employee's salary period type
 * @returns Array of period strings to generate salaries for
 */
export function expandPeriodForSalaryType(
    period: string,
    salaryPeriod: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'custom'
): string[] {
    // Handle comma-separated periods
    const periods = parsePeriodString(period);

    // If multiple periods provided, return them as-is (already expanded)
    if (periods.length > 1) {
        return periods;
    }

    const singlePeriod = periods[0];

    // Check if it's a date range
    const rangeInfo = parseDateRange(singlePeriod);
    if (rangeInfo.isRange && rangeInfo.start && rangeInfo.end) {
        return expandDateRange(rangeInfo.start, rangeInfo.end);
    }

    // Check if it's a monthly format (YYYY-MM)
    const isMonthlyFormat = /^\d{4}-\d{2}$/.test(singlePeriod);

    if (isMonthlyFormat) {
        // Expand monthly period based on salary type
        switch (salaryPeriod) {
            case 'daily':
                return expandMonthToDaily(singlePeriod);
            case 'weekly':
                return expandMonthToWeekly(singlePeriod);
            case 'bi-weekly':
                return expandMonthToBiWeekly(singlePeriod);
            case 'monthly':
                return [singlePeriod]; // No expansion needed
            case 'custom':
                // For custom, we'd need the start dates within the month
                // For now, return the month as-is (can be enhanced later)
                return [singlePeriod];
            default:
                return [singlePeriod];
        }
    }

    // Already a specific period (daily, weekly, etc.)
    return [singlePeriod];
}
