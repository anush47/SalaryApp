import {
  generateSalaryWithInOut,
  processSalaryWithInOut,
} from "../salaryProcessing";
import { calculateLeaveDeductions } from "@/app/lib/leaveDeductionCalculation";
import { calculateTax } from "@/app/lib/taxCalculation";

// Types for InOut
export type RawInOut = Date[]; // Unprocessed in/out records
export type ProcessedInOut = {
  in: string;
  out: string;
  workingHours: number;
  otHours: number;
  ot: number;
  noPay: number;
  holiday: string;
  description: string;
  remark: string;
  day_status: "full" | "half" | "off";
}[];

function getFilteredAdditionsAndDeductions(paymentStructure: {
  additions: any[];
  deductions: any[];
}) {
  const additionsWithRanges = paymentStructure.additions.filter(
    (addition) =>
      typeof addition.amount === "string" && addition.amount.includes("-")
  );
  const additionsWithNull = paymentStructure.additions.filter(
    (addition) => addition.amount === null || addition.amount === ""
  );
  const deductionsWithRanges = paymentStructure.deductions.filter(
    (deduction) =>
      typeof deduction.amount === "string" &&
      deduction.amount.includes("-") &&
      deduction.name !== "EPF 8%"
  );
  const deductionsWithNull = paymentStructure.deductions.filter(
    (deduction) =>
      (deduction.amount === null || deduction.amount === "") &&
      deduction.name !== "EPF 8%"
  );

  return {
    additionsWithRanges,
    additionsWithNull,
    deductionsWithRanges,
    deductionsWithNull,
  };
}

function adjustDeductionsWithRanges(
  deductionsWithRanges: any[],
  parsedDeductions: any[],
  adjustmentRequired: number
) {
  deductionsWithRanges.forEach((deduction) => {
    const [min, max] = deduction.amount.split("-").map(Number);
    const parsedDeduction = parsedDeductions.find(
      (d) => d.name === deduction.name
    );

    if (parsedDeduction && Math.abs(adjustmentRequired) >= 100) {
      const optimalAdjustment = Math.max(
        min - parsedDeduction.amount,
        Math.round(-adjustmentRequired / 100) * 100
      );
      const newAmount = calculateOptimalValue(
        parsedDeduction.amount,
        optimalAdjustment,
        min,
        max
      );
      adjustmentRequired -= parsedDeduction.amount - newAmount;
      parsedDeduction.amount = newAmount;
    }
  });
}

function adjustAdditionsWithRanges(
  additionsWithRanges: any[],
  parsedAdditions: any[],
  adjustmentRequired: number
) {
  additionsWithRanges.forEach((addition) => {
    const [min, max] = addition.amount.split("-").map(Number);
    const parsedAddition = parsedAdditions.find((a) => a.name === addition.name);

    if (parsedAddition && Math.abs(adjustmentRequired) >= 100) {
      const optimalAdjustment = Math.min(
        max - parsedAddition.amount,
        Math.round(adjustmentRequired / 100) * 100
      );
      const newAmount = calculateOptimalValue(
        parsedAddition.amount,
        optimalAdjustment,
        min,
        max
      );
      adjustmentRequired -= newAmount - parsedAddition.amount;
      parsedAddition.amount = newAmount;
    }
  });
}

function adjustAdditionsWithNull(
  additionsWithNull: any[],
  parsedAdditions: any[],
  valuesToAdjust: any[],
  adjustmentRequired: number
) {
  additionsWithNull.forEach((addition) => {
    const parsedAddition = parsedAdditions.find((a) => a.name === addition.name);
    if (parsedAddition && Math.abs(adjustmentRequired) >= 100) {
      const newAmount = valuesToAdjust.shift() || 0;
      adjustmentRequired -= newAmount - parsedAddition.amount;
      parsedAddition.amount = newAmount;
    }
  });
}

