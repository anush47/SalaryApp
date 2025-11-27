/**
 * Migration Script: Flexible Leave Periods
 *
 * This script updates existing leave types and employee leave balances
 * to support flexible accrual periods (monthly, weekly, quarterly, etc.)
 *
 * Run with: node scripts/migration-flexible-leaves.js
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

// MongoDB connection
const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error("❌ MONGO_URL not found in environment variables");
  process.exit(1);
}

// Define schemas (simplified for migration)
const LeaveTypeSchema = new mongoose.Schema(
  {
    name: String,
    company: mongoose.Schema.Types.ObjectId,
    code: String,
    maxDaysPerYear: Number,
    accrualPeriod: {
      type: String,
      enum: ["yearly", "monthly", "weekly", "quarterly", "half-yearly", "custom"],
      default: "yearly",
    },
    maxDaysPerPeriod: Number,
    customPeriodDays: Number,
    accrualMethod: {
      type: String,
      enum: ["upfront", "monthly-accrual", "pro-rata"],
      default: "upfront",
    },
    resetDay: Number,
    isActive: Boolean,
  },
  { timestamps: true }
);

const EmployeeSchema = new mongoose.Schema(
  {
    name: String,
    company: mongoose.Schema.Types.ObjectId,
    leaveTypes: [
      {
        leaveType: mongoose.Schema.Types.ObjectId,
        maxDaysPerYear: Number,
        balance: Number,
        carryForward: Boolean,
        currentPeriodStart: Date,
        lastAccrualDate: Date,
        carriedForwardBalance: Number,
      },
    ],
  },
  { timestamps: true }
);

const LeaveType =
  mongoose.models.LeaveType ||
  mongoose.model("LeaveType", LeaveTypeSchema);
const Employee =
  mongoose.models.Employee ||
  mongoose.model("Employee", EmployeeSchema);

async function runMigration() {
  console.log("🚀 Starting Flexible Leave Periods Migration...\n");

  try {
    // Connect to MongoDB
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to MongoDB\n");

    // Step 1: Update LeaveType documents
    console.log("📝 Step 1: Updating LeaveType documents...");
    const leaveTypes = await LeaveType.find({});
    console.log(`   Found ${leaveTypes.length} leave types`);

    let leaveTypeUpdates = 0;
    for (const leaveType of leaveTypes) {
      // Check if already migrated (has accrualPeriod)
      if (leaveType.accrualPeriod && leaveType.maxDaysPerPeriod) {
        continue;
      }

      // Set default values for new fields
      leaveType.accrualPeriod = leaveType.accrualPeriod || "yearly";
      leaveType.maxDaysPerPeriod =
        leaveType.maxDaysPerPeriod || leaveType.maxDaysPerYear || 14;
      leaveType.accrualMethod = leaveType.accrualMethod || "upfront";

      await leaveType.save();
      leaveTypeUpdates++;
    }

    console.log(`   ✅ Updated ${leaveTypeUpdates} leave types\n`);

    // Step 2: Update Employee leave balances
    console.log("📝 Step 2: Updating Employee leave balances...");
    const employees = await Employee.find({
      "leaveTypes.0": { $exists: true },
    });
    console.log(`   Found ${employees.length} employees with leave balances`);

    let employeeUpdates = 0;
    const now = new Date();

    for (const employee of employees) {
      let needsSave = false;

      for (const leaveBalance of employee.leaveTypes) {
        // Check if already migrated (has currentPeriodStart)
        if (leaveBalance.currentPeriodStart) {
          continue;
        }

        // Initialize new period tracking fields
        leaveBalance.currentPeriodStart = new Date(now.getFullYear(), 0, 1); // Start of current year
        leaveBalance.lastAccrualDate = now;
        leaveBalance.carriedForwardBalance = 0;

        needsSave = true;
      }

      if (needsSave) {
        await employee.save();
        employeeUpdates++;
      }
    }

    console.log(`   ✅ Updated ${employeeUpdates} employees\n`);

    // Step 3: Display summary
    console.log("📊 Migration Summary:");
    console.log(`   - LeaveTypes updated: ${leaveTypeUpdates}`);
    console.log(`   - Employees updated: ${employeeUpdates}`);
    console.log(`   - Total leave types: ${leaveTypes.length}`);
    console.log(`   - Total employees with leaves: ${employees.length}\n`);

    // Step 4: Verify migration
    console.log("🔍 Verifying migration...");

    const unmigratedLeaveTypes = await LeaveType.countDocuments({
      $or: [
        { accrualPeriod: { $exists: false } },
        { maxDaysPerPeriod: { $exists: false } },
      ],
    });

    const unmigratedEmployees = await Employee.countDocuments({
      "leaveTypes.0": { $exists: true },
      "leaveTypes.currentPeriodStart": { $exists: false },
    });

    if (unmigratedLeaveTypes === 0 && unmigratedEmployees === 0) {
      console.log("   ✅ All records successfully migrated!\n");
    } else {
      console.log(
        `   ⚠️  Warning: ${unmigratedLeaveTypes} leave types and ${unmigratedEmployees} employees still need migration\n`
      );
    }

    // Step 5: Display example configurations
    console.log("📋 Example: Creating flexible leave types");
    console.log(`
   After migration, you can create leave types with flexible periods:

   1. Monthly Sick Leave (3 days per month):
      {
        name: "Monthly Sick Leave",
        code: "MSL",
        accrualPeriod: "monthly",
        maxDaysPerPeriod: 3,
        accrualMethod: "upfront"
      }

   2. Weekly Casual Leave (0.5 days per week):
      {
        name: "Weekly Casual Leave",
        code: "WCL",
        accrualPeriod: "weekly",
        maxDaysPerPeriod: 0.5,
        accrualMethod: "upfront",
        resetDay: 1  // Monday
      }

   3. Quarterly Annual Leave (with monthly accrual):
      {
        name: "Quarterly Annual Leave",
        code: "QAL",
        accrualPeriod: "quarterly",
        maxDaysPerPeriod: 3.5,
        accrualMethod: "monthly-accrual"
      }

   4. Custom Period Leave (every 30 days):
      {
        name: "Custom Leave",
        code: "CL",
        accrualPeriod: "custom",
        maxDaysPerPeriod: 2,
        customPeriodDays: 30,
        accrualMethod: "pro-rata"
      }
`);

    console.log("✅ Migration completed successfully!\n");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("📡 Database connection closed");
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
