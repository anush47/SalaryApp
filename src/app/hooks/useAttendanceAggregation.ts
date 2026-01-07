import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { getAttendanceLogs } from "@/app/lib/api/attendanceApi";
import { fetchLeaveRequests } from "@/app/lib/api/leaveRequestApi";
import { getShiftAssignments, getActiveShift } from "@/app/lib/api/shiftsApi";
import { getHolidays } from "@/app/lib/api/holidaysApi"; // Implemented
import { fetchEmployee } from "@/app/lib/api/employeeApi";
import { fetchCompany } from "@/app/lib/api/companyApi";
import { calculateOT, calculateEffectiveDuration } from "@/app/lib/utils/attendanceUtils";

dayjs.extend(isBetween);

export interface DailyAttendanceRecord {
    date: string; // YYYY-MM-DD
    dayOfWeek: string;

    // Schedule Integration
    shiftId?: string;
    shiftName: string;
    expectedStartTime?: string;
    expectedEndTime?: string;
    isOffDay: boolean;
    isHoliday: boolean;
    holidayName?: string;

    // Attendance Data
    status: 'Present' | 'Absent' | 'Leave' | 'Off' | 'Holiday' | 'Future' | 'Half Day';
    checkInTime?: string;
    checkInLocation?: string;
    checkOutTime?: string;
    checkOutLocation?: string;
    durationMinutes: number;
    otMinutes: number;

    // Leave Data
    leaveStatus?: 'Full' | 'Half-First' | 'Half-Final' | 'Short';
    leaveType?: string;
    leaveReason?: string;
    leaveColor?: string;
    leaveId?: string;

    // Flags
    isLate?: boolean;
    isLeftEarly?: boolean;
    isLessHours?: boolean;

    // Metadata
    inLogId?: string;
    outLogId?: string;
    inDeviceChange?: boolean;
    outDeviceChange?: boolean;
    resolutionMode?: string;
    isOvernightShift: boolean;
    requiresAttention: boolean;
    remarks?: string;

    // Multiple Sessions Support
    sessions?: {
        inLogId: string;
        outLogId?: string;
        checkInTime: string;
        checkOutTime?: string;
        inDeviceChange?: boolean;
        outDeviceChange?: boolean;
        durationMinutes: number;
    }[];
}

