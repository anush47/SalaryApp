import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { getAttendanceLogs } from "@/app/lib/api/attendanceApi";
import { fetchLeaveRequests } from "@/app/lib/api/leaveRequestApi";
import { getShiftAssignments } from "@/app/lib/api/shiftsApi";
import { getHolidays } from "@/app/lib/api/holidaysApi";
import { fetchEmployee, fetchEmployees } from "@/app/lib/api/employeeApi";
import { fetchCompany } from "@/app/lib/api/companyApi";
import { calculateOT, calculateEffectiveDuration } from "@/app/lib/utils/attendanceUtils";
import { getEffectiveShiftSettings, getEffectiveWorkingDays } from "@/app/lib/utils/overrides";

dayjs.extend(isBetween);

export interface DailyAttendanceRecord {
    date: string; // YYYY-MM-DD
    dayOfWeek: string;
    employee?: {
        _id: string;
        name: string;
        memberNo?: string;
    };

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

    // Status & Verification Flags
    inStatus?: string;
    outStatus?: string;
    inVerified?: boolean;
    outVerified?: boolean;

    // Multiple Sessions Support
    sessions?: {
        inLogId: string;
        outLogId?: string;
        checkInTime: string;
        checkOutTime?: string;
        inDeviceChange?: boolean;
        outDeviceChange?: boolean;
        inVerified?: boolean;
        outVerified?: boolean;
        inStatus?: string;
        outStatus?: string;
        durationMinutes: number;
    }[];
}