function adjustDeductionsWithNull(
  deductionsWithNull: any[],
  parsedDeductions: any[],
  valuesToAdjust: any[],
  adjustmentRequired: number
) {
  deductionsWithNull.forEach((deduction) => {
    const parsedDeduction = parsedDeductions.find(
      (d) => d.name === deduction.name
    );
    if (parsedDeduction) {
      const [min, max] = deduction.amount.split("-").map(Number);
      const newAmount = calculateOptimalValue(
        parsedDeduction.amount,
        valuesToAdjust.shift() || 0,
        min,
        max
      );
      adjustmentRequired += parsedDeduction.amount - newAmount;
      parsedDeduction.amount = newAmount;
    }
  });
}

function calculateBasicForSalary(
  source: { basic: number },
  salary: { noPay: { amount: number } },
  holidayPay: number,
  parsedAdditions: any[],
  parsedDeductions: any[]
) {
  const totalAffectingAdditions = parsedAdditions.reduce((acc, curr) => {
    if (curr.affectTotalEarnings) {
      return acc + curr.amount;
    }
    return acc;
  }, 0);

  const totalAffectingDeductions = parsedDeductions.reduce((acc, curr) => {
    if (curr.affectTotalEarnings) {
      return acc + curr.amount;
    }
    return acc;
  }, 0);

  if (salary) {
    return (
      source.basic +
      salary.noPay.amount +
      holidayPay +
      totalAffectingAdditions -
      totalAffectingDeductions
    );
  }
  return source.basic + holidayPay + totalAffectingAdditions - totalAffectingDeductions;
}

function calculateOptimalValue(
  currentAmount: number,
  adjustment: number,
  min: number,
  max: number
) {
  let newAmount = currentAmount + adjustment;
  return Math.min(max, Math.max(min, newAmount));
}

function generateCenteredSequence(total: number) {
  return Array.from(
    { length: total },
    (_, i) =>
      i - Math.floor(total / 2) + (total % 2 === 0 && i >= total / 2 ? 1 : 0)
  );
}

// Helper function to check if inOut is already processed
function isProcessed(
  inOut: RawInOut | ProcessedInOut
): inOut is ProcessedInOut {
  return (
    Array.isArray(inOut) &&
    inOut.length > 0 &&
    typeof inOut[0] === "object" &&
    "workingHours" in inOut[0]
  );
}

