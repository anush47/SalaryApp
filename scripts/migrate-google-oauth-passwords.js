/**
 * Migration Script: Update Google OAuth User Passwords
 *
 * This script updates all existing Google OAuth users who have password="google"
 * to use secure random passwords instead.
 *
 * Usage:
 *   node scripts/migrate-google-oauth-passwords.js           # Dry run (preview only)
 *   node scripts/migrate-google-oauth-passwords.js --execute # Actually update passwords
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// User Schema (simplified)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean,
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Generate secure random password
function generateSecureRandomPassword() {
  return crypto.randomBytes(32).toString('hex');
}

// Check if password is bcrypt hash
function isBcryptHash(password) {
  return /^\$2[ayb]\$.{56}$/.test(password);
}

// Main migration function
async function migrateGoogleOAuthPasswords(dryRun = true) {
  console.log('\n🔍 Searching for Google OAuth users...\n');

  // Find all users with non-bcrypt passwords (likely Google OAuth users)
  const allUsers = await User.find({});

  const googleOAuthUsers = allUsers.filter(user => {
    // Check if password is "google" or any other non-bcrypt format
    return !isBcryptHash(user.password);
  });

  console.log(`Found ${googleOAuthUsers.length} Google OAuth user(s):\n`);

  if (googleOAuthUsers.length === 0) {
    console.log('✅ No users to migrate. All users already have secure passwords.');
    return;
  }

  // Display users to be updated
  googleOAuthUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name} (${user.email})`);
    console.log(`   Current password: "${user.password}"`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log('');
  });

  if (dryRun) {
    console.log('🔄 DRY RUN MODE - No changes made');
    console.log('   Run with --execute flag to actually update passwords\n');
    return;
  }

  // Execute migration
  console.log('🔐 Updating passwords...\n');

  let successCount = 0;
  let failCount = 0;

  for (const user of googleOAuthUsers) {
    try {
      const newPassword = generateSecureRandomPassword();

      user.password = newPassword;
      await user.save();

      console.log(`✅ Updated: ${user.email}`);
      console.log(`   New password: ${newPassword.substring(0, 16)}... (64 chars)\n`);

      successCount++;
    } catch (error) {
      console.error(`❌ Failed to update ${user.email}:`, error.message);
      failCount++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📝 Total: ${googleOAuthUsers.length}\n`);
}

// Run migration
async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Google OAuth Password Migration Script              ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  if (!execute) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made');
    console.log('   This will show what would be updated\n');
  } else {
    console.log('\n⚠️  EXECUTION MODE - Passwords will be updated!');
    console.log('   Press Ctrl+C within 5 seconds to cancel...\n');

    // Give user time to cancel
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  try {
    await connectDB();
    await migrateGoogleOAuthPasswords(!execute);

    console.log('✅ Migration completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the migration
main();
