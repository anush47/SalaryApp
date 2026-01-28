import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
    getTimeDifferenceInMinutes as _getTimeDifferenceInMinutes,
    calculateHolidayPay as _calculateHolidayPay,
} from "@/app/lib/utils/attendanceUtils";
import { DailyCalculationService } from "./services/dailyCalculationService";

dayjs.extend(utc);
dayjs.extend(timezone);

export const getTimeDifferenceInMinutes = _getTimeDifferenceInMinutes;
export const calculateHolidayPay = _calculateHolidayPay;

export const getShiftEnd = (shift: string, inDate: Date): Date => {
    const [hours, minutes] = shift.split(":").map(Number);
    let shiftEndTime = new Date(inDate);
    shiftEndTime.setUTCHours(hours);
    shiftEndTime.setUTCMinutes(minutes);
    // If shift end time is before start, move to the next day
    if (shiftEndTime < inDate) {
        shiftEndTime.setUTCDate(shiftEndTime.getUTCDate() + 1);
    }
    return shiftEndTime;
};

export const getShiftStart = (shift: string, inDate: Date): Date => {
    const [hours, minutes] = shift.split(":").map(Number);
    const shiftStartTime = new Date(inDate);
    shiftStartTime.setUTCHours(hours, minutes, 0, 0);
    return shiftStartTime;
};


export const getWorkingDayStatus = (
    day: Date,
    employee: any,
    inOutRecord: { day_status?: "full" | "half" | "off" } | undefined,
    timezone: string = "Asia/Colombo"
): "full" | "half" | "off" => {
    // Use dayjs with timezone to get the correct day of week
    const dayOfWeek = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][dayjs(day).tz(timezone).day()];

    // Determine if dynamic holidays are enabled
    const isDynamicHolidays = employee.overrides?.workingDays
        ? employee.workingDays?.isDynamicHolidays
        : employee.company?.workingDays?.isDynamicHolidays;

    // If day_status is undefined, populate it based on employee or company working days
    if (inOutRecord?.day_status === undefined) {
        // If employee has working days override, use employee's working days
        if (employee.overrides?.workingDays && employee.workingDays) {
            return employee.workingDays[dayOfWeek] || "full";
        }
        // Otherwise, use company's working days
        else if (employee.company?.workingDays) {
            return employee.company.workingDays[dayOfWeek] || "full";
        }
    }

    // If dynamic holidays are enabled and a day_status is available in the record, use it
    if (isDynamicHolidays && inOutRecord?.day_status) {
        return inOutRecord.day_status;
    }

    // Default behavior
    const workingDayStatus = employee.overrides?.workingDays
        ? employee.workingDays?.[dayOfWeek] || "full"
        : employee.company?.workingDays?.[dayOfWeek] || "full";

    return workingDayStatus;
};

export const getHoliday = (
    date: Date,
    holidays: {
        date: string;
        categories: { public: boolean; bank: boolean; mercantile: boolean };
        summary: string;
    }[],
    timezone: string = "Asia/Colombo"
) => {
    const dateString = dayjs(date).tz(timezone).format("YYYY-MM-DD");
    const holiDay = holidays.find((h) => h.date === dateString) || {
        date: dateString,
        categories: { public: false, bank: false, mercantile: false },
        summary: "",
    };
    return holiDay;
};

export const calculateOT = (
    workingHours: number,
    workingDayStatus: string,
    holiday: {
        date: string;
        categories: { public: boolean; bank: boolean; mercantile: boolean };
        summary: string;
    },
    basic: number,
    divideBy: number,
    workingHoursTreshold: number = 8,
    halfDayTreshold: number = 6
) => {
    // CENTRALIZED: Use DailyCalculationService for OT calculation
    const breakdown = DailyCalculationService.calculateOTBreakdown(
        workingHours,
        workingDayStatus as "full" | "half" | "off",
        holiday.categories.mercantile,
        holiday.categories.public,
        basic,
        divideBy,
        workingHoursTreshold,
        halfDayTreshold
    );

    return {
        ot: breakdown.totalOTAmount,
        otHours: breakdown.normalOT + breakdown.doubleOT + breakdown.tripleOT,
    };
};

