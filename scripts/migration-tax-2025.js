/**
 * Tax Configuration Migration Script for 2025
 *
 * This script creates/updates the default tax configuration for Sri Lankan
 * APIT (Advance Personal Income Tax) effective from April 1, 2025.
 *
 * Key Changes in 2025:
 * - Personal relief increased from Rs. 1,200,000 to Rs. 1,800,000 annually
 * - Monthly personal relief: Rs. 150,000 (up from Rs. 100,000)
 * - Progressive tax rates: 6% to 36%
 *
 * Usage:
 * node scripts/migration-tax-2025.js
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error("❌ Error: MONGO_URL not found in environment variables");
  process.exit(1);
}

// Tax Configuration Schema (simplified for migration)
const taxConfigurationSchema = new mongoose.Schema(
  {
    year: Number,
    country: String,
    companyId: mongoose.Schema.Types.ObjectId,
    isDefault: Boolean,
    taxSlabs: [
      {
        min: Number,
        max: Number,
        rate: Number,
        fixedAmount: Number,
      },
    ],
    personalAllowance: {
      monthly: Number,
      annual: Number,
    },
    qualifyingPaymentRelief: {
      epfRate: Number,
      maxMonthly: Number,
    },
    stampDuty: {
      threshold: Number,
      amount: Number,
    },
    otherDeductions: [
      {
        name: String,
        threshold: Number,
        rate: Number,
        maxAmount: Number,
      },
    ],
    isActive: Boolean,
    effectiveFrom: Date,
    effectiveTo: Date,
  },
  {
    timestamps: true,
  }
);

const TaxConfiguration =
  mongoose.models.TaxConfiguration ||
  mongoose.model("TaxConfiguration", taxConfigurationSchema);

/**
 * Sri Lankan APIT Tax Slabs for 2025 (Monthly Basis)
 * Effective from April 1, 2025
 *
 * Source: Inland Revenue Department, Sri Lanka
 */
const TAX_SLABS_2025 = [
  {
    min: 0,
    max: 150000,
    rate: 0,
    fixedAmount: 0,
    description: "Personal Relief - No Tax",
  },
  {
    min: 150000,
    max: 233333,
    rate: 6,
    fixedAmount: 0,
    description: "First slab - 6%",
  },
  {
    min: 233333,
    max: 275000,
    rate: 18,
    fixedAmount: 0,
    description: "Second slab - 18%",
  },
  {
    min: 275000,
    max: 316667,
    rate: 24,
    fixedAmount: 0,
    description: "Third slab - 24%",
  },
  {
    min: 316667,
    max: 358333,
    rate: 30,
    fixedAmount: 0,
    description: "Fourth slab - 30%",
  },
  {
    min: 358333,
    max: Infinity,
    rate: 36,
    fixedAmount: 0,
    description: "Fifth slab - 36%",
  },
];

