import {
  generateSalaryWithInOut,
  processSalaryWithInOut,
} from "../salaryProcessing";

// Types for InOut
export type RawInOut = Date[]; // Unprocessed in/out records
export type ProcessedInOut = {
  in: String;
  out: String;
  workingHours: number;
  otHours: number;
  ot: number;
  noPay: number;
  holiday: string;
  description: string;
  remark: string;
}[];

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
  let parsedAdditions = source.paymentStructure.additions.map(
    (addition: {
      name: string;
      amount: string;
      affectTotalEarnings: boolean;
    }) => ({
      name: addition.name,
      amount: parseValue(addition.name, addition.amount, source.basic),
      affectTotalEarnings: addition.affectTotalEarnings,
    })
  );

  let parsedDeductions = source.paymentStructure.deductions.reduce(
    (
      acc: { name: string; amount: number; affectTotalEarnings: boolean }[],
      deduction: { name: string; amount: string; affectTotalEarnings: boolean }
    ) => {
      if (deduction && deduction.name !== "EPF 8%") {
        acc.push({
          name: deduction.name,
          amount: parseValue(deduction.name, deduction.amount, source.basic),
          affectTotalEarnings: deduction.affectTotalEarnings,
        });
      }
      return acc;
    },
    []
  );

  if (source.totalSalary > 0) {
    const getFilteredAdditionsAndDeductions = () => {
      const additionsWithRanges = source.paymentStructure.additions.filter(
        (addition) =>
          typeof addition.amount === "string" && addition.amount.includes("-")
      );

      // get the additions with null or ""
      const additionsWithNull = source.paymentStructure.additions.filter(
        (addition) => addition.amount === null || addition.amount === ""
      );

      // get the deductions with ranges
      const deductionsWithRanges = source.paymentStructure.deductions.filter(
        (deduction) =>
          typeof deduction.amount === "string" &&
          deduction.amount.includes("-") &&
          deduction.name !== "EPF 8%"
      );

      // get the deductions with null or ""
      const deductionsWithNull = source.paymentStructure.deductions.filter(
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
    };

    const {
      additionsWithRanges,
      additionsWithNull,
      deductionsWithRanges,
      deductionsWithNull,
    } = getFilteredAdditionsAndDeductions();

    const amountNeeded =
      Number(source.totalSalary) -
      ot -
      holidayPay -
      source.basic +
      (source.basic + holidayPay) * 0.08;

    //change the  parsedAdditions and parsedDeductions in additions with range, null to 0
    parsedAdditions = parsedAdditions.map((addition) => {
      if (
        additionsWithRanges.some((range) => range.name === addition.name) ||
        additionsWithNull.some(
          (nullAddition) => nullAddition.name === addition.name
        )
      ) {
        return { ...addition, amount: 0 };
      }
      return addition;
    });
    parsedDeductions = parsedDeductions.map((deduction) => {
      if (
        deductionsWithRanges.some((range) => range.name === deduction.name) ||
        deductionsWithNull.some(
          (nullDeduction) => nullDeduction.name === deduction.name
        )
      ) {
        return { ...deduction, amount: 0 };
      }
      return deduction;
    });

    //calculate additions and deductions to
    const totalAdditions = parsedAdditions.reduce(
      (total: number, addition: { amount: number }) => total + addition.amount,
      0
    );
    const totalDeductions = parsedDeductions.reduce(
      (total: number, deduction: { amount: number } | undefined) =>
        total + (deduction ? deduction.amount : 0),
      0
    );

    let adjustmentRequired = amountNeeded - (totalAdditions - totalDeductions);

    if (adjustmentRequired !== 0) {
      // Helper to calculate optimal value within range
      const calculateOptimalValue = (
        currentAmount: number,
        adjustment: number,
        min: number,
        max: number
      ) => {
        let newAmount = currentAmount + adjustment;
        return Math.min(max, Math.max(min, newAmount));
      };

      // Adjust deductions with specified ranges
      deductionsWithRanges.forEach((deduction) => {
        const [min, max] = deduction.amount.split("-").map(Number);

        parsedDeductions.forEach((parsedDeduction) => {
          if (parsedDeduction.name === deduction.name) {
            if (Math.abs(adjustmentRequired) < 100) return;

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
      });

      // Adjust additions with specified ranges
      additionsWithRanges.forEach((addition) => {
        const [min, max] = addition.amount.split("-").map(Number);

        parsedAdditions.forEach((parsedAddition) => {
          if (parsedAddition.name === addition.name) {
            if (Math.abs(adjustmentRequired) < 100) return;

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
      });

      // Calculate total number of null additions/deductions to adjust
      const totalNullToAdjust =
        additionsWithNull.length + deductionsWithNull.length;

      // Generate values for adjustment
      const baseValue = adjustmentRequired / totalNullToAdjust;
      const generateCenteredSequence = (total: number) =>
        Array.from(
          { length: total },
          (_, i) =>
            i -
            Math.floor(total / 2) +
            (total % 2 === 0 && i >= total / 2 ? 1 : 0)
        );

      const valuesToAdjust = generateCenteredSequence(totalNullToAdjust).map(
        (i) => {
          const variation = i * (baseValue * 0.1); // 10% variation
          return Math.max(Math.round((baseValue + variation) / 100) * 100, 0);
        }
      );

      // Adjust additions with null values
      additionsWithNull.forEach((addition) => {
        parsedAdditions.forEach((parsedAddition) => {
          if (parsedAddition.name === addition.name) {
            if (Math.abs(adjustmentRequired) < 100) return;

            const newAmount = valuesToAdjust.shift() || 0;
            adjustmentRequired -= newAmount - Number(parsedAddition.amount);
            parsedAddition.amount = newAmount;
          }
        });
      });

      // Adjust deductions with null values
      deductionsWithNull.forEach((deduction) => {
        parsedDeductions.forEach((parsedDeduction) => {
          if (parsedDeduction.name === deduction.name) {
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
      });

      // Final debugging logs
      // console.log("Remaining adjustmentRequired:", adjustmentRequired);
      // console.log("Final parsedAdditions:", parsedAdditions);
      // console.log("Final parsedDeductions:", parsedDeductions);
    }
  }

  let basicForSalary = 0;
  if (salary) {
    basicForSalary =
      source.basic +
      salary.noPay.amount +
      holidayPay +
      parsedAdditions.reduce((acc, curr) => {
        if (curr.affectTotalEarnings) {
          return acc + curr.amount;
        }
        return acc;
      }, 0) -
      parsedDeductions.reduce((acc, curr) => {
        if (curr.affectTotalEarnings) {
          return acc + curr.amount;
        }
        return acc;
      }, 0);
  } else {
    basicForSalary =
      source.basic +
      holidayPay +
      parsedAdditions.reduce((acc, curr) => {
        if (curr.affectTotalEarnings) {
          return acc + curr.amount;
        }
        return acc;
      }, 0) -
      parsedDeductions.reduce((acc, curr) => {
        if (curr.affectTotalEarnings) {
          return acc + curr.amount;
        }
        return acc;
      }, 0);
  }

  parsedDeductions.push({
    name: "EPF 8%",
    amount: basicForSalary * 0.08,
    affectTotalEarnings: false,
  });

  //remove undefined
  parsedDeductions = parsedDeductions.filter(
    (deduction: { name: string; amount: number } | undefined) => deduction
  );

  parsedAdditions = parsedAdditions.filter(
    (addition: { name: string; amount: number }) => addition
  );

  const totalAdditions = parsedAdditions.reduce(
    (total: number, addition: { amount: number }) => total + addition.amount,
    0
  );

  const totalDeductions = parsedDeductions.reduce(
    (total: number, deduction: { amount: number } | undefined) =>
      total + (deduction ? deduction.amount : 0),
    0
  );

  return {
    parsedAdditions,
    parsedDeductions,
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
  salary?: any
) {
  try {
    const source = salary || employee;

    source.divideBy = employee.divideBy || 240;
    source.totalSalary = parseValue("totalSalary", employee.totalSalary, 0);

    //if totalSalary then parse totalSalary to number
    if (source.totalSalary && source.totalSalary !== "") {
      source.totalSalary = parseValue(
        "totalSalary",
        source.totalSalary,
        source.basic
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
          await noOtCalc(employee, period, inOutProcessed, salary));
        break;
      case "calc":
        ({ ot, otReason, noPay, noPayReason, inOutProcessed, holidayPay } =
          await OtCalc(employee, period, inOutProcessed, salary));
        break;
      default:
        ({ ot, otReason, noPay, noPayReason, inOutProcessed, holidayPay } =
          await randomCalc(employee, period, inOutProcessed, salary));
        break;
    }

    const {
      parsedAdditions,
      parsedDeductions,
      totalAdditions,
      totalDeductions,
    } = calculateSalaryDetails(source, salary, ot, holidayPay);

    const finalSalary =
      employee.basic +
      holidayPay +
      totalAdditions +
      ot -
      totalDeductions -
      noPay;

    const salaryData = {
      _id: salary ? salary._id : generateObjectId(),
      inOut: inOutProcessed,
      employee: employee._id,
      period,
      basic: source.basic, // Employee's basic salary
      holidayPay,
      noPay: {
        amount: noPay, // No Pay deduction amount
        reason: noPayReason, // Reason for no pay
      },
      ot: {
        amount: ot, // Overtime payment
        reason: otReason, // Reason for overtime
      },
      paymentStructure: {
        additions: parsedAdditions, // Additions with computed values
        deductions: parsedDeductions, // Deductions with computed values
      },
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
  salary: any
) => {
  let {
    inOutProcessed: processedInOut,
    ot,
    noPay,
    otReason,
    noPayReason,
    holidayPay,
  } = await generateSalaryWithInOut(employee, period, inOutProcessed, salary);

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
  salary: any
) => {
  let {
    inOutProcessed: processedInOut,
    ot,
    noPay,
    otReason,
    noPayReason,
    holidayPay,
  } = await generateSalaryWithInOut(employee, period, inOutProcessed, salary);

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
  salary: any
) => {
  let {
    inOutProcessed: processedInOut,
    ot,
    noPay,
    otReason,
    noPayReason,
    holidayPay,
  } = await processSalaryWithInOut(employee, period, inOutProcessed, salary);
  return {
    ot,
    otReason,
    noPay,
    noPayReason,
    inOutProcessed: processedInOut,
    holidayPay,
  };
};
