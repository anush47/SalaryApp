import dayjs from "dayjs";

/**
 * Formats a salary period string into a human-readable label.
 * Supports:
 * - Monthly: YYYY-MM -> "January 2025"
 * - Daily: YYYY-MM-DD -> "Jan 01, 2025"
 * - Weekly: YYYY-Www -> "Week 05, 2025"
 * - Bi-Weekly: YYYY-Bww -> "Bi-Week 05, 2025"
 */
export const formatPeriodLabel = (period: string): string => {
    if (!period) return "";

    // Monthly: YYYY-MM
    if (/^\d{4}-\d{2}$/.test(period)) {
        return dayjs(period).format("MMMM YYYY");
    }

    // Daily: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
        return dayjs(period).format("MMM DD, YYYY");
    }

    // Weekly: YYYY-Www
    const weeklyMatch = period.match(/^(\d{4})-W(\d{2})$/);
    if (weeklyMatch) {
        return `Week ${weeklyMatch[2]}, ${weeklyMatch[1]}`;
    }

    // Bi-Weekly: YYYY-Bww
    const biWeeklyMatch = period.match(/^(\d{4})-B(\d{2})$/);
    if (biWeeklyMatch) {
        return `Bi-Week ${biWeeklyMatch[2]}, ${biWeeklyMatch[1]}`;
    }

    // Fallback
    return period;
};
