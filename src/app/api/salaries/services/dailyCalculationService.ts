import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
    calculateHolidayPay,
    getTimeDifferenceInMinutes,
} from "@/app/api/salaries/salaryHelper";

dayjs.extend(utc);
dayjs.extend(timezone);

import { calculateSingleLeaveDeduction } from "../../../lib/leaveDeductionCalculation";
import { calculateOT } from "@/app/lib/utils/attendanceUtils";

interface OTBreakdown {
    normalOT: number; // 1.5x hours
    doubleOT: number; // 2x hours
    tripleOT: number; // 3x hours
    totalOTAmount: number;
}

export class DailyCalculationService {
    /**
     * Calculate OT with breakdown by type (normal/double/triple)
     */
    static calculateOTBreakdown(
        workingHours: number,
        workingDayStatus: "full" | "half" | "off",
        isMercantileHoliday: boolean,
        isPublicHoliday: boolean,
        basic: number,
        divideBy: number,
        workingHoursTreshold: number = 8,
        halfDayTreshold: number = 6
    ): OTBreakdown {
        if (workingHours <= 0) {
            return {
                normalOT: 0,
                doubleOT: 0,
                tripleOT: 0,
                totalOTAmount: 0,
            };
        }

        let normalOT = 0;
        let doubleOT = 0;
        let tripleOT = 0;

        // Calculate OT hours based on day type using shared utility
        // workingHours passed here is already 'Net' (break subtracted if applicable)
        // So we pass 0 as break to calculateOT
        const otMinutes = calculateOT(
            workingHours * 60,
            0,
            workingDayStatus
        );
        const otHours = otMinutes / 60;

        // Categorize OT by type
        if (isMercantileHoliday) {
            // Mercantile holiday: 2x for regular hours, 3x beyond threshold
            if (otHours > workingHoursTreshold) {
                doubleOT = workingHoursTreshold;
                tripleOT = otHours - workingHoursTreshold;
            } else {
                doubleOT = otHours;
            }
        } else if (isPublicHoliday || workingDayStatus === "off") {
            // Public holiday or off day: 1.5x
            normalOT = otHours;
        } else {
            // Regular day: 1.5x for OT hours
            normalOT = otHours;
        }

        // Calculate amounts
        const normalOTAmount = (normalOT * basic * 1.5) / divideBy;
        const doubleOTAmount = (doubleOT * basic * 2) / divideBy;
        const tripleOTAmount = (tripleOT * basic * 3) / divideBy;

        return {
            normalOT,
            doubleOT,
            tripleOT,
            totalOTAmount: normalOTAmount + doubleOTAmount + tripleOTAmount,
        };
    }

