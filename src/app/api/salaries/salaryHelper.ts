import dayjs from "dayjs";
import { getEffectiveWorkingDays } from "../../lib/utils/overrides";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

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

export const getTimeDifferenceInMinutes = (
    shift: string,
    inOut: Date,
    timezone: string
): number => {
    const [hours, minutes] = shift.split(":").map(Number);

    // Convert UTC date to Company Local Time
    const localDate = dayjs(inOut).tz(timezone);

    const timeDiff =
        hours * 60 + minutes - (localDate.hour() * 60 + localDate.minute());
    return timeDiff;
};

export const getWorkingDayStatus = (
    day: Date,
    employee: any,
    inOutRecord: { day_status?: "full" | "half" | "off" } | undefined
): "full" | "half" | "off" => {
    // Use UTC methods to avoid timezone issues
    const dayOfWeek = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][day.getUTCDay()];

    const effectiveWorkingDays = getEffectiveWorkingDays(employee.company, employee);
    const isDynamicHolidays = effectiveWorkingDays?.isDynamicHolidays;

    // If day_status is undefined, populate it based on employee or company working days
    if (inOutRecord?.day_status === undefined) {
        return effectiveWorkingDays?.[dayOfWeek] || "full";
    }

    // If dynamic holidays are enabled and a day_status is available in the record, use it
    if (isDynamicHolidays && inOutRecord?.day_status) {
        return inOutRecord.day_status;
    }

    // Default behavior
    return effectiveWorkingDays?.[dayOfWeek] || "full";
};

export const getHoliday = (
    date: Date,
    holidays: {
        date: string;
        categories: { public: boolean; bank: boolean; mercantile: boolean };
        summary: string;
    }[]
) => {
    const dateString = date.toISOString().split("T")[0];
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
    workingHoursTreshold: number = 9,
    halfDayTreshold: number = 6
) => {
    if (workingHours <= 0) {
        return {
            ot: 0,
            otHours: 0,
        };
    }

    let otHours = 0;
    if (
        workingDayStatus === "off" ||
        holiday.categories.mercantile ||
        holiday.categories.public
    ) {
        otHours = workingHours;
    } else if (workingDayStatus === "half") {
        otHours = Math.max(workingHours - halfDayTreshold, 0);
    } else {
        otHours = Math.max(workingHours - workingHoursTreshold, 0);
    }
    let multiplier = 1.5;
    if (holiday.categories.mercantile) {
        multiplier = 2;
    }

    let ot = 0;
    if (otHours > 0) {
        if (holiday.categories.mercantile && otHours > workingHoursTreshold) {
            ot =
                (workingHoursTreshold * basic * multiplier) / divideBy +
                ((otHours - workingHoursTreshold) * basic * 3) / divideBy; // tripleot
        } else {
            ot = (otHours * basic * multiplier) / divideBy;
        }
    }
    return {
        ot,
        otHours,
    };
};

export const calculateHolidayPay = (
    holidayText: string,
    workingHours: number,
    workingHoursTreshold: number,
    basic: number,
    divideBy: number
) => {
    const recordHolidays = new Set(
        holidayText.split(/[\s,]+/).map((h) => h.trim().toLowerCase())
    );

    let holidayPayMultiplier = 0;
    if (recordHolidays.has("mercantile") || recordHolidays.has("off")) {
        holidayPayMultiplier = 1; // Double pay for working, so bonus is 1x basic rate.
    } else if (recordHolidays.has("public")) {
        holidayPayMultiplier = 0.5; // 1.5x pay for working, so bonus is 0.5x basic rate.
    }

    let holidayPay = 0;
    if (holidayPayMultiplier > 0) {
        const basePayForHours =
            (basic / divideBy) * Math.min(workingHoursTreshold, workingHours);
        holidayPay = basePayForHours * holidayPayMultiplier;
    }

    return { holidayPay, holidayPayMultiplier };
};
