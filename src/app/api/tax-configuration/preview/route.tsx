import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";
import { previewTax, calculateTax } from "@/app/lib/taxCalculation";

/**
 * POST /api/tax-configuration/preview
 * Preview tax calculation for given salary components
 *
 * This endpoint allows employers to test tax calculations before applying them.
 * Useful for understanding how different salary structures affect tax liability.
 *
 * Body:
 * - monthlySalary: number (for simple preview)
 * OR
 * - basic: number
 * - holidayPay: number (optional)
 * - additions: array (optional)
 * - ot: number (optional)
 * - companyId: string (optional, for company-specific tax config)
 * - period: string (optional, YYYY-MM format)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Employees cannot preview tax calculations
    if (session.user.role === "employee") {
      return NextResponse.json(
        { error: "Employees cannot preview tax calculations" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      monthlySalary,
      basic,
      holidayPay = 0,
      additions = [],
      ot = 0,
      companyId,
      period,
    } = body;

    let taxCalculation;

    // Simple preview with just monthly salary
    if (monthlySalary !== undefined) {
      if (typeof monthlySalary !== "number" || monthlySalary < 0) {
        return NextResponse.json(
          { error: "Monthly salary must be a positive number" },
          { status: 400 }
        );
      }

      taxCalculation = await previewTax(monthlySalary, companyId);
    }
    // Detailed preview with salary components
    else if (basic !== undefined) {
      if (typeof basic !== "number" || basic < 0) {
        return NextResponse.json(
          { error: "Basic salary must be a positive number" },
          { status: 400 }
        );
      }

      // Validate additions array
      if (additions && !Array.isArray(additions)) {
        return NextResponse.json(
          { error: "Additions must be an array" },
          { status: 400 }
        );
      }

      taxCalculation = await calculateTax(
        basic,
        holidayPay,
        additions,
        ot,
        companyId,
        period
      );
    } else {
      return NextResponse.json(
        {
          error: "Either monthlySalary or basic salary components required",
          example: {
            simple: { monthlySalary: 200000, companyId: "optional" },
            detailed: {
              basic: 180000,
              holidayPay: 10000,
              additions: [
                { name: "Transport", amount: 5000, affectTotalEarnings: true },
              ],
              ot: 15000,
              companyId: "optional",
              period: "2025-01",
            },
          },
        },
        { status: 400 }
      );
    }

    // Format the response
    return NextResponse.json({
      success: true,
      taxCalculation: {
        grossSalary: taxCalculation.grossSalary,
        totalEarnings: taxCalculation.totalEarnings,
        epfEmployee: {
          amount: taxCalculation.epfEmployee,
          percentage: 8,
          description: "Employee EPF contribution (8% of total earnings)",
        },
        taxableIncome: taxCalculation.taxableIncome,
        incomeAfterAllowance: taxCalculation.incomeAfterAllowance,
        apit: {
          amount: taxCalculation.apitAmount,
          breakdown: taxCalculation.taxBreakdown,
          description: "Advance Personal Income Tax (APIT)",
        },
        stampDuty: {
          amount: taxCalculation.stampDuty,
          description:
            taxCalculation.stampDuty > 0
              ? "Stamp duty (Rs. 25 for gross salary >= Rs. 50,000)"
              : "No stamp duty (gross salary < Rs. 50,000)",
        },
        totalTax: taxCalculation.totalTax,
        netSalary: taxCalculation.netSalary,
      },
      summary: {
        grossSalary: `Rs. ${taxCalculation.grossSalary.toLocaleString()}`,
        totalTax: `Rs. ${taxCalculation.totalTax.toLocaleString()}`,
        netSalary: `Rs. ${taxCalculation.netSalary.toLocaleString()}`,
        effectiveTaxRate: `${(
          (taxCalculation.totalTax / taxCalculation.totalEarnings) *
          100
        ).toFixed(2)}%`,
      },
    });
  } catch (error) {
    console.error("[POST /api/tax-configuration/preview] Error:", error);

    // Handle specific error cases
    if (error instanceof Error && error.message.includes("No active tax configuration")) {
      return NextResponse.json(
        {
          error: "Tax configuration not found",
          message: error.message,
          action: "Please contact administrator to set up tax configuration",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to preview tax calculation",
        message:
          error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