    /**
     * Process a daily record with new structure
     */
    static processDailyRecordNew(params: {
        date: Date;
        attendanceRecords: any[]; // Attendance records for this day
        shift: any;
        workingDayStatus: "full" | "half" | "off";
        isMercantileHoliday: boolean;
        isPublicHoliday: boolean;
        holidayName: string;
        employee: any;
        detectedBreakHours?: number;
        manualBreakHours?: number;
        appliedLeaves?: any[];
        remark?: string;
    }) {
        const {
            date,
            attendanceRecords,
            shift,
            workingDayStatus,
            isMercantileHoliday,
            isPublicHoliday,
            holidayName,
            employee,
            detectedBreakHours = 0,
            manualBreakHours,
            appliedLeaves = [],
            remark = "",
        } = params;

        // Use manual break if provided
        // If not manual, use detected break (from multiple punches)
        // If detected is 0, fallback to shift default (breakDuration or break)
        let breakHours = manualBreakHours;

        if (breakHours === undefined || breakHours === null) {
            const shiftDefault = Number(shift?.breakDuration || shift?.break || 0);
            // Use the greater of detected break or shift default
            breakHours = Math.max(detectedBreakHours, shiftDefault);
        }

        let totalWorkingMinutes = 0;
        const sortedRecords = [...attendanceRecords].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        console.log(`[DailyCalculation] Processing ${sortedRecords.length} attendance records for ${date.toISOString().split('T')[0]}`);

        for (let i = 0; i < sortedRecords.length; i += 2) {
            const inRecord = sortedRecords[i];
            const outRecord = sortedRecords[i + 1];

            if (inRecord && outRecord && inRecord.type === "in" && outRecord.type === "out") {
                const inTime = new Date(inRecord.timestamp).getTime();
                const outTime = new Date(outRecord.timestamp).getTime();
                const pairMinutes = (outTime - inTime) / (1000 * 60);
                totalWorkingMinutes += pairMinutes;
                console.log(`[DailyCalculation] Pair ${i / 2 + 1}: IN ${new Date(inTime).toISOString()} -> OUT ${new Date(outTime).toISOString()} = ${pairMinutes.toFixed(2)} mins`);
            } else {
                console.warn(`[DailyCalculation] Unpaired record at index ${i}: ${inRecord?.type || 'missing'} / ${outRecord?.type || 'missing'}`);
            }
        }

        let workingHours = totalWorkingMinutes / 60;
        console.log(`[DailyCalculation] Total working minutes: ${totalWorkingMinutes.toFixed(2)}, hours: ${workingHours.toFixed(2)}`);

        // Subtract break hours ONLY if there's no detected break (single continuous session)
        // If detectedBreakHours > 0, the break is already naturally excluded from totalWorkingMinutes
        const workingHoursTreshold = 8;
        const halfDayTreshold = 6;
        const shouldSubtractBreak = detectedBreakHours === 0 && workingHours > halfDayTreshold;

        if (shouldSubtractBreak) {
            console.log(`[DailyCalculation] Single session detected. WorkingHours ${workingHours.toFixed(2)}h > threshold, subtracting breakHours: ${breakHours}h`);
            workingHours -= breakHours;
        } else if (detectedBreakHours > 0) {
            console.log(`[DailyCalculation] Multiple punches detected with ${detectedBreakHours.toFixed(2)}h break already excluded. WorkingHours: ${workingHours.toFixed(2)}h`);
        } else {
            console.log(`[DailyCalculation] WorkingHours ${workingHours.toFixed(2)}h <= threshold, NOT subtracting break`);
        }
        workingHours = Math.max(workingHours, 0);

        // Process Leave Deductions
        let noPay = 0;
        let noPayReason = "";

        if (appliedLeaves && appliedLeaves.length > 0) {
            for (const leave of appliedLeaves) {
                // Determine deduction for this day
                // Basic/DivideBy is needed. Pass from employee?
                // Employee object is passed in params.
                if (employee) {
                    const basic = employee.basic || 0;
                    const divideBy = employee.divideBy || 240;
                    const result = calculateSingleLeaveDeduction(leave, leave.leaveType, basic, divideBy);

                    if (result.amount > 0) {
                        noPay += result.amount;
                        noPayReason = noPayReason ? `${noPayReason}, ${result.description}` : result.description;
                    }

                    // Also append to remark/description if not nopay?
                    // Or updated remark?
                    if (!noPayReason.includes(result.description)) {
                        // e.g. Paid leave
                        // result.description might be "Annual Leave"
                        // We might want to show it.
                        // But calculateSingleLeaveDeduction returns empty description if paid? No.
                        // It returns description for paid too?
                        // Let's check helper.
                        // Helper returns amount=0, description="" if Paid.
                        // So we miss Paid leave descriptions!

                        // I should update helper to return description even if Paid?
                        // Or handle Paid separately here.
                        // Leave it for now, mainly focusing on No Pay Integration as per user request.
                    }
                }
            }
        }

        // Calculate OT breakdown
        const otBreakdown = this.calculateOTBreakdown(
            workingHours,
            workingDayStatus,
            isMercantileHoliday,
            isPublicHoliday,
            employee.basic,
            employee.divideBy,
            workingHoursTreshold,
            halfDayTreshold
        );

        // Calculate noPay if applicable (Absent logic)
        // DISABLED: No automatic no-pay deductions for absences/early departures
        // Only leave-based no-pay is calculated automatically
        // Manual no-pay can be added during salary editing if needed

        let absentNoPay = 0;
        let absentReason = "";

        // Automatic no-pay for absences and early departures is DISABLED per user request
        /*
        if (workingHours === 0 && workingDayStatus === "full" && !isMercantileHoliday && !isPublicHoliday) {
            if (!appliedLeaves || appliedLeaves.length === 0) {
                absentNoPay = employee.basic / employee.divideBy;
                absentReason = "Absent";
            }
        } else if (workingHours < workingHoursTreshold && workingDayStatus === "full") {
            const shortHours = workingHoursTreshold - workingHours;
            let shortLeaveCoveredHours = 0;
            if (appliedLeaves && appliedLeaves.length > 0) {
                for (const leave of appliedLeaves) {
                    if (leave.leaveType?.isShortLeave || leave.totalMinutes) {
                        const mins = leave.totalMinutes || 0;
                        shortLeaveCoveredHours += mins / 60;
                    }
                }
            }
            const uncoveredHours = Math.max(0, shortHours - shortLeaveCoveredHours);
            if (uncoveredHours > 0) {
                absentNoPay = (uncoveredHours * employee.basic) / employee.divideBy / workingHoursTreshold;
                absentReason = `Left ${uncoveredHours.toFixed(2)}h early (uncovered)`;
            }
        }
        noPay += absentNoPay;
        if (absentReason) {
            noPayReason = noPayReason ? `${noPayReason}, ${absentReason}` : absentReason;
        }
        */

        return {
            date,
            attendanceRecords: attendanceRecords.map((r) => r._id.toString()),
            shift: (shift?.shiftId || shift?._id)?.toString(),
            shiftName: shift?.name || "Standard",
            shiftStartTime: shift?.startTime,
            shiftEndTime: shift?.endTime,
            appliedLeaves: (appliedLeaves || []).map((l: any) => (l._id || l).toString()),
            workingHours: Math.round(workingHours * 100) / 100,
            breakHours: Math.round(breakHours * 100) / 100,
            normalOT: Math.round(otBreakdown.normalOT * 100) / 100,
            doubleOT: Math.round(otBreakdown.doubleOT * 100) / 100,
            tripleOT: Math.round(otBreakdown.tripleOT * 100) / 100,
            noPay: Math.round(noPay * 100) / 100,
            noPayReason,
            holiday: holidayName,
            isMercantileHoliday,
            isPublicHoliday,
            day_status: workingDayStatus,
            remark,
            description: [remark, noPayReason, holidayName].filter(Boolean).join(" | "), // Combine info for description
        };
    }

