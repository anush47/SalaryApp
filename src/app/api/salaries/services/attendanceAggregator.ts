import { AttendanceService } from "../../attendance/service";
import { getHolidays } from "../../calendar/holidays/holidayHelper";
import Attendance from "@/app/models/Attendance";
import LeaveRequest from "@/app/models/LeaveRequest";

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
        // Fetch attendance records from database
        const attendanceRecords = await Attendance.find({
            employee: employeeId,
            timestamp: {
                $gte: startDate,
                $lte: endDate,
            },
        })
            .populate("shift")
            .sort({ timestamp: 1 })
            .lean();

        console.log(`[AttendanceAggregator] Found ${attendanceRecords.length} attendance records for employee ${employeeId} between ${startDate.toISOString()} and ${endDate.toISOString()}`);
        if (attendanceRecords.length > 0) {
            console.log(`[AttendanceAggregator] Sample record:`, JSON.stringify({
                type: attendanceRecords[0].type,
                timestamp: attendanceRecords[0].timestamp,
                shift: attendanceRecords[0].shift?.name || 'No shift'
            }));
        }

        // Group by Date + Shift
        const dailyGroups = new Map<string, AttendanceRecord[]>();

        attendanceRecords.forEach((record: any) => {
            const dateStr = new Date(record.timestamp).toISOString().split("T")[0];
            // Use shiftId if available, otherwise 'default'
            // Ensure we handle cases where shift might be missing (legacy/error)
            const shiftId = record.shift?.shiftId || record.shift?._id || "default";
            const key = `${dateStr}|${shiftId}`;

            if (!dailyGroups.has(key)) {
                dailyGroups.set(key, []);
            }
            dailyGroups.get(key)!.push({
                _id: record._id.toString(),
                employee: record.employee.toString(),
                type: record.type,
                timestamp: new Date(record.timestamp),
                shift: record.shift,
                date: dateStr,
            });
        });

        console.log(`[AttendanceAggregator] Grouped into ${dailyGroups.size} daily groups`);

        // Convert to array and detect breaks
        const result: DailyAttendanceGroup[] = [];
        for (const [key, records] of dailyGroups.entries()) {
            const [dateStr] = key.split("|");

            const detectedBreakHours = this.detectBreaks(records);
            // Use the shift from the first record (all in group share shiftId)
            const shift = records.find((r) => r.shift)?.shift;

            console.log(`[AttendanceAggregator] ${dateStr}: ${records.length} records, detected break: ${detectedBreakHours}h, shift: ${shift?.name || 'None'}`);

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
        calendar: string = "default"
    ): Promise<{
        isMercantileHoliday: boolean;
        isPublicHoliday: boolean;
        holidayName: string;
    }> {
        const dateStr = date.toISOString().split("T")[0];
        const { holidays } = await getHolidays(dateStr, dateStr, calendar);

        const holiday = holidays.find((h: any) => h.date === dateStr);

        return {
            isMercantileHoliday: holiday?.categories?.mercantile || false,
            isPublicHoliday: holiday?.categories?.public || false,
            holidayName: holiday?.summary || "",
        };
    }
}
