import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../auth/[...nextauth]/options";
import dbConnect from "@/app/lib/db";
import TaxConfiguration from "@/app/models/TaxConfiguration";
import Company from "@/app/models/Company";

/**
 * GET /api/tax-configuration
 * Get tax configuration for a company or global default
 *
 * Query params:
 * - companyId (optional): Get company-specific tax config
 * - year (optional): Filter by year (default: current year)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : new Date().getFullYear();

    let query: any = {
      isActive: true,
      year,
    };

    // Role-based access control
    if (session.user.role === "employee") {
      return NextResponse.json(
        { error: "Employees cannot access tax configuration" },
        { status: 403 }
      );
    }

    // If companyId provided, try to find company-specific config first
    if (companyId) {
      // Verify user has access to this company
      if (session.user.role !== "admin") {
        const company = await Company.findById(companyId);
        if (!company) {
          return NextResponse.json(
            { error: "Company not found" },
            { status: 404 }
          );
        }
        // For employers, verify they own this company
        // This would need to be adjusted based on your Company model structure
      }

      // Try to find company-specific config
      const companyConfig = await TaxConfiguration.findOne({
        ...query,
        companyId,
      }).sort({ effectiveFrom: -1 });

      if (companyConfig) {
        return NextResponse.json({
          success: true,
          taxConfiguration: companyConfig,
          source: "company-specific",
        });
      }
    }

    // Fall back to global default configuration
    const defaultConfig = await TaxConfiguration.findOne({
      ...query,
      isDefault: true,
      companyId: { $exists: false },
    }).sort({ effectiveFrom: -1 });

    if (!defaultConfig) {
      return NextResponse.json(
        {
          error: "No active tax configuration found",
          message:
            "Please contact administrator to set up tax configuration",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      taxConfiguration: defaultConfig,
      source: "global-default",
    });
  } catch (error) {
    console.error("[GET /api/tax-configuration] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tax configuration",
        message:
          error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tax-configuration
 * Create a new tax configuration (Admin only)
 *
 * Body:
 * - year: number
 * - country: string (default: "LK")
 * - companyId: string (optional, for company-specific config)
 * - taxSlabs: array of tax slabs
 * - personalAllowance: { monthly, annual }
 * - qualifyingPaymentRelief: { epfRate, maxMonthly }
 * - stampDuty: { threshold, amount }
 * - effectiveFrom: Date
 * - effectiveTo: Date (optional)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin can create tax configurations
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only administrators can create tax configurations" },
        { status: 403 }
      );
    }

    await dbConnect();

    const body = await req.json();
    const {
      year,
      country = "LK",
      companyId,
      taxSlabs,
      personalAllowance,
      qualifyingPaymentRelief,
      stampDuty,
      otherDeductions = [],
      effectiveFrom,
      effectiveTo,
    } = body;

    // Validation
    if (!year || !taxSlabs || !personalAllowance || !effectiveFrom) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["year", "taxSlabs", "personalAllowance", "effectiveFrom"],
        },
        { status: 400 }
      );
    }

    // Validate tax slabs
    if (!Array.isArray(taxSlabs) || taxSlabs.length === 0) {
      return NextResponse.json(
        { error: "Tax slabs must be a non-empty array" },
        { status: 400 }
      );
    }

    // If companyId provided, verify company exists
    if (companyId) {
      const company = await Company.findById(companyId);
      if (!company) {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 }
        );
      }
    }

    // Create new tax configuration
    const newTaxConfig = await TaxConfiguration.create({
      year,
      country,
      companyId: companyId || undefined,
      isDefault: !companyId, // Global if no company specified
      taxSlabs,
      personalAllowance,
      qualifyingPaymentRelief: qualifyingPaymentRelief || {
        epfRate: 0.08,
        maxMonthly: null,
      },
      stampDuty: stampDuty || {
        threshold: 50000,
        amount: 25,
      },
      otherDeductions,
      isActive: true,
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tax configuration created successfully",
        taxConfiguration: newTaxConfig,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/tax-configuration] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to create tax configuration",
        message:
          error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tax-configuration
 * Update an existing tax configuration (Admin only)
 *
 * Body:
 * - id: string (tax configuration ID)
 * - ... other fields to update
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin can update tax configurations
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only administrators can update tax configurations" },
        { status: 403 }
      );
    }

    await dbConnect();

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Tax configuration ID is required" },
        { status: 400 }
      );
    }

    // Find and update
    const taxConfig = await TaxConfiguration.findById(id);
    if (!taxConfig) {
      return NextResponse.json(
        { error: "Tax configuration not found" },
        { status: 404 }
      );
    }

    // Update fields
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        (taxConfig as any)[key] = updates[key];
      }
    });

    await taxConfig.save();

    return NextResponse.json({
      success: true,
      message: "Tax configuration updated successfully",
      taxConfiguration: taxConfig,
    });
  } catch (error) {
    console.error("[PUT /api/tax-configuration] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to update tax configuration",
        message:
          error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tax-configuration
 * Deactivate a tax configuration (soft delete)
 *
 * Query params:
 * - id: Tax configuration ID
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin can delete tax configurations
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only administrators can delete tax configurations" },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Tax configuration ID is required" },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false
    const taxConfig = await TaxConfiguration.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!taxConfig) {
      return NextResponse.json(
        { error: "Tax configuration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tax configuration deactivated successfully",
    });
  } catch (error) {
    console.error("[DELETE /api/tax-configuration] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete tax configuration",
        message:
          error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
