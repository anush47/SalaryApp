/**
 * Migration Script: Employee Salary Configuration
 * 
 * WARNING: This is a BREAKING migration that requires manual configuration.
 * 
 * This script adds salary period configuration fields to existing Employee records.
 * All employees will need manual configuration of their salary period settings
 * before the next salary generation.
 * 
 * Run with: node scripts/migration-employee-salary-config.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Import models
const Employee = require('../src/app/models/Employee.tsx').default;

async function migrateEmployees() {
    try {
        console.log('🔄 Starting Employee salary configuration migration...\n');

        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');

        // Fetch all existing employees
        const existingEmployees = await Employee.find({}).lean();
        console.log(`📊 Found ${existingEmployees.length} existing employee records\n`);

        if (existingEmployees.length === 0) {
            console.log('ℹ️  No employees to migrate. Exiting...\n');
            await mongoose.disconnect();
            return;
        }

        let updated = 0;
        const errors = [];

        console.log('⚠️  IMPORTANT: Setting default salary period to "monthly" for all employees.');
        console.log('   You MUST manually configure each employee\'s salary period before generation.\n');

        // Process each employee
        for (const employee of existingEmployees) {
            try {
                // Update employee with new salary configuration fields
                await Employee.findByIdAndUpdate(employee._id, {
                    $set: {
                        // Salary Period Configuration (defaults for migration)
                        salaryPeriod: 'monthly', // Default to monthly
                        rateDivisor: 30, // Default divisor for daily rate calculation
                        calculationMethod: 'fixed_days', // Safest default - no OT calculation

                        // Optional fields (not set by default)
                        // customPeriodDays: undefined,
                        // dailyRateOverride: undefined,
                        // weeklyRateOverride: undefined,
                        // monthlyRateOverride: undefined,
                        // payPeriodConfig: undefined,
                    },
                });

                updated++;

                if (updated % 50 === 0) {
                    console.log(`✅ Updated ${updated} employees...`);
                }
            } catch (error) {
                errors.push({
                    employeeId: employee._id,
                    employeeName: employee.name,
                    error: error.message,
                });
                console.error(`❌ Error migrating employee ${employee.name}:`, error.message);
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   Employees Updated: ${updated}`);
        console.log(`   Errors: ${errors.length}\n`);

        if (errors.length > 0) {
            console.log('❌ Errors encountered:');
            errors.forEach(err => {
                console.log(`   Employee ${err.employeeName} (${err.employeeId}): ${err.error}`);
            });
            console.log('\n⚠️  Migration completed with errors. Please review.\n');
        } else {
            console.log('✅ Migration completed successfully!\n');
        }

        // Verify migration
        const verifyCount = await Employee.countDocuments({
            salaryPeriod: { $exists: true },
            rateDivisor: { $exists: true },
            calculationMethod: { $exists: true },
        });
        console.log('📊 Verification:');
        console.log(`   Employees with new fields: ${verifyCount} / ${existingEmployees.length}\n`);

        // Show configuration instructions
        console.log('📋 Next Steps:');
        console.log('   1. Review each employee\'s salary period configuration');
        console.log('   2. Set appropriate values for:');
        console.log('      - salaryPeriod (daily/weekly/bi-weekly/monthly/custom)');
        console.log('      - rateDivisor (30, 26, 22, etc.)');
        console.log('      - calculationMethod (attendance/fixed_days/no_ot)');
        console.log('      - payPeriodConfig (for monthly: 25th-25th, etc.)');
        console.log('   3. Test salary generation with new configuration\n');

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB\n');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run migration
migrateEmployees();
