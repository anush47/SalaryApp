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
    status: 'Present' | 'Absent' | 'Leave' | 'Off' | 'Holiday' | 'Future';
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
    isOvernightShift: boolean;
    requiresAttention: boolean; // e.g. Missed punch, Late
    remarks?: string;
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
            status: "approved" // Only consider approved leaves for the definitive view? Or pending too? Plan said Combined. Let's fetch all relevant.
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
        queryFn: () => getHolidays(startDate, endDate), // TODO: Pass calendar ID if employees satisfy different calendars
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

        const employee = employeeData; // Data is returned directly
        const company = companyData;   // Data is returned directly

        const logs = logsData?.success ? logsData.data : [];
        const leaves = leavesData?.data || [];
        const shiftAssignments = shiftsData?.success ? shiftsData.data : [];
        const holidays = holidaysData?.success ? holidaysData.data : [];

        const records: DailyAttendanceRecord[] = [];
        let currentDate = dayjs(startDate);
        const end = dayjs(endDate);

        const companyShifts = company.shiftSettings?.shifts || [];
        const employeeShifts = employee.shiftSettings?.shifts || [];
        const allShifts = [...companyShifts, ...employeeShifts];

        while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
            const dateStr = currentDate.format("YYYY-MM-DD");
            const dayOfWeek = currentDate.format("ddd").toLowerCase(); // mon, tue...

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
                // 2. Employee Default Schedule
                // Check workingDays first
                const workDayConfig = employee.workingDays?.[dayOfWeek] || company.workingDays?.[dayOfWeek] || "full";

                if (workDayConfig === "off") {
                    shiftExpected.off = true;
                    shiftExpected.name = "Off Day";
                } else {
                    // Find default shift if any
                    // Simplify: if global default shift exists in company/employee
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
            // Logic: Is it a holiday for THIS employee? (Mercantile vs Public vs Bank)
            // Simplifying: treat all matches as holidays for now, or check calendar type matching
            const isHoliday = !!holiday;
            if (isHoliday) {
                shiftExpected.off = true; // Holidays are off days usually? Or Work on Holiday?
                // Let's mark it as Holiday but "off" status depends on policy. For view, "Holiday" is distinct.
            }


            // C. Match Attendance (Unifying In/Out) - KEY LOGIC for Overnight Shifts
            // We search for an 'In' punch that happens "around" the expected start time.
            // Window: StartTime - 4 hours TO StartTime + 12 hours?
            // BETTER: Find any 'in' punch on this DATE. 
            // If overnight shift (Start > End), the 'out' punch might be on date+1.

            const expectedStartDateTime = dayjs(`${dateStr} ${shiftExpected.start}`);
            let isOvernight = false;
            // Parse times to check overnight
            const [sh, sm] = shiftExpected.start.split(':').map(Number);
            const [eh, em] = shiftExpected.end.split(':').map(Number);
            if (eh < sh || (eh === sh && em < sm)) {
                isOvernight = true;
            }

            // Find matching IN log
            // Strict Date Match for 'in' log? 
            // Usually, if I have a shift at 10 PM Monday, I clock in at 10 PM Monday.
            // If I have a shift at 1 AM Tuesday (technically belongs to Monday night roster?), that's complex.
            // Assumption: Shift Start Date = Calendar Date.

            const inLog = logs.find((l: any) =>
                (l.employee?._id === employee._id || l.employee === employee._id) &&
                l.type === 'in' &&
                dayjs(l.timestamp).isSame(currentDate, 'day')
            );

            let outLog = null;
            if (inLog) {
                // Find corresponding OUT log
                // Logic: First OUT log AFTER the IN log
                outLog = logs.find((l: any) =>
                    l.type === 'out' &&
                    dayjs(l.timestamp).isAfter(dayjs(inLog.timestamp)) &&
                    // Constraint: Shouldn't be TOO far away (e.g. < 24 hours)
                    dayjs(l.timestamp).diff(dayjs(inLog.timestamp), 'hour') < 20
                );
            }

            // D. Resolve Leaves
            // Check if any approved leave covers this date
            const relevantLeave = leaves.find((l: any) => {
                const lStart = dayjs(l.startDate).startOf('day');
                const lEnd = dayjs(l.endDate).endOf('day');
                return currentDate.isBetween(lStart, lEnd, 'day', '[]') && l.status === 'approved';
            });


            // E. Determine Final Status
            let status: DailyAttendanceRecord['status'] = 'Absent';
            let finalDuration = 0;
            let finalOT = 0;

            if (dayjs().isBefore(currentDate, 'day')) {
                status = 'Future';
            } else if (inLog) {
                status = 'Present';
                if (outLog) {
                    finalDuration = dayjs(outLog.timestamp).diff(dayjs(inLog.timestamp), 'minute');
                    // OT Calculation (very basic)
                    // Expected Duration
                    const expStart = dayjs(`${dateStr} ${shiftExpected.start}`);
                    const expEnd = isOvernight
                        ? dayjs(`${dateStr} ${shiftExpected.end}`).add(1, 'day')
                        : dayjs(`${dateStr} ${shiftExpected.end}`);
                    const expDuration = expEnd.diff(expStart, 'minute'); // e.g. 480 mins (8h) - break?

                    if (finalDuration > expDuration) {
                        finalOT = finalDuration - expDuration;
                    }
                }
            } else if (relevantLeave) {
                status = 'Leave';
            } else if (isHoliday) {
                status = 'Holiday';
            } else if (shiftExpected.off) {
                status = 'Off';
            }

            // Push Record
            records.push({
                date: dateStr,
                dayOfWeek: currentDate.format('dddd'),
                shiftId: shiftExpected.shiftId || undefined,
                shiftName: shiftExpected.name,
                expectedStartTime: shiftExpected.start,
                expectedEndTime: shiftExpected.end,
                isOffDay: shiftExpected.off,
                isHoliday: isHoliday,
                holidayName: holiday?.summary,
                status: status,
                checkInTime: inLog?.timestamp,
                checkOutTime: outLog?.timestamp,
                durationMinutes: finalDuration,
                otMinutes: finalOT,
                leaveStatus: relevantLeave ? (relevantLeave.halfDay ? (relevantLeave.halfDayPeriod === 'morning' ? 'Half-Morning' : 'Half-Afternoon') : 'Full') : undefined,
                leaveType: relevantLeave?.leaveType?.name,
                leaveColor: relevantLeave?.leaveType?.color,
                leaveId: relevantLeave?._id,
                leaveReason: relevantLeave?.reason,
                isOvernightShift: isOvernight,
                requiresAttention: status === 'Absent' || (status === 'Present' && !outLog),
                remarks: inLog?.remarks || outLog?.remarks
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
