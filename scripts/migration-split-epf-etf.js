/**
 * Migration Script: Split Payment Model into EPF and ETF
 * 
 * This script migrates the existing Payment model (which handles both EPF and ETF)
 * into two separate models: EpfPayment and EtfPayment for better clarity.
 * 
 * Run with: node scripts/migration-split-epf-etf.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Import models
const Payment = require('../src/app/models/Payment.tsx').default;
const EpfPayment = require('../src/app/models/EpfPayment.ts').default;
const EtfPayment = require('../src/app/models/EtfPayment.ts').default;

async function migratePayments() {
    try {
        console.log('🔄 Starting Payment model migration...\n');

        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');

        // Fetch all existing payments
        const existingPayments = await Payment.find({}).lean();
        console.log(`📊 Found ${existingPayments.length} existing payment records\n`);

        if (existingPayments.length === 0) {
            console.log('ℹ️  No payments to migrate. Exiting...\n');
            await mongoose.disconnect();
            return;
        }

        let epfCreated = 0;
        let etfCreated = 0;
        const errors = [];

        // Process each payment
        for (const payment of existingPayments) {
            try {
                // Create EPF payment record
                const epfPayment = {
                    company: payment.company,
                    period: payment.period,
                    employerContribution: payment.epfAmount * 0.12 / 0.20, // Approximate employer portion (12%)
                    employeeContribution: payment.epfAmount * 0.08 / 0.20, // Approximate employee portion (8%)
                    totalAmount: payment.epfAmount,
                    referenceNo: payment.epfReferenceNo,
                    paymentDate: payment.epfPayDay ? new Date(payment.epfPayDay) : undefined,
                    paymentMethod: payment.epfPaymentMethod,
                    surcharges: payment.epfSurcharges || 0,
                    createdBy: payment.company, // Use company as creator (no user info in old model)
                    remark: payment.remark,
                    createdAt: payment.createdAt,
                    updatedAt: payment.updatedAt,
                };

                await EpfPayment.create(epfPayment);
                epfCreated++;

                // Create ETF payment record
                const etfPayment = {
                    company: payment.company,
                    period: payment.period,
                    employerContribution: payment.etfAmount, // ETF is 3% employer only
                    totalAmount: payment.etfAmount,
                    // Note: No reference number for ETF
                    paymentDate: payment.etfPayDay ? new Date(payment.etfPayDay) : undefined,
                    paymentMethod: payment.etfPaymentMethod,
                    surcharges: payment.etfSurcharges || 0,
                    createdBy: payment.company, // Use company as creator
                    remark: payment.remark,
                    createdAt: payment.createdAt,
                    updatedAt: payment.updatedAt,
                };

                await EtfPayment.create(etfPayment);
                etfCreated++;

                console.log(`✅ Migrated payment for company ${payment.company}, period ${payment.period}`);
            } catch (error) {
                errors.push({
                    paymentId: payment._id,
                    error: error.message,
                });
                console.error(`❌ Error migrating payment ${payment._id}:`, error.message);
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   EPF Payments Created: ${epfCreated}`);
        console.log(`   ETF Payments Created: ${etfCreated}`);
        console.log(`   Errors: ${errors.length}\n`);

        if (errors.length > 0) {
            console.log('❌ Errors encountered:');
            errors.forEach(err => {
                console.log(`   Payment ${err.paymentId}: ${err.error}`);
            });
            console.log('\n⚠️  Migration completed with errors. Please review.\n');
        } else {
            console.log('✅ Migration completed successfully!\n');

            // Ask for confirmation before deleting old records
            console.log('⚠️  IMPORTANT: Old Payment records are still in the database.');
            console.log('   To delete them, run: db.payments.drop() in MongoDB shell');
            console.log('   Or manually delete the Payment model file after verification.\n');
        }

        // Verify migration
        const epfCount = await EpfPayment.countDocuments();
        const etfCount = await EtfPayment.countDocuments();
        console.log('📊 Verification:');
        console.log(`   Total EPF Payments: ${epfCount}`);
        console.log(`   Total ETF Payments: ${etfCount}\n`);

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB\n');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run migration
migratePayments();