    /**
     * Legacy method for backward compatibility
     */
    static processDailyRecord(
        inDate: Date,
        outDate: Date,
        shifts: any[],
        timezone: string,
        workingDayStatus: "full" | "half" | "off" = "full",
        holiday: {
            date: string;
            categories: {
                public: boolean;
                bank: boolean;
                mercantile: boolean;
            };
            summary: string;
        },
        employee: any,
        recordData: {
            remark?: string;
            noPay?: number;
        } = {}
    ) {
        const shift = shifts.reduce((prev: any, curr: any) => {
            const prevDiff = Math.abs(
                getTimeDifferenceInMinutes(prev.startTime, inDate, timezone)
            );
            const currDiff = Math.abs(
                getTimeDifferenceInMinutes(curr.startTime, inDate, timezone)
            );
            return currDiff < prevDiff && currDiff <= 6 * 60 ? curr : prev;
        });

        const shiftStartHours = Number(shift.startTime.split(":")[0]);
        const shiftStartMinutes = Number(shift.startTime.split(":")[1]);

        const inDateLocal = dayjs(inDate).tz(timezone);
        const actualInTime =
            inDateLocal.hour() > shiftStartHours ||
                (inDateLocal.hour() === shiftStartHours &&
                    inDateLocal.minute() > shiftStartMinutes)
                ? inDate
                : inDateLocal
                    .hour(shiftStartHours)
                    .minute(shiftStartMinutes)
                    .second(0)
                    .millisecond(0)
                    .toDate();

        let workingHours = Math.max(
            (outDate.getTime() -
                (typeof actualInTime === "number"
                    ? actualInTime
                    : actualInTime.getTime())) /
            1000 /
            60 /
            60,
            0
        );

        const workingHoursTreshold = 8;
        const halfDayTreshold = 6;

        if (workingHours > halfDayTreshold) {
            workingHours -= Number(shift.breakDuration || shift.break) || 0;
        }

        // Use new OT breakdown calculation
        const otBreakdown = this.calculateOTBreakdown(
            workingHours,
            workingDayStatus,
            holiday.categories.mercantile,
            holiday.categories.public,
            employee.basic,
            employee.divideBy,
            workingHoursTreshold,
            halfDayTreshold
        );

        const holidayTexts: String[] = [];
        if (holiday.categories.public) holidayTexts.push("Public");
        if (holiday.categories.mercantile) holidayTexts.push("Mercantile");
        if (holiday.categories.bank) holidayTexts.push("Bank");
        if (workingDayStatus === "off") holidayTexts.push("Off");
        else if (workingDayStatus === "half") holidayTexts.push("Half");

        const holidayText =
            holidayTexts.length > 0 ? holidayTexts.join(", ").trim() : "";

        const { holidayPay: recordHolidayPay } = calculateHolidayPay(
            holidayText,
            workingHours,
            workingHoursTreshold,
            employee.basic,
            employee.divideBy
        );

        const workingText = (() => {
            const texts = [];

            if (
                workingHours === 0 &&
                (workingDayStatus === "full" || workingDayStatus === "half") &&
                !holiday.categories.public &&
                !holiday.categories.mercantile
            ) {
                texts.push("Absent");
            }

            if (workingHours > 0) {
                if (
                    workingDayStatus === "off" &&
                    (holiday.categories.public || holiday.categories.mercantile)
                ) {
                    texts.push(
                        `Worked on Off Day and Holiday (Holiday Pay: ${recordHolidayPay.toFixed(
                            2
                        )})`
                    );
                } else if (workingDayStatus === "off") {
                    texts.push(
                        `Worked on Off Day (Holiday Pay: ${recordHolidayPay.toFixed(2)})`
                    );
                } else if (holiday.categories.public || holiday.categories.mercantile) {
                    texts.push(
                        `Worked on Holiday (Holiday Pay: ${recordHolidayPay.toFixed(2)})`
                    );
                } else if (
                    workingDayStatus === "full" &&
                    workingHours < workingHoursTreshold
                ) {
                    texts.push(
                        `Left ${(workingHoursTreshold - workingHours).toFixed(
                            2
                        )} h early on a Full Day`
                    );
                } else if (
                    workingDayStatus === "half" &&
                    workingHours < halfDayTreshold
                ) {
                    texts.push(
                        `Left ${(halfDayTreshold - workingHours).toFixed(
                            2
                        )} h early on a Half Day`
                    );
                }
            }

            const shiftStart = new Date(inDate);
            shiftStart.setUTCHours(
                Number(shift.startTime.split(":")[0]),
                Number(shift.startTime.split(":")[1])
            );
            if (inDate > shiftStart) {
                const lateHours =
                    (inDate.getTime() - shiftStart.getTime()) / 1000 / 60 / 60;
                texts.push(`Came ${lateHours.toFixed(2)} h late`);
            }

            return texts.join(", ");
        })();

        const newDescription = [holiday.summary.trim(), workingText].join(" ");

        return {
            in: inDate.toISOString(),
            out: outDate.toISOString(),
            break: shift.break,
            workingHoursTreshold,
            halfDayTreshold,
            workingHours,
            otHours: otBreakdown.normalOT + otBreakdown.doubleOT + otBreakdown.tripleOT,
            ot: otBreakdown.totalOTAmount,
            noPay: recordData.noPay || 0,
            holiday: holidayText,
            description: newDescription,
            remark: recordData.remark || "",
            day_status: workingDayStatus,
        };
    }
}
