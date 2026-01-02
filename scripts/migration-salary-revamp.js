/**
 * Migration Script: Salary System Revamp
 * 
 * WARNING: This is a BREAKING migration that requires manual configuration.
 * 
 * This script adds new fields to existing Salary records for the enhanced
 * salary payment system with flexible periods and payment tracking.
 * 
 * Run with: node scripts/migration-salary-revamp.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Import models
const Salary = require('../src/app/models/Salary.tsx').default;

async function migrateSalaries() {
    try {
        console.log('🔄 Starting Salary model migration...\n');

        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');

        // Fetch all existing salaries
        const existingSalaries = await Salary.find({}).lean();
        console.log(`📊 Found ${existingSalaries.length} existing salary records\n`);

        if (existingSalaries.length === 0) {
            console.log('ℹ️  No salaries to migrate. Exiting...\n');
            await mongoose.disconnect();
            return;
        }

        let updated = 0;
        const errors = [];

        // Process each salary
        for (const salary of existingSalaries) {
            try {
                // Calculate period dates from the period string (YYYY-MM)
                const [year, month] = salary.period.split('-');
                const periodStartDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                const periodEndDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month

                // Calculate period days
                const periodDays = periodEndDate.getDate();

                // Update salary with new fields
                await Salary.findByIdAndUpdate(salary._id, {
                    $set: {
                        // Flexible Salary Period Support (default to monthly for existing records)
                        salaryPeriod: 'monthly',
                        periodStartDate,
                        periodEndDate,
                        periodDays,
                        calculationMethod: 'fixed_days', // Safest default - no OT calculation

                        // Payment Tracking
                        totalPaid: 0,
                        outstandingBalance: salary.finalSalary,
                        activeAdvances: [],
                        paymentStatus: 'unpaid',
                    },
                });

                updated++;

                if (updated % 100 === 0) {
                    console.log(`✅ Updated ${updated} salaries...`);
                }
            } catch (error) {
                errors.push({
                    salaryId: salary._id,
                    error: error.message,
                });
                console.error(`❌ Error migrating salary ${salary._id}:`, error.message);
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   Salaries Updated: ${updated}`);
        console.log(`   Errors: ${errors.length}\n`);

        if (errors.length > 0) {
            console.log('❌ Errors encountered:');
            errors.forEach(err => {
                console.log(`   Salary ${err.salaryId}: ${err.error}`);
            });
            console.log('\n⚠️  Migration completed with errors. Please review.\n');
        } else {
            console.log('✅ Migration completed successfully!\n');
        }

        // Verify migration
        const verifyCount = await Salary.countDocuments({
            salaryPeriod: { $exists: true },
            paymentStatus: { $exists: true },
        });
        console.log('📊 Verification:');
        console.log(`   Salaries with new fields: ${verifyCount} / ${existingSalaries.length}\n`);

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB\n');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run migration
migrateSalaries();