export const calculateAttendanceForEmployee = (
    employee: any,
    company: any,
    logs: any[],
    leaves: any[],
    shiftAssignments: any[],
    holidays: any[],
    startDate: string,
    endDate: string
): DailyAttendanceRecord[] => {
    if (!employee || !company) return [];

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

    const records: DailyAttendanceRecord[] = [];
    let currentDate = dayjs(startDate);
    const end = dayjs(endDate);

    const shiftSettings = getEffectiveShiftSettings(company, employee);
    const allShifts = shiftSettings?.shifts || [];

    while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
        const dateStr = currentDate.format("YYYY-MM-DD");
        const dayOfWeek = currentDate.format("ddd").toLowerCase();

        const activeShiftIds = new Set<string>();
        const dailyAssignments = shiftAssignments.filter((s: any) => normalizeId(s.employee) === targetEmpId && s.date === dateStr);

        if (dailyAssignments.length > 0) {
            dailyAssignments.forEach((a: any) => {
                if (a.shiftId) activeShiftIds.add(a.shiftId);
            });
        }

        const dayLogsGeneric = employeeLogs.filter((l: any) => dayjs(l.timestamp).isSame(currentDate, 'day'));

        dayLogsGeneric.forEach((l: any) => {
            const sId = l.shift?.shiftId || l.shift?._id || l.shift;
            if (sId && typeof sId === 'string') {
                activeShiftIds.add(sId);
            }
        });

        if (activeShiftIds.size === 0 && dailyAssignments.length === 0) {
            const effectiveWorkingDays = getEffectiveWorkingDays(company, employee);
            const workDayConfig = effectiveWorkingDays?.[dayOfWeek] || "full";
            if (workDayConfig !== "off") {
                const defaultShiftId = shiftSettings?.defaultShiftId;
                if (defaultShiftId) activeShiftIds.add(defaultShiftId);
            }
        }

        const isExplicitOff = dailyAssignments.some((a: any) => a.isOffDay);
        const effectiveWorkingDays = getEffectiveWorkingDays(company, employee);
        const workDayConfig = effectiveWorkingDays?.[dayOfWeek] || "full";
        const isDefaultOff = workDayConfig === "off";

        let shiftsToProcess = Array.from(activeShiftIds);

        if (shiftsToProcess.length === 0) {
            shiftsToProcess.push("default");
        }

        shiftsToProcess.sort((a, b) => {
            const getStartTime = (id: string) => {
                if (id === "default") return company.openHours?.start || "08:00";
                const def = allShifts.find((s: any) => s._id === id || s.shiftId === id || s.id === id);
                return def?.startTime || "08:00";
            };
            return getStartTime(a).localeCompare(getStartTime(b));
        });

        for (const shiftId of shiftsToProcess) {
            let shiftExpected = {
                shiftId: shiftId === "default" ? null : shiftId,
                name: "Standard",
                start: company.openHours?.start || "08:00",
                end: company.openHours?.end || "17:00",
                off: false,
                breakDuration: 60
            };

            if (shiftId && shiftId !== "default") {
                const shiftDef = allShifts.find((s: any) => s._id === shiftId || s.id === shiftId || s.shiftId === shiftId);
                if (shiftDef) {
                    shiftExpected.name = shiftDef.name;
                    shiftExpected.start = shiftDef.startTime;
                    shiftExpected.end = shiftDef.endTime;
                    const val = Number(shiftDef.breakDuration);
                    if (val > 0) {
                        shiftExpected.breakDuration = val <= 12 ? val * 60 : val;
                    } else {
                        shiftExpected.breakDuration = 60;
                    }
                }
            }

            let isOvernight = false;
            const [sh, sm] = shiftExpected.start.split(':').map(Number);
            const [eh, em] = shiftExpected.end.split(':').map(Number);
            if (eh < sh || (eh === sh && em < sm)) {
                isOvernight = true;
            }

            if (isExplicitOff || (shiftsToProcess.length === 1 && shiftsToProcess[0] === "default" && isDefaultOff)) {
                shiftExpected.off = true;
                shiftExpected.name = isExplicitOff ? "Off Day (Assigned)" : "Off Day";
            }

            const safeHolidays = holidays || [];
            const holiday = safeHolidays.find((h: any) => h.date === dateStr);
            const isHoliday = !!holiday;
            if (isHoliday) {
                shiftExpected.off = true;
            }

            const shiftInLogs = dayLogsGeneric.filter((l: any) => {
                const logShiftId = l.shift?.shiftId || l.shift?._id || l.shift;
                const matchesShift = typeof logShiftId === 'string' && logShiftId === shiftId;
                const matchesDefault = !l.shift && (shiftsToProcess.length === 1 || shiftId === shiftsToProcess[0]);
                return l.type === 'in' && (matchesShift || matchesDefault);
            });

            const sessions: any[] = [];
            shiftInLogs.forEach((inLog: any) => {
                const nextOut = employeeLogs.find((l: any) => {
                    const logShiftId = l.shift?.shiftId || l.shift?._id || l.shift;
                    return l.type === 'out' &&
                        dayjs(l.timestamp).isAfter(dayjs(inLog.timestamp)) &&
                        (
                            (!l.shift && (shiftsToProcess.length === 1 || shiftId === shiftsToProcess[0])) ||
                            (logShiftId === shiftId)
                        ) &&
                        dayjs(l.timestamp).diff(dayjs(inLog.timestamp), 'hour') < 20;
                });

                let duration = 0;
                if (nextOut) {
                    duration = dayjs(nextOut.timestamp).diff(dayjs(inLog.timestamp), 'minute');
                }

                sessions.push({
                    id: inLog._id, // Stable ID
                    inLogId: inLog._id,
                    outLogId: nextOut?._id,
                    checkInTime: inLog.timestamp,
                    checkOutTime: nextOut?.timestamp,
                    inDeviceChange: deviceChangeMap[inLog._id],
                    outDeviceChange: nextOut ? deviceChangeMap[nextOut._id] : false,
                    inVerified: inLog.location?.isVerified,
                    outVerified: nextOut?.location?.isVerified,
                    inStatus: inLog.status,
                    outStatus: nextOut?.status,
                    durationMinutes: duration
                });
            });

            const relevantLeave = leaves.find((l: any) => {
                const start = dayjs(l.startDate).startOf('day');
                const end = dayjs(l.endDate).endOf('day');
                return normalizeId(l.employee) === targetEmpId && currentDate.isBetween(start, end, 'day', '[]');
            });

            let status: DailyAttendanceRecord['status'] = 'Absent';
            let requiresAttention = false;

            if (sessions.length > 0) {
                status = 'Present';
                const hasMissingOut = sessions.some(s => !s.checkOutTime && dayjs().diff(dayjs(s.checkInTime), 'hour') > 12);
                if (hasMissingOut) requiresAttention = true;
            } else {
                if (shiftExpected.off) status = 'Off';
                if (isHoliday) status = 'Holiday';
                if (relevantLeave) status = 'Leave';
                if (dayjs().isBefore(dayjs(dateStr + "T" + shiftExpected.end))) status = 'Future';
                if (dayjs().isSame(dayjs(dateStr), 'day') && status === 'Absent') status = 'Future';

                if (status === 'Absent') {
                    const shiftEnd = dayjs(`${dateStr} ${shiftExpected.end}`);
                    const finalEnd = isOvernight ? shiftEnd.add(1, 'day') : shiftEnd;
                    if (dayjs().isAfter(finalEnd)) requiresAttention = true;
                }
            }

            const totalDuration = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
            const useShiftStartForOT = shiftSettings?.useShiftStartForOT ?? false;

            const utilSessions = sessions.map(s => {
                let outTime = s.checkOutTime ? new Date(s.checkOutTime) : undefined;
                // Fix: If session is open for > 24 hours, do not count it towards OT/Work duration
                // treat it as 0 duration by setting out = in
                if (!outTime && dayjs().diff(dayjs(s.checkInTime), 'hour') > 24) {
                    outTime = new Date(s.checkInTime);
                }
                return {
                    in: new Date(s.checkInTime),
                    out: outTime
                };
            });

            const effectiveDurationForOT = calculateEffectiveDuration(
                utilSessions,
                shiftExpected.start,
                useShiftStartForOT,
                company.timezone || "Asia/Colombo"
            );

            let isHalfDayForOT = false;
            if (relevantLeave && (relevantLeave.halfDay || (relevantLeave.leaveType as any)?.name?.toLowerCase().includes('half'))) {
                isHalfDayForOT = true;
            }

            let currentStatus = "Full Day";
            if (isHalfDayForOT) currentStatus = "Half Day";
            else if (shiftExpected.off) currentStatus = "Off";
            else if (isHoliday) currentStatus = "Holiday";

            const otMinutes = calculateOT(
                effectiveDurationForOT,
                shiftExpected.breakDuration || 60,
                currentStatus
            );

            const firstSession = sessions[0];
            let isLate = false;
            if (firstSession && firstSession.checkInTime && shiftExpected.start) {
                const checkIn = dayjs(firstSession.checkInTime);
                const expectedStart = dayjs(`${dateStr} ${shiftExpected.start}`);
                if (checkIn.isAfter(expectedStart.add(1, 'minute'))) {
                    isLate = true;
                }
            }

            const lastCheckOutTime = sessions.map(s => s.checkOutTime).filter(t => t).sort().pop();
            const lastOutSession = sessions.find(s => s.checkOutTime === lastCheckOutTime);

            let isLeftEarly = false;
            if (lastCheckOutTime && shiftExpected.end && !relevantLeave) {
                const [eh, em] = shiftExpected.end.split(':').map(Number);
                let expectedEnd = dayjs(dateStr).hour(eh).minute(em).second(0);
                if (isOvernight) expectedEnd = expectedEnd.add(1, 'day');
                const checkOut = dayjs(lastCheckOutTime);
                if (checkOut.isBefore(expectedEnd.subtract(5, 'minute'))) {
                    isLeftEarly = true;
                }
            }

            let isLessHours = false;
            if (status === 'Present') {
                const isHalfDay = relevantLeave && (relevantLeave.halfDay || (relevantLeave.leaveType as any)?.name?.toLowerCase().includes('half'));
                if (isHalfDay) {
                    if (totalDuration < 300) isLessHours = true;
                } else {
                    if (totalDuration < 480) isLessHours = true;
                }
            }

            records.push({
                date: dateStr,
                dayOfWeek: currentDate.format('dddd'),
                employee: {
                    _id: employee._id,
                    name: employee.name,
                    memberNo: employee.memberNo
                },
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
                inVerified: firstSession?.inVerified,
                outVerified: lastOutSession?.outVerified,
                inStatus: firstSession?.inStatus,
                outStatus: lastOutSession?.outStatus,
                checkInTime: firstSession?.checkInTime,
                checkOutTime: lastCheckOutTime,
                durationMinutes: useShiftStartForOT ? effectiveDurationForOT : totalDuration,
                otMinutes,
                leaveStatus: relevantLeave ? (relevantLeave.halfDay ? (relevantLeave.halfDayPeriod === 'first_half' ? 'Half-First' : 'Half-Final') : (relevantLeave.totalMinutes ? 'Short' : 'Full')) : undefined,
                leaveType: (relevantLeave?.leaveType as any)?.name,
                leaveReason: relevantLeave?.reason,
                leaveId: relevantLeave?._id,
                isOvernightShift: isOvernight,
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



export const useAttendanceAggregation = (
    employeeId: string,
    companyId: string,
    startDate: string,
    endDate: string,
    enabled: boolean = true
) => {
    const { data: logsData, isLoading: loadingLogs, refetch: logsDataRefetch } = useQuery({
        queryKey: ["attendanceLogs", companyId, startDate, endDate],
        queryFn: () => getAttendanceLogs(companyId, undefined, startDate, endDate),
        enabled: enabled && !!companyId && !!startDate && !!endDate
    });

    const { data: leavesData, isLoading: loadingLeaves } = useQuery({
        queryKey: ["leaveRequestsAggregation", companyId, employeeId, startDate, endDate],
        queryFn: () => fetchLeaveRequests(companyId, {
            employeeId: employeeId || undefined,
            startDate,
            endDate,
            status: "approved"
        }),
        enabled: enabled && !!companyId && (!!employeeId || true)
    });

    const { data: shiftsData, isLoading: loadingShifts } = useQuery({
        queryKey: ["shiftAssignmentsAggregation", employeeId, startDate, endDate],
        queryFn: () => getShiftAssignments(employeeId || undefined, startDate, endDate, companyId),
        enabled: enabled && (!!employeeId || !!companyId)
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

    const records = React.useMemo(() => {
        if (!employeeData || !companyData) return [];
        return calculateAttendanceForEmployee(
            employeeData,
            companyData,
            logsData?.data || [],
            leavesData?.data || [],
            shiftsData?.data || [],
            holidaysData?.data || [],
            startDate,
            endDate
        );
    }, [employeeData, companyData, logsData, leavesData, shiftsData, holidaysData, startDate, endDate]);

    const stats = React.useMemo(() => {
        return {
            totalDays: records.length,
            workedDays: records.filter(r => r.status === 'Present').length,
            lateCount: records.filter(r => r.isLate).length, // Added line
            leaves: records.filter(r => r.status === 'Leave').length,
            absent: records.filter(r => r.status === 'Absent').length,
            totalHours: Math.floor(records.reduce((acc, curr) => acc + curr.durationMinutes, 0) / 60),
            totalOT: Math.floor(records.reduce((acc, curr) => acc + curr.otMinutes, 0) / 60)
        };
    }, [records]);

    return {
        records,
        stats,
        loading: loadingLogs || loadingLeaves || loadingShifts || loadingHolidays || loadingEmployee || loadingCompany,
        refetch: () => logsDataRefetch()
    };
};

export const useAllEmployeesAttendanceAggregation = (
    companyId: string,
    startDate: string,
    endDate: string,
    enabled: boolean = true,
    filterEmployeeIds?: string[] // Optional: Filter for specific employees (e.g. for Team View)
) => {
    const { data: companyData, isLoading: loadingCompany } = useQuery({
        queryKey: ["company", companyId],
        queryFn: () => fetchCompany(companyId),
        enabled: enabled && !!companyId
    });

    const { data: employeesData, isLoading: loadingEmployees } = useQuery({
        queryKey: ['employees', companyId],
        queryFn: () => fetchEmployees({ companyId, limit: 1000 }),
        enabled: enabled && !!companyId
    });

    const { data: logsData, isLoading: loadingLogs, refetch: logsDataRefetch } = useQuery({
        queryKey: ["attendanceLogs", companyId, startDate, endDate],
        queryFn: () => getAttendanceLogs(companyId, undefined, startDate, endDate),
        enabled: enabled && !!companyId && !!startDate && !!endDate
    });

    const { data: leavesData, isLoading: loadingLeaves } = useQuery({
        queryKey: ["leaveRequestsAggregation", companyId, "all", startDate, endDate],
        queryFn: () => fetchLeaveRequests(companyId, {
            startDate,
            endDate,
            status: "approved"
        }),
        enabled: enabled && !!companyId
    });

    const { data: shiftsData, isLoading: loadingShifts } = useQuery({
        queryKey: ["shiftAssignmentsAggregation", "all", startDate, endDate],
        queryFn: () => getShiftAssignments(undefined, startDate, endDate, companyId),
        enabled: enabled && !!companyId
    });

    const { data: holidaysData, isLoading: loadingHolidays } = useQuery({
        queryKey: ["holidaysAggregation", startDate, endDate],
        queryFn: () => getHolidays(startDate, endDate),
        enabled: enabled && !!startDate
    });

    const allRecords = React.useMemo(() => {
        let employees = Array.isArray(employeesData) ? employeesData : (employeesData?.employees || []);
        if (!companyData || employees.length === 0) return [];

        // Apply filtering if provided
        if (filterEmployeeIds && filterEmployeeIds.length > 0) {
            employees = employees.filter((e: any) => filterEmployeeIds.includes(e._id));
        }

        const logs = logsData?.data || [];
        const leaves = leavesData?.data || [];
        const shiftAssignments = shiftsData?.data || [];
        const holidays = holidaysData?.data || [];

        const flattened: DailyAttendanceRecord[] = [];

        employees.forEach((employee: any) => {
            if (!employee.active) return; // Optional: Skip inactive employees in main view

            const empRecords = calculateAttendanceForEmployee(
                employee,
                companyData,
                logs,
                leaves,
                shiftAssignments,
                holidays,
                startDate,
                endDate
            );
            flattened.push(...empRecords);
        });

        // Sort by date ASC, then employee name
        return flattened.sort((a, b) => {
            const dateDiff = a.date.localeCompare(b.date);
            if (dateDiff !== 0) return dateDiff;
            return (a.employee?.name || "").localeCompare(b.employee?.name || "");
        });
    }, [companyData, employeesData, logsData, leavesData, shiftsData, holidaysData, startDate, endDate, filterEmployeeIds]);

    return {
        records: allRecords,
        loading: loadingCompany || loadingEmployees || loadingLogs || loadingLeaves || loadingShifts || loadingHolidays,
        refetch: () => logsDataRefetch()
    };
};

// End of file
