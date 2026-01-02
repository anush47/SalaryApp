import TaxConfiguration from "../models/TaxConfiguration";
import dbConnect from "./db";

/**
 * Tax Calculation Helper for Sri Lankan APIT (Advance Personal Income Tax)
 *
 * This module handles all tax-related calculations based on Sri Lankan tax laws.
 * Tax configurations are stored in the TaxConfiguration model and can be customized
 * per company or use the global default.
 *
 * Effective from April 1, 2025:
 * - Personal Relief: Rs. 150,000/month (Rs. 1,800,000/year)
 * - Progressive tax rates: 6% to 36%
 * - EPF 8% deducted before tax calculation
 * - Stamp Duty: Rs. 25 if gross salary >= Rs. 50,000
 */

interface TaxSlab {
  min: number;
  max: number;
  rate: number;
  fixedAmount: number;
}

interface TaxCalculationResult {
  grossSalary: number;
  totalEarnings: number;
  epfEmployee: number;
  taxableIncome: number;
  incomeAfterAllowance: number;
  apitAmount: number;
  stampDuty: number;
  totalTax: number;
  netSalary: number;
  taxBreakdown: {
    slab: string;
    rate: number;
    taxableAmount: number;
    taxAmount: number;
  }[];
}

/**
 * Get the active tax configuration for a specific date and company
 * Falls back to global default if no company-specific config exists
 */
export async function getTaxConfiguration(
  date: Date = new Date(),
  companyId?: string
): Promise<any> {
  await dbConnect();

  // First, try to find company-specific tax configuration
  if (companyId) {
    const companyConfig = await TaxConfiguration.findOne({
      companyId,
      isActive: true,
      effectiveFrom: { $lte: date },
      $or: [{ effectiveTo: { $gte: date } }, { effectiveTo: null }],
    }).sort({ effectiveFrom: -1 });

    if (companyConfig) {
      return companyConfig;
    }
  }

  // Fall back to global default configuration
  const defaultConfig = await TaxConfiguration.findOne({
    companyId: { $exists: false },
    isActive: true,
    effectiveFrom: { $lte: date },
    $or: [{ effectiveTo: { $gte: date } }, { effectiveTo: null }],
  }).sort({ effectiveFrom: -1 });

  if (!defaultConfig) {
    throw new Error(
      "No active tax configuration found. Please contact administrator."
    );
  }

  return defaultConfig;
}

/**
 * Calculate progressive APIT tax based on tax slabs
 *
 * Progressive taxation means each portion of income is taxed at its corresponding rate.
 * For example, if income is Rs. 300,000:
 * - First Rs. 150,000: 0% (personal relief)
 * - Next Rs. 83,333 (150,001-233,333): 6%
 * - Next Rs. 41,667 (233,334-275,000): 18%
 * - Remaining Rs. 25,000 (275,001-300,000): 24%
 */
export function calculateProgressiveTax(
  incomeAfterAllowance: number,
  taxSlabs: TaxSlab[]
): {
  apitAmount: number;
  taxBreakdown: {
    slab: string;
    rate: number;
    taxableAmount: number;
    taxAmount: number;
  }[];
} {
  if (incomeAfterAllowance <= 0) {
    return { apitAmount: 0, taxBreakdown: [] };
  }

  let totalTax = 0;
  const taxBreakdown: {
    slab: string;
    rate: number;
    taxableAmount: number;
    taxAmount: number;
  }[] = [];

  // Sort tax slabs by min value to ensure correct order
  const sortedSlabs = [...taxSlabs].sort((a, b) => a.min - b.min);

  for (let i = 0; i < sortedSlabs.length; i++) {
    const slab = sortedSlabs[i];

    // Skip if income hasn't reached this slab
    if (incomeAfterAllowance <= slab.min) {
      break;
    }

    // Calculate taxable amount in this slab
    const slabMax = slab.max === Infinity ? incomeAfterAllowance : slab.max;
    const taxableInThisSlab = Math.min(incomeAfterAllowance, slabMax) - slab.min;

    if (taxableInThisSlab > 0) {
      const taxForThisSlab = taxableInThisSlab * (slab.rate / 100);
      totalTax += taxForThisSlab;

      taxBreakdown.push({
        slab: `Rs. ${slab.min.toLocaleString()} - ${slab.max === Infinity
            ? "Above"
            : `Rs. ${slab.max.toLocaleString()}`
          }`,
        rate: slab.rate,
        taxableAmount: taxableInThisSlab,
        taxAmount: taxForThisSlab,
      });
    }
  }

  return {
    apitAmount: Math.round(totalTax * 100) / 100, // Round to 2 decimal places
    taxBreakdown,
  };
}

/**
 * Calculate stamp duty based on gross salary threshold
 */
export function calculateStampDuty(
  grossSalary: number,
  stampDutyConfig: { threshold: number; amount: number }
): number {
  return grossSalary >= stampDutyConfig.threshold ? stampDutyConfig.amount : 0;
}