function calculateSalaryDetails(
  source: {
    paymentStructure: {
      additions: {
        name: string;
        amount: string;
        affectTotalEarnings: boolean;
      }[];
      deductions: {
        name: string;
        amount: string;
        affectTotalEarnings: boolean;
      }[];
    };
    basic: number;
    totalSalary: number;
  },
  salary: {
    paymentStructure: {
      additions: {
        name: string;
        amount: string;
        affectTotalEarnings: boolean;
      }[];
      deductions: {
        name: string;
        amount: string;
        affectTotalEarnings: boolean;
      }[];
    };
    noPay: { amount: number };
  },
  ot: number,
  holidayPay: number
) {


  const parsedAdditions = (source.paymentStructure?.additions || []).map((addition) => ({
    name: addition.name,
    amount: parseValue(addition.name, addition.amount, source.basic),
    affectTotalEarnings: addition.affectTotalEarnings,
  }));

  const parsedDeductions = (source.paymentStructure?.deductions || [])
    .filter((deduction) => deduction.name !== "EPF 8%")
    .map((deduction) => ({
      name: deduction.name,
      amount: parseValue(deduction.name, deduction.amount, source.basic),
      affectTotalEarnings: deduction.affectTotalEarnings,
    }));

  if (source.totalSalary > 0) {
    const {
      additionsWithRanges,
      additionsWithNull,
      deductionsWithRanges,
      deductionsWithNull,
    } = getFilteredAdditionsAndDeductions(source.paymentStructure);

    const amountNeeded =
      Number(source.totalSalary) -
      ot -
      holidayPay -
      source.basic +
      (source.basic + holidayPay) * 0.08;

    // Reset amounts for ranged and null additions/deductions
    parsedAdditions.forEach((addition) => {
      if (
        additionsWithRanges.some((range) => range.name === addition.name) ||
        additionsWithNull.some((nullAdd) => nullAdd.name === addition.name)
      ) {
        addition.amount = 0;
      }
    });
    parsedDeductions.forEach((deduction) => {
      if (
        deductionsWithRanges.some((range) => range.name === deduction.name) ||
        deductionsWithNull.some((nullDed) => nullDed.name === deduction.name)
      ) {
        deduction.amount = 0;
      }
    });

    const totalAdditions = parsedAdditions.reduce(
      (total, addition) => total + addition.amount,
      0
    );
    const totalDeductions = parsedDeductions.reduce(
      (total, deduction) => total + deduction.amount,
      0
    );

    let adjustmentRequired = amountNeeded - (totalAdditions - totalDeductions);

    if (adjustmentRequired !== 0) {
      adjustDeductionsWithRanges(
        deductionsWithRanges,
        parsedDeductions,
        adjustmentRequired
      );
      adjustAdditionsWithRanges(
        additionsWithRanges,
        parsedAdditions,
        adjustmentRequired
      );

      const totalNullToAdjust =
        additionsWithNull.length + deductionsWithNull.length;
      const baseValue = adjustmentRequired / totalNullToAdjust;
      const valuesToAdjust = generateCenteredSequence(totalNullToAdjust).map(
        (i) => {
          const variation = i * (baseValue * 0.1); // 10% variation
          return Math.max(Math.round((baseValue + variation) / 100) * 100, 0);
        }
      );

      adjustAdditionsWithNull(
        additionsWithNull,
        parsedAdditions,
        valuesToAdjust,
        adjustmentRequired
      );
      adjustDeductionsWithNull(
        deductionsWithNull,
        parsedDeductions,
        valuesToAdjust,
        adjustmentRequired
      );
    }
  }

  let basicForSalary = calculateBasicForSalary(
    source,
    salary,
    holidayPay,
    parsedAdditions,
    parsedDeductions
  );

  parsedDeductions.push({
    name: "EPF 8%",
    amount: basicForSalary * 0.08,
    affectTotalEarnings: false,
  });

  const totalAdditions = parsedAdditions.reduce(
    (total, addition) => total + addition.amount,
    0
  );
  const totalDeductions = parsedDeductions.reduce(
    (total, deduction) => total + deduction.amount,
    0
  );

  return {
    parsedAdditions: parsedAdditions.filter(Boolean),
    parsedDeductions: parsedDeductions.filter(Boolean),
    totalAdditions,
    totalDeductions,
  };
}

// Helper function to parse the value for additions/deductions
function parseValue(name: string, value: string, basic: number): number {
  if (typeof value === "string" && value.includes("-")) {
    // If the value is a range like "2000-5000", pick a random multiple of 100 within the range
    const [min, max] = value.split("-").map(Number);
    const randomValue =
      Math.floor(Math.random() * ((max - min) / 100 + 1)) * 100 + min;
    return randomValue;
  } else if (
    value === "" ||
    value === undefined ||
    value === null ||
    isNaN(Number(value))
  ) {
    // If the value is empty or not a number, set a random value as a multiple of 100
    // based on 5% to 15% of the basic salary
    const randomValue = Math.floor((Math.random() * 0.1 + 0.05) * basic);
    return Math.round(randomValue / 100) * 100; // Round to the nearest multiple of 100
  } else {
    // Otherwise, it's a fixed value like "3000", so parse it as a number and round to nearest 100
    return Math.round(Number(value) / 100) * 100;
  }
}

// Helper function to generate a random object ID
function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16); // 4-byte timestamp in hex
  const randomPart = Math.random().toString(16).substr(2, 10); // 5-byte random hex string
  const counter = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0"); // 3-byte counter

  return timestamp + randomPart + counter;
}

