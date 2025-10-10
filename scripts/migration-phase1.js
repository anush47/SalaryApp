/**
 * Phase 1 Migration Script
 *
 * This script migrates existing data to support the new features:
 * - Employee hierarchy (departments, managers)
 * - Leave management
 * - Tax calculations
 *
 * Run this script AFTER deploying the new models
 *
 * Usage: node scripts/migration-phase1.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// MongoDB connection
const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('Error: MONGO_URL not found in .env.local');
  process.exit(1);
}

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('Connected successfully!');

    const db = mongoose.connection.db;

    // Step 1: Update existing users (add new fields)
    console.log('\n[1/5] Updating User collection...');
    const usersResult = await db.collection('users').updateMany(
      {},
      {
        $set: {
          isActive: true,
          forcePasswordChange: false,
        },
      }
    );
    console.log(`Updated ${usersResult.modifiedCount} user documents`);

    // Step 2: Update existing employees (add new fields)
    console.log('\n[2/5] Updating Employee collection...');
    const employeesResult = await db.collection('employees').updateMany(
      {},
      {
        $set: {
          employeeType: 'permanent',
          canLogin: false,
          'overrides.leaveTypes': false,
          leaveTypes: [], // Will be populated later when leave types are created
        },
      }
    );
    console.log(`Updated ${employeesResult.modifiedCount} employee documents`);

    // Step 3: Update existing salaries (add tax and leave fields)
    console.log('\n[3/5] Updating Salary collection...');
    const salariesResult = await db.collection('salaries').updateMany(
      {},
      {
        $set: {
          taxes: {
            apitAmount: 0,
            stampDuty: 0,
            totalTax: 0,
            taxableIncome: 0,
            grossSalary: 0,
          },
          leaveDeductions: [],
        },
      }
    );
    console.log(`Updated ${salariesResult.modifiedCount} salary documents`);

    // Step 4: Create default tax configuration for 2025
    console.log('\n[4/5] Creating default Tax Configuration for 2025...');

    const taxConfig = {
      year: 2025,
      country: 'LK',
      taxSlabs: [
        { min: 0, max: 100000, rate: 0, fixedAmount: 0 },
        { min: 100000, max: 141667, rate: 0.06, fixedAmount: 0 },
        { min: 141667, max: 183333, rate: 0.12, fixedAmount: 2500 },
        { min: 183333, max: 225000, rate: 0.18, fixedAmount: 7500 },
        { min: 225000, max: 999999999, rate: 0.24, fixedAmount: 15000 },
      ],
      personalAllowance: {
        monthly: 100000,
        annual: 1200000,
      },
      qualifyingPaymentRelief: {
        epfRate: 0.08,
      },
      stampDuty: {
        threshold: 50000,
        amount: 25,
      },
      otherDeductions: [],
      isActive: true,
      effectiveFrom: new Date('2025-01-01'),
      effectiveTo: new Date('2025-12-31'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingTaxConfig = await db.collection('taxconfigurations').findOne({ year: 2025, country: 'LK' });

    if (existingTaxConfig) {
      console.log('Tax configuration for 2025 already exists, skipping...');
    } else {
      await db.collection('taxconfigurations').insertOne(taxConfig);
      console.log('✓ Tax configuration created successfully');
    }

    // Step 5: Create default leave types for each company
    console.log('\n[5/5] Creating default Leave Types for companies...');

    const companies = await db.collection('companies').find({}).toArray();
    console.log(`Found ${companies.length} companies`);

    let totalLeaveTypesCreated = 0;

    for (const company of companies) {
      const companyId = company._id;
      const companyName = company.name;

      // Check if leave types already exist for this company
      const existingLeaveTypes = await db.collection('leavetypes').countDocuments({ company: companyId });

      if (existingLeaveTypes > 0) {
        console.log(`  ${companyName}: Leave types already exist (${existingLeaveTypes}), skipping...`);
        continue;
      }

      const defaultLeaveTypes = [
        {
          name: 'Annual Leave',
          company: companyId,
          code: 'AL',
          maxDaysPerYear: 14,
          maxConsecutiveDays: 14,
          carryForward: false,
          maxCarryForwardDays: 0,
          requiresApproval: true,
          requiresDocument: false,
          isPaid: true,
          applicableFor: ['permanent', 'contract', 'intern', 'temporary'],
          gender: 'all',
          color: '#4CAF50',
          description: 'Annual leave as per Sri Lankan labor law',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Casual Leave',
          company: companyId,
          code: 'CL',
          maxDaysPerYear: 7,
          maxConsecutiveDays: 7,
          carryForward: false,
          maxCarryForwardDays: 0,
          requiresApproval: true,
          requiresDocument: false,
          isPaid: true,
          applicableFor: ['permanent', 'contract'],
          gender: 'all',
          color: '#2196F3',
          description: 'Casual leave for unforeseen circumstances',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Medical Leave',
          company: companyId,
          code: 'ML',
          maxDaysPerYear: 7,
          maxConsecutiveDays: 7,
          carryForward: false,
          maxCarryForwardDays: 0,
          requiresApproval: true,
          requiresDocument: true,
          isPaid: true,
          applicableFor: ['permanent', 'contract'],
          gender: 'all',
          color: '#FF9800',
          description: 'Medical leave with medical certificate required',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'No-Pay Leave',
          company: companyId,
          code: 'NPL',
          maxDaysPerYear: 365,
          maxConsecutiveDays: 30,
          carryForward: false,
          maxCarryForwardDays: 0,
          requiresApproval: true,
          requiresDocument: false,
          isPaid: false,
          applicableFor: ['permanent', 'contract', 'intern', 'temporary'],
          gender: 'all',
          color: '#F44336',
          description: 'No-pay leave (unpaid)',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.collection('leavetypes').insertMany(defaultLeaveTypes);
      console.log(`  ✓ ${companyName}: Created 4 default leave types`);
      totalLeaveTypesCreated += 4;

      // Now update all employees in this company with initial leave balances
      const leaveTypes = await db.collection('leavetypes').find({ company: companyId }).toArray();

      const employeeLeaveTypes = leaveTypes
        .filter(lt => lt.isPaid) // Only paid leave types get initial balance
        .map(lt => ({
          leaveType: lt._id,
          maxDaysPerYear: lt.maxDaysPerYear,
          balance: lt.maxDaysPerYear, // Initial balance = max days
          carryForward: lt.carryForward,
        }));

      await db.collection('employees').updateMany(
        { company: companyId },
        {
          $set: {
            leaveTypes: employeeLeaveTypes,
          },
        }
      );
    }

    console.log(`✓ Total leave types created: ${totalLeaveTypesCreated}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log(`  - Users updated: ${usersResult.modifiedCount}`);
    console.log(`  - Employees updated: ${employeesResult.modifiedCount}`);
    console.log(`  - Salaries updated: ${salariesResult.modifiedCount}`);
    console.log(`  - Tax configuration: Created for 2025`);
    console.log(`  - Leave types created: ${totalLeaveTypesCreated} (across ${companies.length} companies)`);
    console.log('\n✓ Database is ready for Phase 2 implementation!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run migration
migrate();
