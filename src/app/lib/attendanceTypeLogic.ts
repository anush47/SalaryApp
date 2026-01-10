/**
 * Centralized Attendance Type Logic
 * 
 * This utility determines whether the next attendance mark should be "in" or "out"
 * based on the employee's last attendance record and 24-hour auto-checkout rules.
 * 
 * Rules:
 * 1. If no attendance record exists → IN
 * 2. If last record was OUT → IN
 * 3. If last record was IN and < 24 hours ago → OUT
 * 4. If last record was IN and >= 24 hours ago → IN (auto-checkout, missing OUT)
 */

export interface AttendanceRecord {
    type: "in" | "out";
    timestamp: Date | string;
}

export interface AttendanceTypeResult {
    nextType: "in" | "out";
    reason: "no_previous" | "last_was_out" | "last_was_in" | "auto_checkout_24h";
    lastAttendance?: AttendanceRecord;
    hoursSinceLastIn?: number;
}

/**
 * Determines the next attendance type based on the last attendance record
 * 
 * @param lastAttendance - The most recent attendance record for the employee (can be null/undefined)
 * @param currentTime - Optional current time for testing purposes (defaults to now)
 * @returns AttendanceTypeResult with next type and reasoning
 */
export function getNextAttendanceType(
    lastAttendance: AttendanceRecord | null | undefined,
    currentTime: Date = new Date()
): AttendanceTypeResult {
    // Case 1: No previous attendance → IN
    if (!lastAttendance) {
        return {
            nextType: "in",
            reason: "no_previous",
        };
    }

    // Case 2: Last was OUT → IN
    if (lastAttendance.type === "out") {
        return {
            nextType: "in",
            reason: "last_was_out",
            lastAttendance,
        };
    }

    // Case 3 & 4: Last was IN → check 24-hour rule
    const lastTimestamp = typeof lastAttendance.timestamp === 'string'
        ? new Date(lastAttendance.timestamp)
        : lastAttendance.timestamp;

    const hoursSinceLastIn = (currentTime.getTime() - lastTimestamp.getTime()) / (1000 * 60 * 60);

    // If >= 24 hours since last IN → consider it auto-checkout, next should be IN
    if (hoursSinceLastIn >= 24) {
        return {
            nextType: "in",
            reason: "auto_checkout_24h",
            lastAttendance,
            hoursSinceLastIn,
        };
    }

    // If < 24 hours since last IN → next should be OUT
    return {
        nextType: "out",
        reason: "last_was_in",
        lastAttendance,
        hoursSinceLastIn,
    };
}

/**
 * Helper to get a human-readable explanation of the attendance type decision
 */
export function getAttendanceTypeExplanation(result: AttendanceTypeResult): string {
    switch (result.reason) {
        case "no_previous":
            return "No previous attendance record found. Starting with IN.";
        case "last_was_out":
            return "Last attendance was OUT. Next mark will be IN.";
        case "last_was_in":
            return `Last attendance was IN ${result.hoursSinceLastIn?.toFixed(1)} hours ago. Next mark will be OUT.`;
        case "auto_checkout_24h":
            return `Last attendance was IN ${result.hoursSinceLastIn?.toFixed(1)} hours ago (>24h). Auto-checkout applied. Next mark will be IN.`;
        default:
            return "Unknown reason";
    }
}
