import { AttendanceService } from "../../attendance/service";
import { getHolidays } from "../../calendar/holidays/holidayHelper";
import Attendance from "@/app/models/Attendance";
import LeaveRequest from "@/app/models/LeaveRequest";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

interface AttendanceRecord {
    _id: string;
    employee: string;
    type: "in" | "out";
    timestamp: Date;
    shift?: any;
    date: string;
}

interface DailyAttendanceGroup {
    date: string;
    attendanceRecords: string[]; // Array of attendance record IDs
    records: AttendanceRecord[];
    shift?: any;
    detectedBreakHours: number;
}

export class AttendanceAggregator {
    /**
     * Aggregate attendance records by day for a given period
     */
    static async aggregateByDay(
        companyId: string,
        employeeId: string,
        startDate: Date,
        endDate: Date,
        timezone: string
    ): Promise<DailyAttendanceGroup[]> {
        // Fetch a bit wider to pick up matching OUTs for sessions starting on the last day
        // and INs for sessions ending on the first day (though we group by IN)
        const queryStart = dayjs(startDate).subtract(2, 'day').toDate();
        const queryEnd = dayjs(endDate).add(2, 'day').toDate();

        const allRecords = await Attendance.find({
            employee: employeeId,
            timestamp: {
                $gte: queryStart,
                $lte: queryEnd,
            },
        })
            .populate("shift")
            .sort({ timestamp: 1 })
            .lean();


        // Perform Global Pairing (Same logic as frontend)
        const usedIds = new Set<string>();
        const pairedSessions: { in: any; out?: any }[] = [];

        for (let i = 0; i < allRecords.length; i++) {
            const rec = allRecords[i];
            const recId = rec._id.toString();
            if (rec.type !== 'in' || usedIds.has(recId)) continue;

            const nextOut = allRecords.find((l: any) =>
                l.type === 'out' &&
                !usedIds.has(l._id.toString()) &&
                dayjs(l.timestamp).isAfter(dayjs(rec.timestamp)) &&
                dayjs(l.timestamp).diff(dayjs(rec.timestamp), 'hour') < 36
            );

            usedIds.add(recId);
            if (nextOut) {
                usedIds.add(nextOut._id.toString());
                pairedSessions.push({ in: rec, out: nextOut });
            } else {
                pairedSessions.push({ in: rec });
            }
        }

        // Group sessions by the "IN" date (within the requested period)
        const dailyGroups = new Map<string, AttendanceRecord[]>();

        pairedSessions.forEach(session => {
            const dateStr = dayjs(session.in.timestamp).tz(timezone).format("YYYY-MM-DD");

            // Inclusion check: Does the session START within the requested period?
            // Use dayjs.isBetween for clean range check (inclusive of boundaries)
            const isInRange = dayjs(session.in.timestamp).isBetween(dayjs(startDate), dayjs(endDate), 'millisecond', '[]');

            if (isInRange) {
                const shiftId = session.in.shift?.shiftId || session.in.shift?._id || "default";
                const key = `${dateStr}|${shiftId}`;

                if (!dailyGroups.has(key)) {
                    dailyGroups.set(key, []);
                }

                const recs = dailyGroups.get(key)!;
                recs.push({
                    _id: session.in._id.toString(),
                    employee: session.in.employee.toString(),
                    type: "in",
                    timestamp: new Date(session.in.timestamp),
                    shift: session.in.shift,
                    date: dateStr,
                });

                if (session.out) {
                    recs.push({
                        _id: session.out._id.toString(),
                        employee: session.out.employee.toString(),
                        type: "out",
                        timestamp: new Date(session.out.timestamp),
                        shift: session.out.shift,
                        date: dateStr, // Associate OUT with its IN's day
                    });
                }
            }
        });


        // Convert to array and detect breaks
        const result: DailyAttendanceGroup[] = [];
        for (const [key, records] of dailyGroups.entries()) {
            const [dateStr] = key.split("|");

            const detectedBreakHours = this.detectBreaks(records);
            // Use the shift from the first record (all in group share shiftId)
            const shift = records.find((r) => r.shift)?.shift;


            result.push({
                date: dateStr,
                attendanceRecords: records.map((r) => r._id),
                records,
                shift,
                detectedBreakHours,
            });
        }

        // Sort by Date, then Shift Start Time (if available)
        return result.sort((a, b) => {
            const dateComp = a.date.localeCompare(b.date);
            if (dateComp !== 0) return dateComp;
            // Secondary sort: startTime
            const startA = a.shift?.startTime || "00:00";
            const startB = b.shift?.startTime || "00:00";
            return startA.localeCompare(startB);
        });
    }

    /**
     * Detect breaks from multiple in/out pairs for the same shift
     * Logic: If same shift has multiple in/out pairs, the gap between out and next in is a break
     */
    static detectBreaks(records: AttendanceRecord[]): number {
        // Sort records by timestamp
        const sorted = [...records].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
        );

        let totalBreakHours = 0;
        let lastOut: Date | null = null;

        for (let i = 0; i < sorted.length; i++) {
            const record = sorted[i];

            if (record.type === "out") {
                lastOut = record.timestamp;
            } else if (record.type === "in" && lastOut) {
                // Calculate gap between last out and current in
                const breakMinutes =
                    (record.timestamp.getTime() - lastOut.getTime()) / (1000 * 60);

                // Only count as break if gap is reasonable (5 min to 6 hours)
                if (breakMinutes >= 5 && breakMinutes <= 360) {
                    totalBreakHours += breakMinutes / 60;
                }
                lastOut = null;
            }
        }

        return Math.round(totalBreakHours * 100) / 100; // Round to 2 decimals
    }

    /**
     * Link leave requests for the given period
     */
    static async linkLeaveRecords(
        employeeId: string,
        startDate: Date,
        endDate: Date
    ): Promise<any[]> {
        const leaveRequests = await LeaveRequest.find({
            employee: employeeId,
            status: "approved",
            $or: [
                {
                    // Leave starts within period
                    startDate: { $gte: startDate, $lte: endDate },
                },
                {
                    // Leave ends within period
                    endDate: { $gte: startDate, $lte: endDate },
                },
                {
                    // Leave spans entire period
                    startDate: { $lte: startDate },
                    endDate: { $gte: endDate },
                },
            ],
        })
            .populate("leaveType")
            .lean();

        return leaveRequests;
    }

    /**
     * Determine if multiple shifts were worked on the same day
     */
    static detectMultipleShifts(records: AttendanceRecord[]): boolean {
        const shifts = new Set(
            records.map((r) => (r.shift?.shiftId || r.shift?._id)?.toString()).filter(Boolean)
        );
        return shifts.size > 1;
    }

    /**
     * Get holiday information for a specific date
     */
    static async getHolidayInfo(
        date: Date,
        calendar: string = "default",
        timezone: string = "Asia/Colombo",
        cachedHolidays?: any[]
    ): Promise<{
        isMercantileHoliday: boolean;
        isPublicHoliday: boolean;
        holidayName: string;
    }> {
        const dateStr = dayjs(date).tz(timezone).format("YYYY-MM-DD");

        // Use cached holidays if provided to avoid DB hits
        let holiday;
        if (cachedHolidays) {
            holiday = cachedHolidays.find((h: any) => h.date === dateStr);
        } else {
            const { holidays } = await getHolidays(dateStr, dateStr, calendar);
            holiday = holidays.find((h: any) => h.date === dateStr);
        }

        return {
            isMercantileHoliday: holiday?.categories?.mercantile || false,
            isPublicHoliday: holiday?.categories?.public || false,
            holidayName: holiday?.summary || "",
        };
    }
}
