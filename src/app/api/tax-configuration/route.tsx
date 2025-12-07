import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../auth/[...nextauth]/options";
import dbConnect from "@/app/lib/db";
import TaxConfiguration, { ITaxConfiguration } from "@/app/models/TaxConfiguration";
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

    // Find the base configuration for the year
    const baseConfig = await TaxConfiguration.findOne({
      year,
      country: "LK",
      isActive: true,
    }).lean<ITaxConfiguration>();

    if (!baseConfig) {
      return NextResponse.json(
        { error: "No active tax configuration found for the year." },
        { status: 404 }
      );
    }

    // If a companyId is provided, check for an override
    if (companyId) {
      const override = baseConfig.overrides?.find(
        (o) => o.companyId.toString() === companyId
      );

      if (override) {
        // Merge the override with the base config
        const mergedConfig = {
          ...baseConfig,
          taxSlabs: override.taxSlabs || baseConfig.taxSlabs,
          personalAllowance: override.personalAllowance || baseConfig.personalAllowance,
          isOverride: true, // Add a flag to indicate this is an override
        };
        delete (mergedConfig as any).overrides; // Clean up the response

        return NextResponse.json({
          success: true,
          taxConfiguration: mergedConfig,
          source: "company-specific-override",
        });
      }
    }

    // If no companyId or no override found, return the default base config
    const defaultConfig = { ...baseConfig, isOverride: false };
    delete (defaultConfig as any).overrides;

    return NextResponse.json({
      success: true,
      taxConfiguration: defaultConfig,
      source: "global-default",
    });
  } catch (error) {
    console.error("[GET /api/tax-configuration] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tax configuration" },
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

    if (session.user.role === 'employee') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const body = await req.json();
    const {
      year,
      companyId,
      taxSlabs,
      personalAllowance,
    } = body;

    if (!year || !companyId) {
      return NextResponse.json(
        { error: "Missing required fields: year, companyId" },
        { status: 400 }
      );
    }

    // Security Check: Ensure employer is modifying their own company
    if (session.user.role === 'employer') {
      const company = await Company.findById(companyId);
      if (!company || company.user.toString() !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const baseConfig = await TaxConfiguration.findOne({ year, country: "LK" });

    if (!baseConfig) {
      // If no base config for the year, admin must create it.
      // For now, let's handle creating a base config if admin.
      if (session.user.role === 'admin' && !companyId) {
        const newBaseConfig = await TaxConfiguration.create(body);
        return NextResponse.json(
          {
            success: true,
            message: "Base tax configuration created successfully.",
            taxConfiguration: newBaseConfig,
          },
          { status: 201 }
        );
      }
      return NextResponse.json(
        { error: `No base tax configuration found for the year ${year}. Admin must create one first.` },
        { status: 404 }
      );
    }

    const overrideIndex = baseConfig.overrides.findIndex(
      (o: any) => o.companyId.toString() === companyId
    );

    const overrideData = {
      companyId,
      taxSlabs,
      personalAllowance
    };

    if (overrideIndex > -1) {
      // Update existing override
      baseConfig.overrides[overrideIndex] = { ...baseConfig.overrides[overrideIndex].toObject(), ...overrideData };
    } else {
      // Add new override
      baseConfig.overrides.push(overrideData);
    }

    await baseConfig.save();

    return NextResponse.json(
      {
        success: true,
        message: "Company tax override saved successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/tax-configuration] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to save tax configuration override",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
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
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const taxConfig = await TaxConfiguration.findByIdAndUpdate(id, updates, { new: true });

    if (!taxConfig) {
      return NextResponse.json(
        { error: "Tax configuration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Base tax configuration updated successfully",
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

    if (session.user.role === 'employee') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : new Date().getFullYear();

    if (!companyId || !year) {
      return NextResponse.json(
        { error: "companyId and year are required" },
        { status: 400 }
      );
    }

    // Security Check: Ensure employer is modifying their own company
    if (session.user.role === 'employer') {
      const company = await Company.findById(companyId);
      if (!company || company.user.toString() !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const result = await TaxConfiguration.updateOne(
      { year, country: "LK" },
      { $pull: { overrides: { companyId } } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "No tax override found for this company to delete." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Company tax override has been reset to global default.",
    });
  } catch (error) {
    console.error("[DELETE /api/tax-configuration] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to reset tax configuration",
        message:
          error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