export const useAttendanceAggregation = (
    employeeId: string,
    companyId: string,
    startDate: string,
    endDate: string,
    enabled: boolean = true
) => {
    // 1. Fetch All Required Data in Parallel
    const { data: logsData, isLoading: loadingLogs } = useQuery({
        queryKey: ["attendanceLogs", companyId, startDate, endDate],
        queryFn: () => getAttendanceLogs(companyId, undefined, startDate, endDate),
        enabled: enabled && !!companyId && !!startDate && !!endDate
    });

    const { data: leavesData, isLoading: loadingLeaves } = useQuery({
        queryKey: ["leaveRequestsAggregation", companyId, employeeId, startDate, endDate],
        queryFn: () => fetchLeaveRequests(companyId, {
            employeeId,
            startDate,
            endDate,
            status: "approved"
        }),
        enabled: enabled && !!companyId && !!employeeId
    });

    const { data: shiftsData, isLoading: loadingShifts } = useQuery({
        queryKey: ["shiftAssignmentsAggregation", employeeId, startDate, endDate],
        queryFn: () => getShiftAssignments(employeeId, startDate, endDate),
        enabled: enabled && !!employeeId
    });

    const { data: holidaysData, isLoading: loadingHolidays } = useQuery({
        queryKey: ["holidaysAggregation", startDate, endDate],
        queryFn: () => getHolidays(startDate, endDate),
        enabled: enabled && !!startDate
    });

    const { data: employeeData, isLoading: loadingEmployee } = useQuery({
        queryKey: ["employee", employeeId],
        queryFn: () => fetchEmployee(employeeId),
        enabled: enabled && !!employeeId
    });

    const { data: companyData, isLoading: loadingCompany } = useQuery({
        queryKey: ["company", companyId],
        queryFn: () => fetchCompany(companyId),
        enabled: enabled && !!companyId
    });


    // 2. Aggregation Logic
    const aggregateRecords = () => {
        if (!employeeData || !companyData) return [];

        const employee = employeeData;
        const company = companyData;

        const logs = logsData?.success ? logsData.data : [];
        const leaves = leavesData?.data || [];
        const shiftAssignments = shiftsData?.success ? shiftsData.data : [];
        const holidays = holidaysData?.success ? holidaysData.data : [];

        // --- Device Change Logic ---
        const normalizeId = (id: any) => id ? String(id._id || id) : "";
        const targetEmpId = normalizeId(employee);

        // Sort logs by time ASC for correct chronological pairing
        const sortedLogs = [...logs].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        // Filter for this employee
        const employeeLogs = sortedLogs.filter((l: any) => normalizeId(l.employee) === targetEmpId);

        const deviceChangeMap: Record<string, boolean> = {};
        let lastDevice = null as string | null;
        employeeLogs.forEach((log: any) => {
            const currentDevice = log.deviceId || null;
            if (lastDevice && currentDevice && lastDevice !== currentDevice) {
                deviceChangeMap[log._id] = true;
            }
            if (currentDevice) {
                lastDevice = currentDevice;
            }
        });
        // ---------------------------

        const records: DailyAttendanceRecord[] = [];
        let currentDate = dayjs(startDate);
        const end = dayjs(endDate);

        const companyShifts = company.shiftSettings?.shifts || [];
        const employeeShifts = employee.shiftSettings?.shifts || [];
        const allShifts = [...companyShifts, ...employeeShifts];

        while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
            const dateStr = currentDate.format("YYYY-MM-DD");
            const dayOfWeek = currentDate.format("ddd").toLowerCase();

            // 1. Identify "Active Shifts" for this day
            // Sources:
            // a. Shift Assignments
            // b. Shift IDs found in logs
            // c. Default Shift (if no assignments)

            const activeShiftIds = new Set<string>();
            const dailyAssignments = shiftAssignments.filter((s: any) => s.date === dateStr);

            // Collect from Assignments
            if (dailyAssignments.length > 0) {
                dailyAssignments.forEach((a: any) => {
                    if (a.shiftId) activeShiftIds.add(a.shiftId);
                });
            }

            // Collect from Logs (if log has shift populated)
            const dayLogsGeneric = employeeLogs.filter((l: any) => dayjs(l.timestamp).isSame(currentDate, 'day'));

            dayLogsGeneric.forEach((l: any) => {
                const sId = l.shift?.shiftId || l.shift?._id || l.shift; // Support embedded shiftId, _id or raw ID string
                if (sId && typeof sId === 'string') {
                    activeShiftIds.add(sId);
                }
            });

            // Fallback to Default if Empty
            if (activeShiftIds.size === 0 && dailyAssignments.length === 0) {
                // Check if Off Day by default
                const workDayConfig = employee.workingDays?.[dayOfWeek] || company.workingDays?.[dayOfWeek] || "full";
                if (workDayConfig !== "off") {
                    const defaultShiftId = employee.shiftSettings?.defaultShiftId || company.shiftSettings?.defaultShiftId;
                    if (defaultShiftId) activeShiftIds.add(defaultShiftId);
                }
            }

            // If still empty (Off day with no logs), we might want one "Off" record?
            // Or if assignments explicitly say "Off".
            const isExplicitOff = dailyAssignments.some((a: any) => a.isOffDay);
            const workDayConfig = employee.workingDays?.[dayOfWeek] || company.workingDays?.[dayOfWeek] || "full";
            const isDefaultOff = workDayConfig === "off";

            let shiftsToProcess = Array.from(activeShiftIds);

            // Verify if we have shifts to process. If 0, and it's an Off Day, process a dummy "Off" shift?
            if (shiftsToProcess.length === 0) {
                // Create one record for "Off" or "Standard" (missing shift)
                shiftsToProcess.push("default");
            }

            // Sort shifts chronologically by expected start time
            shiftsToProcess.sort((a, b) => {
                const getStartTime = (id: string) => {
                    if (id === "default") return company.openHours?.start || "08:00";
                    const def = allShifts.find((s: any) => s._id === id || s.shiftId === id || s.id === id);
                    return def?.startTime || "08:00";
                };
                return getStartTime(a).localeCompare(getStartTime(b));
            });

            for (const shiftId of shiftsToProcess) {
                // A. Resolve Shift Definition
                let shiftExpected = {
                    shiftId: shiftId === "default" ? null : shiftId,
                    name: "Standard",
                    start: company.openHours?.start || "08:00",
                    end: company.openHours?.end || "17:00",
                    off: false,
                    breakDuration: 60 // Default break
                };

                if (shiftId && shiftId !== "default") {
                    const shiftDef = allShifts.find((s: any) => s._id === shiftId || s.id === shiftId || s.shiftId === shiftId);
                    if (shiftDef) {
                        shiftExpected.name = shiftDef.name;
                        shiftExpected.start = shiftDef.startTime;
                        shiftExpected.end = shiftDef.endTime;
                        const val = Number(shiftDef.breakDuration);
                        // Heuristic: If <= 12, assume Hours and convert to Minutes. If > 12, assume Minutes.
                        // If 0 or NaN, default to 60 minutes.
                        if (val > 0) {
                            shiftExpected.breakDuration = val <= 12 ? val * 60 : val;
                        } else {
                            shiftExpected.breakDuration = 60;
                        }
                    }
                }

                // Overnight Detection
                let isOvernight = false;
                const [sh, sm] = shiftExpected.start.split(':').map(Number);
                const [eh, em] = shiftExpected.end.split(':').map(Number);
                if (eh < sh || (eh === sh && em < sm)) {
                    isOvernight = true;
                }

                // Check Off Status specific to this scope
                if (isExplicitOff || (shiftsToProcess.length === 1 && shiftsToProcess[0] === "default" && isDefaultOff)) {
                    shiftExpected.off = true;
                    shiftExpected.name = isExplicitOff ? "Off Day (Assigned)" : "Off Day";
                }

                // B. Resolve Holiday
                const safeHolidays = holidays || [];
                const holiday = safeHolidays.find((h: any) => h.date === dateStr);
                const isHoliday = !!holiday;
                if (isHoliday) {
                    shiftExpected.off = true; // Holiday works like Off
                }

                // C. Match Attendance
                const shiftInLogs = dayLogsGeneric.filter((l: any) => {
                    const logShiftId = l.shift?.shiftId || l.shift?._id || l.shift;
                    const isUnassigned = !l.shift;
                    const matchesShift = typeof logShiftId === 'string' && logShiftId === shiftId;
                    const matchesDefault = isUnassigned && (shiftsToProcess.length === 1 || shiftId === shiftsToProcess[0]);

                    const isMatch = l.type === 'in' && (matchesShift || matchesDefault);

                    return isMatch;
                });

                // Form Sessions
                const sessions: {
                    inLogId: string;
                    outLogId?: string;
                    checkInTime: string;
                    checkOutTime?: string;
                    inDeviceChange?: boolean;
                    outDeviceChange?: boolean;
                    durationMinutes: number;
                }[] = [];

                shiftInLogs.forEach((inLog: any) => {
                    // Find next OUT log
                    // Constraint: Must be after IN, and presumably same shift?
                    // If OUT log has shiftId, it must match.
                    const nextOut = employeeLogs.find((l: any) => {
                        const logShiftId = l.shift?.shiftId || l.shift?._id || l.shift;
                        return l.type === 'out' &&
                            dayjs(l.timestamp).isAfter(dayjs(inLog.timestamp)) &&
                            (
                                (!l.shift && (shiftsToProcess.length === 1 || shiftId === shiftsToProcess[0])) ||
                                (logShiftId === shiftId)
                            ) &&
                            dayjs(l.timestamp).diff(dayjs(inLog.timestamp), 'hour') < 20 // Sanity
                    });

                    let duration = 0;
                    if (nextOut) {
                        duration = dayjs(nextOut.timestamp).diff(dayjs(inLog.timestamp), 'minute');
                    }

                    sessions.push({
                        inLogId: inLog._id,
                        outLogId: nextOut?._id,
                        checkInTime: inLog.timestamp,
                        checkOutTime: nextOut?.timestamp,
                        inDeviceChange: deviceChangeMap[inLog._id],
                        outDeviceChange: nextOut ? deviceChangeMap[nextOut._id] : false,
                        durationMinutes: duration
                    });
                });

                // D. Resolve Leaves
                // Linking leaves to shifts is complex if granular. 
                // For now, check if ANY leave covers this day.

                const relevantLeave = leaves.find((l: any) => {
                    const start = dayjs(l.startDate).startOf('day');
                    const end = dayjs(l.endDate).endOf('day');
                    // Overlap check
                    return currentDate.isBetween(start, end, 'day', '[]');
                });

                // Status Calculation
                let status: DailyAttendanceRecord['status'] = 'Absent';
                let requiresAttention = false;

                if (sessions.length > 0) {
                    status = 'Present';
                    // Check for missing outs
                    const hasMissingOut = sessions.some(s => !s.checkOutTime && dayjs().diff(dayjs(s.checkInTime), 'hour') > 12);
                    if (hasMissingOut) requiresAttention = true;
                } else {
                    if (shiftExpected.off) status = 'Off';
                    if (isHoliday) status = 'Holiday';
                    if (relevantLeave) status = 'Leave';
                    if (dayjs().isBefore(dayjs(dateStr + "T" + shiftExpected.end))) status = 'Future';
                    if (dayjs().isSame(dayjs(dateStr), 'day') && status === 'Absent') status = 'Future'; // Today pending

                    // Past absence requires attention
                    if (status === 'Absent') {
                        const shiftEnd = dayjs(`${dateStr} ${shiftExpected.end}`);
                        const finalEnd = isOvernight ? shiftEnd.add(1, 'day') : shiftEnd;
                        if (dayjs().isAfter(finalEnd)) requiresAttention = true;
                    }
                }

                // If multiple shifts, maybe only mark "Absent" if ALL missed? 
                // No, missed shift is absent.

                const totalDuration = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

                // Get useShiftStartForOT Flag
                const useShiftStartForOT = employee.shiftSettings?.useShiftStartForOT ?? company.shiftSettings?.useShiftStartForOT ?? false;

                // Calculate Effective Duration for OT
                // We reconstruct sessions objects for the util (needs Date objects)
                const utilSessions = sessions.map(s => ({
                    in: new Date(s.checkInTime),
                    out: s.checkOutTime ? new Date(s.checkOutTime) : undefined
                }));

                const effectiveDurationForOT = calculateEffectiveDuration(
                    utilSessions,
                    shiftExpected.start,
                    useShiftStartForOT,
                    company.timezone || "Asia/Colombo"
                );

                // Check Half Day status for OT Calculation
                // Is Half Day if:
                // 1. Status is explicitly 'Half Day' (if we supported that enum directly)
                // 2. OR Relevant Leave is Half Day
                let isHalfDayForOT = false;
                if (relevantLeave && (relevantLeave.halfDay || (relevantLeave.leaveType as any)?.name?.toLowerCase().includes('half'))) {
                    isHalfDayForOT = true;
                }

                // Determine effective status for OT (Full, Half, Off, Holiday)
                let currentStatus = "Full Day";
                if (isHalfDayForOT) currentStatus = "Half Day";
                else if (shiftExpected.off) currentStatus = "Off";
                else if (isHoliday) currentStatus = "Holiday";

                // Standardized OT Calculation
                const otMinutes = calculateOT(
                    effectiveDurationForOT,
                    shiftExpected.breakDuration || 60, // Default 60 if not set
                    currentStatus
                );

                const firstSession = sessions[0];
                let isLate = false;
                if (firstSession && firstSession.checkInTime && shiftExpected.start) {
                    const checkIn = dayjs(firstSession.checkInTime);
                    const expectedStart = dayjs(`${dateStr} ${shiftExpected.start}`);

                    // Consider Late if check-in is AFTER expected start + 1 min grace
                    // If expected start is 08:00, checkin is 08:02 -> Late.
                    if (checkIn.isAfter(expectedStart.add(1, 'minute'))) {
                        isLate = true;
                    }
                }

                const lastCheckOutTime = sessions.map(s => s.checkOutTime).filter(t => t).sort().pop();
                const lastOutSession = sessions.find(s => s.checkOutTime === lastCheckOutTime);

                let isLeftEarly = false;
                if (lastCheckOutTime && shiftExpected.end && !relevantLeave) {
                    // Calculate Shift End Date Time
                    const [eh, em] = shiftExpected.end.split(':').map(Number);
                    let expectedEnd = dayjs(dateStr).hour(eh).minute(em).second(0);

                    if (isOvernight) {
                        expectedEnd = expectedEnd.add(1, 'day');
                    }

                    const checkOut = dayjs(lastCheckOutTime);

                    // Consider Left Early if check-out is BEFORE expected end - 5 mins buffer
                    if (checkOut.isBefore(expectedEnd.subtract(5, 'minute'))) {
                        isLeftEarly = true;
                    }
                }

                // Less Hours Calculation
                let isLessHours = false;
                if (status === 'Present') {
                    const isHalfDay = relevantLeave && (relevantLeave.halfDay || (relevantLeave.leaveType as any)?.name?.toLowerCase().includes('half'));

                    // Thresholds: Full = 8h (480m), Half = 5h (300m)
                    if (isHalfDay) {
                        if (totalDuration < 300) isLessHours = true;
                    } else {
                        // Full Day
                        if (totalDuration < 480) isLessHours = true;
                    }
                }

                records.push({
                    date: dateStr,
                    dayOfWeek: currentDate.format('dddd'),
                    shiftId: shiftExpected.shiftId || undefined,
                    shiftName: shiftExpected.name,
                    expectedStartTime: shiftExpected.start,
                    expectedEndTime: shiftExpected.end,
                    isOffDay: shiftExpected.off,
                    isHoliday,
                    holidayName: holiday?.summary,
                    status,
                    inLogId: firstSession?.inLogId,
                    outLogId: lastOutSession?.outLogId,
                    inDeviceChange: firstSession?.inDeviceChange,
                    outDeviceChange: lastOutSession?.outDeviceChange,
                    checkInTime: firstSession?.checkInTime,
                    checkOutTime: lastCheckOutTime,
                    // Use Effective Duration if configuration is enabled, otherwise Total Duration
                    durationMinutes: useShiftStartForOT ? effectiveDurationForOT : totalDuration,
                    otMinutes,
                    leaveStatus: relevantLeave ? (relevantLeave.halfDay ? (relevantLeave.halfDayPeriod === 'first_half' ? 'Half-First' : 'Half-Final') : (relevantLeave.totalMinutes ? 'Short' : 'Full')) : undefined,
                    leaveType: (relevantLeave?.leaveType as any)?.name,
                    leaveReason: relevantLeave?.reason,
                    leaveId: relevantLeave?._id,
                    isOvernightShift: false, // simplified
                    requiresAttention,
                    isLate,
                    isLeftEarly,
                    isLessHours,
                    sessions
                });
            }

            currentDate = currentDate.add(1, 'day');
        }

        return records;
    };

    const aggregatedRecords = aggregateRecords();

    // Calculate Summary Stats
    const stats = {
        totalDays: aggregatedRecords.length,
        workedDays: aggregatedRecords.filter(r => r.status === 'Present').length,
        leaves: aggregatedRecords.filter(r => r.status === 'Leave').length,
        absent: aggregatedRecords.filter(r => r.status === 'Absent').length,
        totalHours: Math.floor(aggregatedRecords.reduce((acc, curr) => acc + curr.durationMinutes, 0) / 60),
        totalOT: Math.floor(aggregatedRecords.reduce((acc, curr) => acc + curr.otMinutes, 0) / 60)
    };

    return {
        records: aggregatedRecords,
        stats,
        loading: loadingLogs || loadingLeaves || loadingShifts || loadingHolidays || loadingEmployee || loadingCompany
    };
};
