// Determine if inOut contains already processed records (objects) or unprocessed Dates
import { getHolidays } from "../calendar/holidays/holidayHelper";
import { ProcessedInOut, RawInOut } from "./generate/salaryGeneration";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { DailyCalculationService } from "./services/dailyCalculationService";
import {
  getShiftEnd,
  getShiftStart,
  getTimeDifferenceInMinutes,
  getWorkingDayStatus,
  getHoliday,
  calculateOT,
  calculateHolidayPay,
} from "./salaryHelper";

dayjs.extend(utc);
dayjs.extend(timezone);

export const processSalaryWithInOut = async (
  employee: any,
  period: string,
  inOut: RawInOut | ProcessedInOut,
  existingSalary: any = undefined,
  gen: boolean = false,
  timezone: string = "Asia/Colombo"
) => {


  const shifts = employee.shiftSettings?.shifts || [];
  const useShiftStartForOT = employee.shiftSettings?.useShiftStartForOT || employee.company?.shiftSettings?.useShiftStartForOT || false;
  const source = existingSalary || employee;

  // Determine if inOut contains already processed records (objects) or unprocessed Dates
  const isProcessed =
    Array.isArray(inOut) &&
    inOut.length > 0 &&
    (inOut as ProcessedInOut)[0].in !== undefined;

  const records: {
    in: string;
    out: string;
    break: number;
    workingHoursTreshold: number;
    halfDayTreshold: number;
    workingHours: number;
    otHours: number;
    ot: number;
    noPay: number;
    holiday: string;
    description: string;
    remark: string;
    day_status: "full" | "half" | "off";
  }[] = [];

  // Reusable function to calculate working hours, OT, and other fields
  const processRecord = (
    inDate: Date,
    outDate: Date,
    workingDayStatus: "full" | "half" | "off" = "full",
    holiday = {
      date: "",
      categories: {
        public: false,
        bank: false,
        mercantile: false,
      },
      summary: "",
    },
    remark = "",
    noPay = 0,
    displayInDate?: Date
  ) => {
    const result = DailyCalculationService.processDailyRecord(
      inDate,
      outDate,
      shifts,
      timezone,
      workingDayStatus,
      holiday,
      employee,
      { remark, noPay }
    );
    if (displayInDate) {
      result.in = displayInDate.toISOString();
    }
    records.push(result);
  };

  let holidays: any[] = [];
  if (isProcessed) {
    holidays = (
      await getHolidays(
        (inOut as any[])[0].in,
        (inOut as any[])[inOut.length - 1].out,
        employee.calendar
      )
    ).holidays;
    // Process the already processed records
    (inOut as ProcessedInOut).forEach((record) => {
      // Ensure dates are properly handled as UTC
      const inDate = new Date(record.in.endsWith('Z') ? record.in : record.in + 'Z');
      const outDate = new Date(record.out.endsWith('Z') ? record.out : record.out + 'Z');

      const workingDayStatus = getWorkingDayStatus(inDate, employee, record);
      const holiday = getHoliday(inDate, holidays);

      // Recalculate using the reusable function
      processRecord(
        inDate,
        outDate,
        workingDayStatus,
        holiday,
        record.remark,
        record.noPay
      );
    });
  } else {
    // Unprocessed, proceed to process Date[] input
    const {
      startDate,
      endDate,
      holidays: fetchedHolidays,
    } = await startEndDates(period, inOut as Date[], employee.calendar);
    holidays = fetchedHolidays;

    let day = new Date(startDate);
    let inOutIndex = 0;

    // Iterate through each day in the period
    while (day <= endDate) {
      let dayHasRecord = false;

      // Iterate through each inOut record
      while (
        inOut &&
        inOutIndex < inOut.length &&
        (inOut[inOutIndex] as Date) <= endDate
      ) {
        let inDate = inOut[inOutIndex] as Date;

        // Check if the current inDate is on the current day
        if (inDate.toDateString() !== day.toDateString()) {
          break; // If the inDate is for a different day, exit the loop to handle missing records
        }

        dayHasRecord = true; // Mark that this day has a record

        const closestShiftData = shifts.reduce(
          (
            acc: {
              shift: { startTime: string; endTime: string } | null;
              minDiff: number;
            },
            currentShift: { startTime: string; endTime: string }
          ) => {
            const currentDiff = Math.abs(
              getTimeDifferenceInMinutes(currentShift.startTime, inDate, timezone)
            );
            if (currentDiff < acc.minDiff) {
              return { shift: currentShift, minDiff: currentDiff };
            }
            return acc;
          },
          { shift: null, minDiff: Infinity }
        );

        const shift =
          closestShiftData.minDiff <= 6 * 60 ? closestShiftData.shift : null;

        if (!shift) {
          inOutIndex++;
          continue; // Move to the next inOut record
        }

        // Move to the next inOut record for out time
        inOutIndex++;

        let outDate: Date | null = null;
        if (inOutIndex >= inOut.length) {
          outDate = getShiftEnd(shift.endTime, inDate); // Default to shift end time
        } else {
          outDate = inOut[inOutIndex] as Date;
          const shiftEndDate = getShiftEnd(shift.endTime, inDate);
          const timeDifference =
            (outDate.getTime() - shiftEndDate.getTime()) / (1000 * 60);

          const shiftStartDate = getShiftStart(shift.startTime, inDate);

          if (
            (timeDifference >= 0 && timeDifference < 12 * 60) || // Allow 12 hours after shift end
            (timeDifference < 0 &&
              outDate.getTime() > shiftStartDate.getTime() &&
              timeDifference >= -12 * 60) // Allow before shift end up to 12 hours
          ) {
            inOutIndex++;
          } else {
            outDate = getShiftEnd(shift.endTime, inDate); // Default to shift end time
          }
        }

        const workingDayStatus = getWorkingDayStatus(
          inDate,
          employee,
          undefined
        );
        const holiday = getHoliday(inDate, holidays);

        // Shift Start Clamping Logic
        let effectiveInDate = inDate;
        let displayInDate: Date | undefined = undefined;

        if (useShiftStartForOT && !dayHasRecord && shift) {
          const shiftStart = getShiftStart(shift.startTime, inDate);
          // If actual IN is BEFORE shift start, clamp it.
          if (inDate < shiftStart) {
            effectiveInDate = shiftStart;
            displayInDate = inDate; // Preserve actual for display
          }
        }

        // Process the record for the current in/out
        processRecord(effectiveInDate, outDate, workingDayStatus, holiday, "", 0, displayInDate);

        // Move to the next day
        day.setUTCDate(outDate.getUTCDate() + 1);
      }

      const shift = shifts[0] || {
        start: "08:00", // Default shift start time
        end: "17:00", // Default shift end time
        break: 1, // Default break time in hours
      };
      // If no records exist for this day, create a record with shift start as both in and out times
      if (!dayHasRecord && !gen) {
        if (shift) {
          const inDate = new Date(day); // Mark the in time as the start of the shift

          const workingDayStatus = getWorkingDayStatus(
            inDate,
            employee,
            undefined
          );
          const holiday = getHoliday(inDate, holidays);

          // Process the record for the missing day
          processRecord(inDate, inDate, workingDayStatus, holiday); // Same inDate for both in and out
        }
      }

      // Move to the next day
      if (shift && shift.startTime) {
        const [startHour, startMinute] = shift.startTime.split(":").map(Number);
        day.setUTCHours(!isNaN(startHour) ? startHour : 8);
        day.setUTCMinutes(!isNaN(startMinute) ? startMinute : 0);
      } else {
        day.setUTCHours(8);
        day.setUTCMinutes(0);
      }
      day.setUTCDate(day.getUTCDate() + 1);
    }
  }

  let holidayPay = 0,
    ot = 0,
    noPay = 0,
    otNormalHours = 0,
    otDoubleHours = 0,
    leftEarlyHours = 0,
    absentDays = 0,
    lateDayHours = 0;

  records.forEach((record) => {
    noPay += record.noPay;
    const { holidayPay: recordHolidayPay, holidayPayMultiplier } =
      calculateHolidayPay(
        record.holiday,
        record.workingHours,
        record.workingHoursTreshold,
        employee.basic,
        employee.divideBy
      );

    if (holidayPayMultiplier > 0) {
      holidayPay += recordHolidayPay;
    } else {
      ot += record.ot;
    }

    const holiday = getHoliday(new Date(record.in), holidays);
    if (!holiday.categories.mercantile) {
      otNormalHours += record.otHours;
    } else {
      otDoubleHours += record.otHours;
    }

    if (record.description.includes("Left")) {
      leftEarlyHours += record.workingHoursTreshold - record.workingHours;
    }
    if (record.workingHours === 0 && record.description.includes("Absent")) {
      absentDays += 1;
    }
    if (record.description.includes("Came")) {
      const lateHours = parseFloat(
        record.description.match(/Came ([\d.]+) h late/)?.[1] || "0"
      );
      lateDayHours += lateHours;
    }
  });

  const otReason = [
    otNormalHours > 0 ? `${otNormalHours.toFixed(2)} normal OT h` : "",
    otDoubleHours > 0 ? `${otDoubleHours.toFixed(2)} double OT h` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const noPayReason = [
    absentDays > 0 ? `${absentDays} absent days` : "",
    leftEarlyHours > 0 ? `${leftEarlyHours.toFixed(2)}h left early` : "",
    lateDayHours > 0 ? `${lateDayHours.toFixed(2)}h came late` : "",
  ]
    .filter(Boolean)
    .join(", ");

  return {
    inOutProcessed: records,
    ot,
    otReason,
    noPay,
    noPayReason: existingSalary ? existingSalary.noPayReason : noPayReason,
    holidayPay,
  };
};

export const generateSalaryWithInOut = async (
  employee: any,
  period: string,
  inOut: RawInOut | ProcessedInOut,
  existingSalary: any = undefined,
  timezone: string = "Asia/Colombo"
) => {
  const shifts = employee.shiftSettings?.shifts || [];

  const generateRandomRecord = (day: Date) => {
    const workingDayStatus = getWorkingDayStatus(day, employee, undefined);
    const holidayStatus = getHoliday(day, holidays);
    let shift;
    //if no shift
    if (shifts.length === 0) {
      throw new Error(`No shift found for employee: ${employee.name}`);
    }
    if (shifts.length <= 1) {
      //if only one shift
      shift = shifts[0];
    } else {
      //if multiple shifts
      //get shift based on index and day
      let shiftIndex = (employee.index + day.getUTCDate() - 1) % shifts.length;
      shift = shifts[shiftIndex];

      // Check if this shift would end on the next day and if that day is an off day or holiday
      const shiftEndTime = getShiftEnd(shift.endTime, day);
      const nextDay = new Date(shiftEndTime);
      nextDay.setUTCDate(nextDay.getUTCDate());

      // Get working day status and holiday status for the next day
      const nextDayWorkingStatus = getWorkingDayStatus(
        nextDay,
        employee,
        undefined
      );
      const nextDayHoliday = getHoliday(nextDay, holidays);

      // If the next day is an off day or holiday, try to find a different shift
      if (
        nextDayWorkingStatus === "off" ||
        nextDayHoliday.categories.public ||
        nextDayHoliday.categories.mercantile
      ) {
        // Try to find a shift that doesn\'t end on an off day or holiday
        let foundAlternative = false;
        for (let i = 0; i < shifts.length; i++) {
          if (i !== shiftIndex) {
            const alternativeShift = shifts[i];
            const alternativeShiftEndTime = getShiftEnd(
              alternativeShift.endTime,
              day
            );
            const alternativeNextDay = new Date(alternativeShiftEndTime);
            alternativeNextDay.setUTCDate(alternativeNextDay.getUTCDate());

            const alternativeNextDayWorkingStatus = getWorkingDayStatus(
              alternativeNextDay,
              employee,
              undefined
            );
            const alternativeNextDayHoliday = getHoliday(
              alternativeNextDay,
              holidays
            );

            // If this alternative shift doesn\'t end on an off day or holiday, use it
            if (
              alternativeNextDayWorkingStatus !== "off" &&
              !alternativeNextDayHoliday.categories.public &&
              !alternativeNextDayHoliday.categories.mercantile
            ) {
              shift = alternativeShift;
              foundAlternative = true;
              break;
            }
          }
        }

        // If no alternative found, continue with the initial shift
        if (!foundAlternative) {
          // Keep the original shift selection
        }
      }
    }
    const probabilities = employee.probabilities || {};
    const absentProb =
      probabilities.absent !== undefined ? probabilities.absent / 100 : 0.05; // 5% chance to be absent
    const workOnOffProb =
      probabilities.workOnOff !== undefined
        ? probabilities.workOnOff / 100
        : 0.01; // 1% chance to work on off
    const workOnHolidayProb =
      probabilities.workOnHoliday !== undefined
        ? probabilities.workOnHoliday / 100
        : 0.01; // 1% chance to work on holiday
    const lateProb =
      probabilities.late !== undefined ? probabilities.late / 100 : 0.02; // 2% chance to come late
    const otProb =
      probabilities.ot !== undefined ? probabilities.ot / 100 : 0.8; // 80% chance to do OT

    const determinePresence = (
      workingDayStatus: string,
      holidayStatus: { categories: { mercantile: boolean; public: boolean } },
      absentProb: number,
      workOnOffProb: number,
      workOnHolidayProb: number
    ) => {
      let present = Math.random() < 1 - absentProb;
      const workOnOff = Math.random() < workOnOffProb;
      const workOnHoliday = Math.random() < workOnHolidayProb;

      // Determine presence based on working day status and holiday status
      if (
        (workingDayStatus === "off" && !workOnOff) ||
        ((holidayStatus.categories.mercantile ||
          holidayStatus.categories.public) &&
          !workOnHoliday)
      ) {
        present = false;
      }

      return present;
    };

    const calculateShiftTreshold = (start: string, end: string) => {
      const startHour = parseInt(start.split(":")[0]);
      const startMinutes = parseInt(start.split(":")[1]);
      const endHour = parseInt(end.split(":")[0]);
      const endMinutes = parseInt(end.split(":")[1]);
      // calculate the time in hours between shift
      const shiftDuration =
        ((endHour - startHour) * 60 + endMinutes - startMinutes) / 60;
      return shiftDuration >= 0 ? shiftDuration : shiftDuration + 24;
    };

    const present = determinePresence(
      workingDayStatus,
      holidayStatus,
      absentProb,
      workOnOffProb,
      workOnHolidayProb
    );

    let randomInOffset = 0;
    let randomOutOffset = 0;
    let inDate = new Date(day);
    let outDate = new Date(day);

    const halfDayTreshold = 6;
    // const fullDayTreshold = 8 + (shift.break || 1);
    const shiftTreshold = calculateShiftTreshold(shift.startTime, shift.endTime);

    if (!present) {
      //absent
      inDate.setUTCHours(
        Number(shift.startTime.split(":")[0]),
        Number(shift.startTime.split(":")[1])
      );
      outDate.setUTCHours(
        Number(shift.startTime.split(":")[0]),
        Number(shift.startTime.split(":")[1])
      );
    } //present
    else {
      //if otmethod random
      if (employee.otMethod === "random") {
        const inVaryEarlyMax = 60 * 0.5; // maximum early time in minutes
        const inVaryLateMax = 60 * 4; // maximum late time in minutes
        randomInOffset =
          Math.random() < lateProb
            ? Math.random() * inVaryLateMax // 2% chance to be late
            : -Math.random() * inVaryEarlyMax;

        const outVaryEarlyMax = 60 * 4; // maximum early time in minutes
        const outVaryLateMax = 60 * 4; // maximum late time in minutes
        randomOutOffset =
          Math.random() < otProb
            ? Math.random() * outVaryLateMax // 80% chance to do OT
            : Math.random() < lateProb
              ? -Math.random() * outVaryEarlyMax
              : 0;
      }

      //set in time to shift start + offset
      inDate.setUTCHours(
        Number(shift.startTime.split(":")[0]),
        Number(shift.startTime.split(":")[1]) + randomInOffset
      );
      //if half day
      if (workingDayStatus === "half") {
        outDate.setUTCHours(
          Number(shift.startTime.split(":")[0]) + halfDayTreshold,
          Number(shift.startTime.split(":")[1]) + randomOutOffset
        );
      } else {
        //full day
        outDate.setUTCHours(
          Number(shift.startTime.split(":")[0]) + shiftTreshold,
          Number(shift.startTime.split(":")[1]) + randomOutOffset
        );
      }

      //if employee.openHours is available then get the latest the employee can stay
      if (employee.openHours && !employee.openHours.allDay) {
        const maxOutTime = new Date(day);
        const randomOutOffset = 60; // maximum late time in minutes after closed
        maxOutTime.setUTCHours(
          Number(employee.openHours.end.split(":")[0]),
          Number(employee.openHours.end.split(":")[1]) + randomOutOffset
        );
        if (outDate > maxOutTime) {
          outDate = maxOutTime;
        }
      }
    }

    return {
      in: inDate.toISOString(),
      out: outDate.toISOString(),
      workingHours: 0,
      otHours: 0,
      ot: 0,
      noPay: 0,
      holiday: holidayStatus.summary,
      description: "",
      remark: "",
      day_status: workingDayStatus,
    };
  };

  const inOutProcessed: ProcessedInOut = [];
  //process existing
  const existingProcessed = await processSalaryWithInOut(
    employee,
    period,
    inOut,
    existingSalary,
    true
  );

  //push existing
  existingProcessed.inOutProcessed.forEach((record) => {
    inOutProcessed.push(record);
  });

  //get start end days
  const { startDate, endDate, holidays } = await startEndDates(
    period,
    inOut as Date[],
    employee.calendar
  );
  const day = new Date(startDate);

  // Generate records for missing days in parallel
  const generationPromises = [];
  while (day <= endDate) {
    const currentDate = new Date(day);
    if (
      !inOutProcessed.find(
        (record) =>
          new Date(record.in).getUTCDate() === currentDate.getUTCDate()
      )
    ) {
      generationPromises.push(
        new Promise((resolve) => {
          const generatedRecord = generateRandomRecord(currentDate);
          resolve(generatedRecord);
        })
      );
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }

  const newRecords = await Promise.all(generationPromises);
  inOutProcessed.push(...(newRecords.filter((record) => record) as any[]));

  //sort correctly
  inOutProcessed.sort((a, b) => {
    return (
      new Date(a.in as string).getTime() - new Date(b.in as string).getTime()
    );
  });

  //set updated data
  employee.basic = existingSalary ? existingSalary.basic : employee.basic;

  //reprocress all inouts
  const reprocessed = await processSalaryWithInOut(
    employee,
    period,
    inOutProcessed as ProcessedInOut,
    undefined,
    false,
    timezone
  );
  return reprocessed;
};

// Helper functions
const startEndDates = async (
  period: string | number | Date,
  inOut: (string | number | Date)[],
  calendar: string = "default"
) => {
  try {
    const periodStartDate = new Date(period);
    const inOutStartDate = inOut ? new Date(inOut[0]) : undefined;
    let startDate = new Date();
    const halfMonthInMillis = (30 * 24 * 60 * 60 * 1000) / 2; // Approximate half month in milliseconds

    // Determine start date logic (defaults to periodStartDate unless inOut is earlier and reasonable)
    // Note: checking if period is valid date first
    if (!isNaN(periodStartDate.getTime())) {
      if (
        inOutStartDate &&
        inOutStartDate < periodStartDate &&
        periodStartDate.getTime() - inOutStartDate.getTime() <= halfMonthInMillis
      ) {
        startDate = inOutStartDate;
      } else {
        startDate = periodStartDate;
      }
    } else {
      // Fallback if period cannot be parsed directly (though string logic handled below)
      startDate = new Date();
    }

    let endDate = new Date(startDate);

    // FIX: Properly calculate endDate based on period string format
    if (typeof period === 'string') {
      if (period.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Daily: endDate is same as startDate (end of day handled by comparison logic usually, or loop runs once)
        endDate = new Date(startDate);
      } else if (period.includes(" to ")) {
        // Range: endDate is the end date of the range
        const [start, end] = period.split(" to ");
        endDate = new Date(end);
      } else {
        // Monthly or Default: Add 1 month
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0); // Set to last day of the specific month
      }
    } else {
      // Fallback for Date object input (assumed monthly)
      endDate.setMonth(endDate.getMonth() + 1);
    }

    //holidays
    //transform to yyyy-mm-dd for holidays
    const startDateHoliday = startDate.toISOString().split("T")[0];
    const endDateHoliday = endDate.toISOString().split("T")[0];
    const holidayResponse = await getHolidays(
      startDateHoliday,
      endDateHoliday,
      calendar
    );
    if (!holidayResponse.holidays && holidayResponse.messege) {
      throw new Error(holidayResponse.messege);
    }

    const { holidays } = holidayResponse;
    return { startDate, endDate, holidays };
  } catch (err) {
    console.error("Error in startEndDates:", err);
    // Fallback
    return { startDate: new Date(), endDate: new Date(), holidays: [] };
  }
};

// Helpers moved to salaryHelper.ts
