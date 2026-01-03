import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { getAttendanceLogs } from "@/app/lib/api/attendanceApi";
import { fetchLeaveRequests } from "@/app/lib/api/leaveRequestApi";
import { getShiftAssignments, getActiveShift } from "@/app/lib/api/shiftsApi";
import { getHolidays } from "@/app/lib/api/holidaysApi"; // Implemented
import { fetchEmployee } from "@/app/lib/api/employeeApi";
import { fetchCompany } from "@/app/lib/api/companyApi";

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
    leaveStatus?: 'Full' | 'Half-Morning' | 'Half-Afternoon' | 'Short';
    leaveType?: string;
    leaveReason?: string;
    leaveColor?: string;
    leaveId?: string;

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
    endDate: string
) => {
    // 1. Fetch All Required Data in Parallel
    const { data: logsData, isLoading: loadingLogs } = useQuery({
        queryKey: ["attendanceLogs", companyId, startDate, endDate],
        queryFn: () => getAttendanceLogs(companyId, undefined, startDate, endDate),
        enabled: !!companyId && !!startDate && !!endDate
    });

    const { data: leavesData, isLoading: loadingLeaves } = useQuery({
        queryKey: ["leaveRequestsAggregation", companyId, employeeId, startDate, endDate],
        queryFn: () => fetchLeaveRequests(companyId, {
            employeeId,
            startDate,
            endDate,
            status: "approved"
        }),
        enabled: !!companyId && !!employeeId
    });

    const { data: shiftsData, isLoading: loadingShifts } = useQuery({
        queryKey: ["shiftAssignmentsAggregation", employeeId, startDate, endDate],
        queryFn: () => getShiftAssignments(employeeId, startDate, endDate),
        enabled: !!employeeId
    });

    const { data: holidaysData, isLoading: loadingHolidays } = useQuery({
        queryKey: ["holidaysAggregation", startDate, endDate],
        queryFn: () => getHolidays(startDate, endDate),
        enabled: !!startDate
    });

    const { data: employeeData, isLoading: loadingEmployee } = useQuery({
        queryKey: ["employee", employeeId],
        queryFn: () => fetchEmployee(employeeId),
        enabled: !!employeeId
    });

    const { data: companyData, isLoading: loadingCompany } = useQuery({
        queryKey: ["company", companyId],
        queryFn: () => fetchCompany(companyId),
        enabled: !!companyId
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

            // A. Resolve Schedule
            let shiftExpected = {
                shiftId: null as string | null,
                name: "Standard",
                start: company.openHours?.start || "08:00",
                end: company.openHours?.end || "17:00",
                off: false
            };

            // 1. Shift Assignment (Highest Priority)
            const assignment = shiftAssignments.find((s: any) => s.date === dateStr);
            if (assignment) {
                if (assignment.isOffDay) {
                    shiftExpected.off = true;
                    shiftExpected.name = "Off Day (Assigned)";
                } else if (assignment.shiftId) {
                    const shiftDef = allShifts.find((s: any) => s._id === assignment.shiftId || s.id === assignment.shiftId);
                    if (shiftDef) {
                        shiftExpected.shiftId = shiftDef._id;
                        shiftExpected.name = shiftDef.name;
                        shiftExpected.start = shiftDef.startTime;
                        shiftExpected.end = shiftDef.endTime;
                    }
                }
            } else {
                // 2. Employee Default
                const workDayConfig = employee.workingDays?.[dayOfWeek] || company.workingDays?.[dayOfWeek] || "full";
                if (workDayConfig === "off") {
                    shiftExpected.off = true;
                    shiftExpected.name = "Off Day";
                } else {
                    const defaultShiftId = employee.shiftSettings?.defaultShiftId || company.shiftSettings?.defaultShiftId;
                    if (defaultShiftId) {
                        const shiftDef = allShifts.find((s: any) => s._id === defaultShiftId);
                        if (shiftDef) {
                            shiftExpected.shiftId = shiftDef._id;
                            shiftExpected.name = shiftDef.name;
                            shiftExpected.start = shiftDef.startTime;
                            shiftExpected.end = shiftDef.endTime;
                        }
                    }
                }
            }

            // B. Resolve Holiday
            const safeHolidays = holidays || [];
            const holiday = safeHolidays.find((h: any) => h.date === dateStr);
            const isHoliday = !!holiday;
            if (isHoliday) {
                shiftExpected.off = true;
            }

            // C. Match Attendance (Multiple Sessions)
            let isOvernight = false;
            const [sh, sm] = shiftExpected.start.split(':').map(Number);
            const [eh, em] = shiftExpected.end.split(':').map(Number);
            if (eh < sh || (eh === sh && em < sm)) {
                isOvernight = true;
            }

            // Find all logs for this 'shift day'
            // For standard days: all logs on this date.
            // For overnight: all logs on this date (start) until... next day end?
            // Simplifying assumption: Shift is mainly identified by Start Day.
            // Only consider IN punches started on this day.
            // And any OUT punches that follow them.

            // 1. Get all IN logs for this day
            const dayInLogs = employeeLogs.filter((l: any) =>
                l.type === 'in' && dayjs(l.timestamp).isSame(currentDate, 'day')
            );

            // 2. Form Sessions
            const sessions: {
                inLogId: string;
                outLogId?: string;
                checkInTime: string;
                checkOutTime?: string;
                inDeviceChange?: boolean;
                outDeviceChange?: boolean;
                durationMinutes: number;
            }[] = [];

            dayInLogs.forEach((inLog: any) => {
                // Find next OUT log
                const nextOut = employeeLogs.find((l: any) =>
                    l.type === 'out' &&
                    dayjs(l.timestamp).isAfter(dayjs(inLog.timestamp)) &&
                    // Ensure it's not grabbed by another IN log?
                    // We need strict sorting. Since logs are sorted ASC, find will get the *first* OUT after this IN.
                    // But we must ensure this OUT isn't belonging to a previous unclosed IN?
                    // Simple approach: Pair nearest OUT.
                    // Optimization: Remove used logs?
                    // Given `find` scans efficiently, let's assume valid pairs don't overlap strangely.
                    dayjs(l.timestamp).diff(dayjs(inLog.timestamp), 'hour') < 20 // Sanity limit
                );

                // Calculate duration
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

            // 3. Prevent Duplicate Usage of OUT logs?
            // If user did In -> In -> Out, both Ins might claim the same Out.
            // Better Logic: Iterate through sorted logs and statefully pair them.
            // Re-doing logic:
            const dayLogs = employeeLogs.filter((l: any) => {
                const t = dayjs(l.timestamp);
                // Broad Catch: Start Day 00:00 to Next Day 12:00 (for overnight)
                // Filter strictly by start day for IN, and subsequent for OUT.
                return t.isSame(currentDate, 'day') || (isOvernight && t.isSame(currentDate.add(1, 'day'), 'day') && t.hour() < 12);
            });

            // Allow override of filtering above - we use the full `employeeLogs` sorted list but search efficiently.

            // Correct Pairing Logic:
            // Filter all INs for this day.
            // For each IN, search for the *immediate next* OUT in the global sorted list `employeeLogs`.
            // Ensure that OUT hasn't been used? Or just strictly pairs (In -> Out).
            // Complication: In (8am) -> In (9am) -> Out (10am). Is 10am for 8am or 9am? Usually LIFO or FIFO?
            // Usually FIFO implies 8am is open, 9am is anomalous/interlaced.
            // Let's stick to: Each IN looks for the next OUT. If that OUT is closer to another IN, potential issue.
            // Robust pairing: Stack based.
            // But for this requirement, let's keep it simple: Find nearest OUT.
            // If multiple INs claim same OUT, we have overlapping sessions.
            // Let's stick to the `sessions` array generated above but filter duplicates/overlaps if needed.
            // Actually, if we just show ALL pairs found, it matches "show all pairs".

            // D. Resolve Leaves
            const relevantLeave = leaves.find((l: any) => {
                const lStart = dayjs(l.startDate).startOf('day');
                const lEnd = dayjs(l.endDate).endOf('day');
                return currentDate.isBetween(lStart, lEnd, 'day', '[]') && l.status === 'approved';
            });

            // E. Determine Final Status
            let status: DailyAttendanceRecord['status'] = 'Absent';
            let finalDuration = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
            let finalOT = 0;

            const firstSession = sessions[0]; // Earliest Int
            const lastSession = sessions[sessions.length - 1]; // Latest Out usage?
            // Actually we want the latest CHECK OUT time from any session.
            const lastCheckOutTime = sessions.map(s => s.checkOutTime).filter(t => t).sort().pop();
            const lastOutSession = sessions.find(s => s.checkOutTime === lastCheckOutTime);

            if (dayjs().isBefore(currentDate, 'day')) {
                status = 'Future';
            } else if (sessions.length > 0) {
                status = 'Present';
                // OT
                const expStart = dayjs(`${dateStr} ${shiftExpected.start}`);
                const expEnd = isOvernight
                    ? dayjs(`${dateStr} ${shiftExpected.end}`).add(1, 'day')
                    : dayjs(`${dateStr} ${shiftExpected.end}`);
                const expDuration = expEnd.diff(expStart, 'minute');

                if (finalDuration > expDuration) {
                    finalOT = finalDuration - expDuration;
                }
            } else if (relevantLeave) {
                status = 'Leave';
            } else if (isHoliday) {
                status = 'Holiday';
            } else if (shiftExpected.off) {
                status = 'Off';
            }

            // F. Use actual shift from IN record if available (overrides expected)
            let actualShiftName = shiftExpected.name;
            let actualShiftId = shiftExpected.shiftId;
            if (firstSession) {
                const firstInLog = employeeLogs.find((l: any) => l._id === firstSession.inLogId);
                if (firstInLog?.shift) {
                    actualShiftName = firstInLog.shift.name || firstInLog.shift.shiftName || shiftExpected.name;
                    actualShiftId = firstInLog.shift.shiftId || firstInLog.shift._id || shiftExpected.shiftId;
                }
            }

            records.push({
                date: dateStr,
                dayOfWeek: currentDate.format('dddd'),
                shiftId: actualShiftId || undefined,
                shiftName: actualShiftName,
                expectedStartTime: shiftExpected.off ? undefined : shiftExpected.start,
                expectedEndTime: shiftExpected.off ? undefined : shiftExpected.end,
                isOffDay: shiftExpected.off,
                isHoliday,
                holidayName: holiday?.summary,
                status,
                inLogId: firstSession?.inLogId,
                outLogId: lastOutSession?.outLogId,
                inDeviceChange: firstSession?.inDeviceChange,
                outDeviceChange: lastOutSession?.outDeviceChange,
                checkInTime: firstSession?.checkInTime, // Earliest IN
                checkOutTime: lastCheckOutTime, // Latest OUT
                durationMinutes: finalDuration,
                otMinutes: finalOT,
                leaveStatus: relevantLeave ? (relevantLeave.halfDay ? (relevantLeave.halfDayPeriod === 'morning' ? 'Half-Morning' : 'Half-Afternoon') : (relevantLeave.totalMinutes ? 'Short' : 'Full')) : undefined,
                leaveType: (relevantLeave?.leaveType as any)?.name,
                leaveReason: relevantLeave?.reason,
                leaveId: relevantLeave?._id,
                isOvernightShift: isOvernight,
                requiresAttention: status === 'Absent' || (status === 'Present' && sessions.some(s => !s.checkOutTime && dayjs().diff(dayjs(s.checkInTime), 'hour') > 12)),
                sessions: sessions // Pass sessions to UI
            });


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
