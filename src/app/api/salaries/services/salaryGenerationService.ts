import { AttendanceAggregator } from "./attendanceAggregator";
import { DailyCalculationService } from "./dailyCalculationService";
import { getWorkingDayStatus } from "../salaryHelper";
import Employee from "@/app/models/Employee";
import Company from "@/app/models/Company";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export class SalaryGenerationService {
    /**
     * Generate salary using new dailyRecords structure
     */
    static async generateWithDailyRecords(
        employeeId: string,
        period: string,
        companyId: string,
        timezone: string
    ) {
        // Fetch employee and company
        const employee = await Employee.findById(employeeId).populate("company").lean();
        if (!employee) {
            throw new Error("Employee not found");
        }

        const company = await Company.findById(companyId).lean();
        if (!company) {
            throw new Error("Company not found");
        }

        // Parse period to get date range
        // Default to Asia/Colombo if timezone is not provided or invalid
        const tz = timezone || "Asia/Colombo";
        const { startDate, endDate } = this.parsePeriod(period, tz);

        // Aggregate attendance by day
        const dailyGroups = await AttendanceAggregator.aggregateByDay(
            companyId,
            employeeId,
            startDate,
            endDate,
            timezone
        );

        // Link leave records
        const leaveRecords = await AttendanceAggregator.linkLeaveRecords(
            employeeId,
            startDate,
            endDate
        );

        // Process each day
        const dailyRecords = [];
        let totalNormalOT = 0;
        let totalDoubleOT = 0;
        let totalTripleOT = 0;
        let totalNoPay = 0;

        for (const dayGroup of dailyGroups) {
            const date = new Date(dayGroup.date);

            // Get holiday info
            const holidayInfo = await AttendanceAggregator.getHolidayInfo(
                date,
                employee.calendar || company.calendar || "default"
            );

            // Get working day status
            const workingDayStatus = getWorkingDayStatus(date, employee, undefined);

            // Find leaves for this day
            const dayLeaves = leaveRecords.filter((leaveId) => {
                // TODO: Check if leave covers this date
                return false; // Placeholder
            });

            // Process daily record
            const dailyRecord = DailyCalculationService.processDailyRecordNew({
                date,
                attendanceRecords: dayGroup.records,
                shift: dayGroup.shift,
                workingDayStatus,
                isMercantileHoliday: holidayInfo.isMercantileHoliday,
                isPublicHoliday: holidayInfo.isPublicHoliday,
                holidayName: holidayInfo.holidayName,
                employee,
                detectedBreakHours: dayGroup.detectedBreakHours,
                appliedLeaves: dayLeaves,
            });

            dailyRecords.push(dailyRecord);

            // Accumulate totals
            totalNormalOT += dailyRecord.normalOT;
            totalDoubleOT += dailyRecord.doubleOT;
            totalTripleOT += dailyRecord.tripleOT;
            totalNoPay += dailyRecord.noPay;
        }

        // Calculate total OT amount
        const normalOTAmount = (totalNormalOT * employee.basic * 1.5) / employee.divideBy;
        const doubleOTAmount = (totalDoubleOT * employee.basic * 2) / employee.divideBy;
        const tripleOTAmount = (totalTripleOT * employee.basic * 3) / employee.divideBy;
        const totalOTAmount = normalOTAmount + doubleOTAmount + tripleOTAmount;

        // Calculate holiday pay (if any days worked on holidays)
        const holidayPay = dailyRecords
            .filter(r => (r.isMercantileHoliday || r.isPublicHoliday) && r.workingHours > 0)
            .reduce((sum, r) => {
                const dailyRate = employee.basic / employee.divideBy;
                return sum + (dailyRate * r.workingHours / 8);
            }, 0);

        console.log(`[SalaryGenerationService] Generated dailyRecords for ${employeeId}: ${dailyRecords.length} records.`);
        return {
            employee: employeeId,
            period,
            basic: employee.basic,
            holidayPay,
            dailyRecords,
            usesNewStructure: true,
            ot: {
                amount: totalOTAmount,
                reason: `Normal: ${totalNormalOT.toFixed(2)}h, Double: ${totalDoubleOT.toFixed(2)}h, Triple: ${totalTripleOT.toFixed(2)}h`,
            },
            noPay: {
                amount: totalNoPay,
                reason: dailyRecords
                    .filter((r) => r.noPay > 0)
                    .map((r) => r.noPayReason)
                    .join(", "),
            },
            paymentStructure: employee.paymentStructure || { additions: [], deductions: [] },
            advanceAmount: 0, // Will be set by main service
            finalSalary: 0, // Will be calculated by main service
            remark: "",
            // Period fields
            salaryPeriod: employee.salaryPeriod || "monthly",
            periodStartDate: startDate,
            periodEndDate: endDate,
            periodDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
            workDays: dailyRecords.filter(r => r.workingHours > 0).length,
            ratePerDay: employee.basic / employee.divideBy,
            rateDivisor: employee.divideBy,
            // Payment tracking
            totalPaid: 0,
            outstandingBalance: 0,
            activeAdvances: [],
            paymentStatus: "unpaid" as const,
            calculationMethod: employee.calculationMethod || "attendance",
            // Tax fields (will be calculated by main service)
            taxes: {
                apitAmount: 0,
                stampDuty: 0,
                totalTax: 0,
                taxableIncome: 0,
                grossSalary: 0,
            },
            leaveDeductions: [],
        };
    }

    /**
     * Parse period string to date range
     */
    private static parsePeriod(period: string, timezone: string): { startDate: Date; endDate: Date } {
        // Handle different period formats
        if (period.includes(" to ")) {
            // Range format: "2024-01-01 to 2024-01-31"
            const [startStr, endStr] = period.split(" to ");
            // Parse as start of day in given timezone
            const startDate = dayjs.tz(startStr, timezone).startOf('day').toDate();
            const endDate = dayjs.tz(endStr, timezone).endOf('day').toDate();
            return { startDate, endDate };
        } else if (period.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Daily format: "2024-01-15"
            const date = dayjs.tz(period, timezone);
            return {
                startDate: date.startOf('day').toDate(),
                endDate: date.endOf('day').toDate(),
            };
        } else {
            // Monthly format: "2024-01"
            const start = dayjs.tz(`${period}-01`, timezone).startOf('month');
            const end = dayjs.tz(`${period}-01`, timezone).endOf('month');
            return {
                startDate: start.toDate(),
                endDate: end.toDate()
            };
        }
    }
}