// Function to generate salary for an employee
export async function generateSalaryForOneEmployee(
  employee: any,
  period: string,
  inOut: RawInOut | ProcessedInOut | undefined,
  salary?: any,
  timezone: string = "Asia/Colombo"
) {
  try {


    const source = salary || employee;

    // Calculate period duration in days
    let periodDays = 30; // Default to monthly
    if (period.match(/^\d{4}-\d{2}-\d{2}$/)) {
      periodDays = 1;
    } else if (period.includes(" to ")) {
      const [start, end] = period.split(" to ");
      const startDate = new Date(start);
      const endDate = new Date(end);
      periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    // Prorate basic salary if not monthly
    // Resolve rate divisor: Employee Override -> Company Default -> 30
    const companyDefaults = employee.company?.salaryPeriodDefaults;
    const rateDivisor = employee.rateDivisor || companyDefaults?.rateDivisor || 30;

    // Check if period is standard monthly (YYYY-MM)
    const isMonthly = /^\d{4}-\d{2}$/.test(period);

    let effectiveBasic = source.basic;
    if (!isMonthly && periodDays < 30) {
      effectiveBasic = (source.basic / rateDivisor) * periodDays;
      // Round to 2 decimals
      effectiveBasic = Math.round(effectiveBasic * 100) / 100;
    } else {
    }

    // User request: "basic is always monthly" -> This implies source.basic coming from employee is monthly. 
    // And "shoud be devided and used per day correctly" -> We just did that with effectiveBasic.

    source.divideBy = employee.divideBy || 240;
    source.totalSalary = parseValue("totalSalary", employee.totalSalary, 0);

    //if totalSalary then parse totalSalary to number
    if (source.totalSalary && source.totalSalary !== "") {
      // If totalSalary is provided, it is for the "selected one" (the period), so we use it directly as target.
      // But we need to pass a "basic" to parseValue for "percentage of basic" logic?
      // parseValue for totalSalary uses 3rd arg `source.basic` if value is percentage.
      source.totalSalary = parseValue(
        "totalSalary",
        source.totalSalary,
        effectiveBasic // Use calculated effectiveBasic
      );
    }

    let ot = 0;
    let noPay = 0;
    let otReason = "";
    let noPayReason = "";
    let inOutProcessed: ProcessedInOut | RawInOut = [];
    let holidayPay = 0;

    // Only sort if the data is unprocessed (RawInOut)
    if (inOut && !isProcessed(inOut)) {
      inOutProcessed =
        (inOut as RawInOut)?.sort(
          (a: Date, b: Date) => a.getTime() - b.getTime()
        ) || [];
    } else {
      inOutProcessed = inOut as ProcessedInOut; // If already processed, use it as is
    }
    // Choose the appropriate overtime calculation method
    switch (employee.otMethod) {
      case "noOt":
        ({ ot, otReason, noPay, noPayReason, inOutProcessed, holidayPay } =
          await noOtCalc(employee, period, inOutProcessed, salary, timezone));
        break;
      case "calc":
        ({ ot, otReason, noPay, noPayReason, inOutProcessed, holidayPay } =
          await OtCalc(employee, period, inOutProcessed, salary, timezone));
        break;
      default:
        ({ ot, otReason, noPay, noPayReason, inOutProcessed, holidayPay } =
          await randomCalc(employee, period, inOutProcessed, salary, timezone));
        break;
    }

    const {
      parsedAdditions,
      parsedDeductions,
      totalAdditions,
      totalDeductions,
    } = calculateSalaryDetails({ ...source, basic: effectiveBasic }, salary, ot, holidayPay);

    // Calculate leave deductions for no-pay leaves (only for non-attendance method to avoid double counting)
    let totalLeaveDeduction = 0;
    let leaveDeductions: any[] = [];
    let leaveDeductionReason = "";

    if (employee.calculationMethod !== "attendance") {
      const result = await calculateLeaveDeductions(
        employee._id,
        period,
        effectiveBasic, // Use effectiveBasic
        source.divideBy
      );
      totalLeaveDeduction = result.totalLeaveDeduction;
      leaveDeductions = result.leaveDeductions;
      leaveDeductionReason = result.leaveDeductionReason;
    }

    // Combine attendance-based noPay with leave deductions
    const totalNoPay = noPay + totalLeaveDeduction;

    // Combine noPay reasons
    const combinedNoPayReason = [noPayReason, leaveDeductionReason]
      .filter(Boolean)
      .join("; ");

    // Calculate tax based on salary components
    // TaxConfig: check employee.taxType
    // If not selected (!taxType) or "company", tax is calculated and deducted.
    // If "individual", tax is NOT calculated (and thus not deducted).

    let taxCalculation = {
      apitAmount: 0,
      stampDuty: 0,
      totalTax: 0,
      taxableIncome: 0,
      grossSalary: 0,
    };

    if (employee.taxType !== "individual") {
      taxCalculation = await calculateTax(
        effectiveBasic, // Use effectiveBasic
        holidayPay,
        parsedAdditions,
        ot,
        employee.company?.toString(), // Pass company ID for company-specific tax config
        period
      );
    }

    // Final salary calculation:
    // basic + holidayPay + totalAdditions + ot - totalDeductions - totalNoPay - totalTax
    // Note: EPF 8% is already in totalDeductions, and tax is calculated after EPF deduction

    // If taxType is individual, totalTax is 0.
    // If taxType is company or undefined, totalTax is calculated value.

    const finalSalary =
      effectiveBasic + // use effectiveBasic
      holidayPay +
      totalAdditions +
      ot -
      totalDeductions -
      totalNoPay -
      taxCalculation.totalTax;

    const salaryData = {
      _id: salary ? salary._id : generateObjectId(),
      inOut: inOutProcessed,
      employee: employee._id,
      period,
      basic: effectiveBasic, // Employee's effective basic salary
      holidayPay,
      noPay: {
        amount: totalNoPay, // No Pay deduction amount (attendance + leaves)
        reason: combinedNoPayReason, // Combined reason for no pay
      },
      ot: {
        amount: ot, // Overtime payment
        reason: otReason, // Reason for overtime
      },
      paymentStructure: {
        additions: parsedAdditions, // Additions with computed values
        deductions: parsedDeductions, // Deductions with computed values
      },
      taxes: {
        apitAmount: taxCalculation.apitAmount,
        stampDuty: taxCalculation.stampDuty,
        totalTax: taxCalculation.totalTax,
        taxableIncome: taxCalculation.taxableIncome,
        grossSalary: taxCalculation.grossSalary,
      },
      leaveDeductions, // Leave deductions array
      advanceAmount: salary ? salary.advanceAmount : 0, // Example advance amount
      finalSalary,
      remark: "",
    };

    return salaryData;
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

// Random overtime calculation
const randomCalc = async (
  employee: any,
  period: string,
  inOutProcessed: ProcessedInOut | RawInOut,
  salary: any,
  timezone: string
) => {
  let {
    inOutProcessed: processedInOut,
    ot,
    noPay,
    otReason,
    noPayReason,
    holidayPay,
  } = await generateSalaryWithInOut(employee, period, inOutProcessed, salary, timezone);

  return {
    ot,
    otReason,
    noPay,
    noPayReason,
    inOutProcessed: processedInOut,
    holidayPay,
  };
};

// No overtime calculation
const noOtCalc = async (
  employee: any,
  period: string,
  inOutProcessed: ProcessedInOut | RawInOut,
  salary: any,
  timezone: string
) => {
  let {
    inOutProcessed: processedInOut,
    ot,
    noPay,
    otReason,
    noPayReason,
    holidayPay,
  } = await generateSalaryWithInOut(employee, period, inOutProcessed, salary, timezone);

  return {
    ot,
    otReason,
    noPay,
    noPayReason,
    inOutProcessed: processedInOut,
    holidayPay,
  };
};

// Overtime calculation
const OtCalc = async (
  employee: any,
  period: string,
  inOutProcessed: ProcessedInOut | RawInOut,
  salary: any,
  timezone: string
) => {
  let {
    inOutProcessed: processedInOut,
    ot,
    noPay,
    otReason,
    noPayReason,
    holidayPay,
  } = await processSalaryWithInOut(employee, period, inOutProcessed, salary, false, timezone);
  return {
    ot,
    otReason,
    noPay,
    noPayReason,
    inOutProcessed: processedInOut,
    holidayPay,
  };
};