/**
 * Main tax calculation function
 *
 * Calculates complete tax breakdown for a given salary including:
 * - EPF 8% employee contribution
 * - APIT (progressive income tax)
 * - Stamp duty
 *
 * @param basic - Basic salary
 * @param holidayPay - Holiday pay amount
 * @param additions - Array of salary additions
 * @param ot - Overtime amount
 * @param companyId - Optional company ID for company-specific tax config
 * @param period - Salary period (YYYY-MM format)
 */
export async function calculateTax(
  basic: number,
  holidayPay: number,
  additions: { name: string; amount: number; affectTotalEarnings: boolean }[],
  ot: number,
  companyId?: string,
  period?: string
): Promise<TaxCalculationResult> {
  // Get tax configuration
  let periodDate = new Date();

  if (period) {
    if (period.match(/^\d{4}-\d{2}$/)) {
      // Monthly format (YYYY-MM) -> Append -01
      periodDate = new Date(period + "-01");
    } else if (period.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Daily format (YYYY-MM-DD) -> Use as is
      periodDate = new Date(period);
    } else {
      // Other formats (e.g. ranges) -> extracting start date or defaulting to now
      // Try to extract the first date if it's a range
      const match = period.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        periodDate = new Date(match[1]);
      }
    }
  }

  // Validate date
  if (isNaN(periodDate.getTime())) {
    console.warn(`[TaxCalculation] Invalid period format: ${period}, defaulting to current date`);
    periodDate = new Date();
  }

  const taxConfig = await getTaxConfiguration(periodDate, companyId);

  // Calculate gross salary (components that contribute to taxable income)
  const additionsAffectingEarnings = additions
    .filter((a) => a.affectTotalEarnings)
    .reduce((sum, a) => sum + a.amount, 0);

  const grossSalary = basic + holidayPay + additionsAffectingEarnings;

  // Calculate total earnings for EPF calculation (includes OT and all additions)
  const totalAdditions = additions.reduce((sum, a) => sum + a.amount, 0);
  const totalEarnings = basic + holidayPay + totalAdditions + ot;

  // EPF 8% employee contribution (deducted from total earnings)
  const epfEmployee = totalEarnings * taxConfig.qualifyingPaymentRelief.epfRate;

  // Taxable income = gross salary - EPF 8%
  // The personal allowance (first Rs. 150,000) is already represented
  // in the tax slabs as the 0% tax bracket, so we don't subtract it separately
  const taxableIncome = grossSalary - epfEmployee;

  // For display purposes, we track what would be the "income after allowance"
  // but in Sri Lankan APIT system, the first slab IS the personal relief
  const personalAllowance = taxConfig.personalAllowance.monthly;
  const incomeAfterAllowance = taxableIncome;

  // Calculate progressive APIT
  // The tax slabs already include the personal relief as the first 0% slab
  const { apitAmount, taxBreakdown } = calculateProgressiveTax(
    incomeAfterAllowance,
    taxConfig.taxSlabs
  );

  // Calculate stamp duty
  const stampDuty = calculateStampDuty(grossSalary, taxConfig.stampDuty);

  // Total tax
  const totalTax = apitAmount + stampDuty;

  // Net salary (before other deductions and noPay)
  // Note: This is a partial calculation. Final salary will be:
  // totalEarnings - epfEmployee - totalTax - otherDeductions - noPay
  const netSalary = totalEarnings - epfEmployee - totalTax;

  return {
    grossSalary,
    totalEarnings,
    epfEmployee,
    taxableIncome,
    incomeAfterAllowance,
    apitAmount,
    stampDuty,
    totalTax,
    netSalary,
    taxBreakdown,
  };
}

/**
 * Quick tax preview for a given monthly salary
 * Useful for employers to test different salary scenarios
 */
export async function previewTax(
  monthlySalary: number,
  companyId?: string
): Promise<TaxCalculationResult> {
  return calculateTax(monthlySalary, 0, [], 0, companyId);
}

/**
 * Get default Sri Lankan tax slabs for 2025
 * These match the official IRD tax tables effective from April 1, 2025
 */
export function getDefaultTaxSlabs2025(): TaxSlab[] {
  return [
    {
      min: 0,
      max: 150000,
      rate: 0,
      fixedAmount: 0,
    },
    {
      min: 150000,
      max: 233333,
      rate: 6,
      fixedAmount: 0,
    },
    {
      min: 233333,
      max: 275000,
      rate: 18,
      fixedAmount: 0,
    },
    {
      min: 275000,
      max: 316667,
      rate: 24,
      fixedAmount: 0,
    },
    {
      min: 316667,
      max: 358333,
      rate: 30,
      fixedAmount: 0,
    },
    {
      min: 358333,
      max: Infinity,
      rate: 36,
      fixedAmount: 0,
    },
  ];
}