async function runMigration() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to MongoDB");

    console.log("\n📋 Starting Tax Configuration Migration for 2025...\n");

    // Check if 2025 config already exists (any 2025 config)
    const existing2025Config = await TaxConfiguration.findOne({
      year: 2025,
      country: "LK",
    });

    if (existing2025Config) {
      console.log("⚠️  2025 Tax Configuration already exists");
      console.log(`   ID: ${existing2025Config._id}`);
      console.log(`   Created: ${existing2025Config.createdAt}`);
      console.log(`   Status: ${existing2025Config.isActive ? "Active" : "Inactive"}`);
      console.log(`   Is Default: ${existing2025Config.isDefault}`);

      // Update existing configuration
      console.log("\n🔄 Updating existing 2025 configuration...");

      existing2025Config.taxSlabs = TAX_SLABS_2025.map(
        ({ description, ...slab }) => slab
      );
      existing2025Config.personalAllowance = {
        monthly: 150000,
        annual: 1800000,
      };
      existing2025Config.qualifyingPaymentRelief = {
        epfRate: 0.08,
        maxMonthly: null,
      };
      existing2025Config.stampDuty = {
        threshold: 50000,
        amount: 25,
      };
      existing2025Config.isDefault = true;
      existing2025Config.isActive = true;
      existing2025Config.effectiveFrom = new Date("2025-04-01");
      existing2025Config.effectiveTo = null;

      await existing2025Config.save();
      console.log("✅ Updated existing 2025 tax configuration");
    } else {
      // Create new 2025 configuration
      console.log("📝 Creating new 2025 Tax Configuration...");

      const newConfig = await TaxConfiguration.create({
        year: 2025,
        country: "LK",
        isDefault: true,
        taxSlabs: TAX_SLABS_2025.map(({ description, ...slab }) => slab),
        personalAllowance: {
          monthly: 150000, // Rs. 150,000 per month
          annual: 1800000, // Rs. 1,800,000 per year
        },
        qualifyingPaymentRelief: {
          epfRate: 0.08, // 8% EPF employee contribution
          maxMonthly: null,
        },
        stampDuty: {
          threshold: 50000, // Rs. 50,000
          amount: 25, // Rs. 25
        },
        otherDeductions: [],
        isActive: true,
        effectiveFrom: new Date("2025-04-01"), // Effective from April 1, 2025
        effectiveTo: null,
      });

      console.log("✅ Created new 2025 tax configuration");
      console.log(`   ID: ${newConfig._id}`);
    }

    // Display configuration summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Tax Configuration Summary for 2025");
    console.log("=".repeat(60));
    console.log("\n💰 Personal Allowance:");
    console.log("   Monthly: Rs. 150,000");
    console.log("   Annual:  Rs. 1,800,000");

    console.log("\n📈 Tax Slabs (Monthly):");
    TAX_SLABS_2025.forEach((slab, index) => {
      const minFormatted = slab.min.toLocaleString();
      const maxFormatted =
        slab.max === Infinity ? "Above" : slab.max.toLocaleString();
      console.log(
        `   ${index + 1}. Rs. ${minFormatted} - ${maxFormatted}: ${slab.rate}% - ${slab.description}`
      );
    });

    console.log("\n🏦 EPF (Employee Contribution):");
    console.log("   Rate: 8% of total earnings");

    console.log("\n📄 Stamp Duty:");
    console.log("   Rs. 25 (if gross salary >= Rs. 50,000)");

    console.log("\n📅 Effective Date:");
    console.log("   From: April 1, 2025");
    console.log("   To:   Indefinite");

    console.log("\n" + "=".repeat(60));

    // Example calculation
    console.log("\n💡 Example Tax Calculation:");
    console.log("   For monthly salary of Rs. 300,000:");
    console.log("   ");

    const exampleSalary = 300000;
    const epf = exampleSalary * 0.08;
    const taxableIncome = exampleSalary - epf;

    console.log(`   Gross Salary:         Rs. ${exampleSalary.toLocaleString()}`);
    console.log(`   EPF 8%:              -Rs. ${epf.toLocaleString()}`);
    console.log(`   Taxable Income:       Rs. ${taxableIncome.toLocaleString()}`);
    console.log("   ");
    console.log("   (Note: Personal relief is built into tax slabs as 0% bracket)");
    console.log("   ");

    // Progressive tax calculation
    let totalTax = 0;
    let remainingIncome = taxableIncome;

    console.log("   Tax Breakdown:");
    for (let i = 0; i < TAX_SLABS_2025.length; i++) {
      const slab = TAX_SLABS_2025[i];
      if (remainingIncome <= 0 || taxableIncome <= slab.min) break;

      const slabMax = slab.max === Infinity ? taxableIncome : slab.max;
      const taxableInSlab = Math.min(remainingIncome, slabMax - slab.min);

      if (taxableInSlab > 0) {
        const taxForSlab = taxableInSlab * (slab.rate / 100);
        totalTax += taxForSlab;
        console.log(
          `     ${slab.rate}% on Rs. ${taxableInSlab.toLocaleString()} = Rs. ${taxForSlab.toLocaleString()}`
        );
        remainingIncome -= taxableInSlab;
      }
    }

    const stampDuty = exampleSalary >= 50000 ? 25 : 0;
    const totalTaxWithStamp = totalTax + stampDuty;
    const netSalary = exampleSalary - epf - totalTaxWithStamp;

    console.log("   ");
    console.log(`   APIT:                 Rs. ${totalTax.toFixed(2)}`);
    console.log(`   Stamp Duty:          +Rs. ${stampDuty}`);
    console.log(`   Total Tax:            Rs. ${totalTaxWithStamp.toFixed(2)}`);
    console.log("   ");
    console.log(`   Net Salary:           Rs. ${netSalary.toLocaleString()}`);
    console.log(`   Effective Tax Rate:   ${((totalTaxWithStamp / exampleSalary) * 100).toFixed(2)}%`);

    console.log("\n" + "=".repeat(60));
    console.log("\n✅ Migration completed successfully!");
    console.log(
      "\n💡 Note: This is the global default configuration. Employers can"
    );
    console.log(
      "   create company-specific tax configurations if needed using the"
    );
    console.log("   tax configuration API.\n");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run migration
runMigration();
