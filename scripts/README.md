# Migration Scripts

This directory contains database migration scripts for the SalaryApp.

## Google OAuth Password Migration

### Purpose

Updates all existing Google OAuth users from insecure password `"google"` to cryptographically secure random passwords.

**Security Issue:** Previously, Google OAuth users had password set to `"google"`, which could be exploited for authentication bypass.

### Usage

#### 1. Dry Run (Preview Changes)

Preview which users will be updated **without making any changes**:

```bash
node scripts/migrate-google-oauth-passwords.js
```

This will show:
- List of all Google OAuth users
- Their current passwords
- What would be changed

#### 2. Execute Migration

Actually update the passwords:

```bash
node scripts/migrate-google-oauth-passwords.js --execute
```

⚠️ **Important:** You'll have 5 seconds to cancel (Ctrl+C) after starting execution mode.

### Example Output

**Dry Run:**
```
╔════════════════════════════════════════════════════════╗
║   Google OAuth Password Migration Script              ║
╚════════════════════════════════════════════════════════╝

⚠️  DRY RUN MODE - No changes will be made
   This will show what would be updated

✅ Connected to MongoDB

🔍 Searching for Google OAuth users...

Found 3 Google OAuth user(s):

1. John Doe (john@gmail.com)
   Current password: "google"
   Role: employer
   Active: true

2. Jane Smith (jane@gmail.com)
   Current password: "google"
   Role: employer
   Active: true

3. Bob Wilson (bob@gmail.com)
   Current password: "google"
   Role: employer
   Active: true

🔄 DRY RUN MODE - No changes made
   Run with --execute flag to actually update passwords

✅ Migration completed successfully!

🔌 Disconnected from MongoDB
```

**Execute Mode:**
```
╔════════════════════════════════════════════════════════╗
║   Google OAuth Password Migration Script              ║
╚════════════════════════════════════════════════════════╝

⚠️  EXECUTION MODE - Passwords will be updated!
   Press Ctrl+C within 5 seconds to cancel...

✅ Connected to MongoDB

🔍 Searching for Google OAuth users...

Found 3 Google OAuth user(s):

[List of users...]

🔐 Updating passwords...

✅ Updated: john@gmail.com
   New password: a1b2c3d4e5f6... (64 chars)

✅ Updated: jane@gmail.com
   New password: x9y8z7w6v5u4... (64 chars)

✅ Updated: bob@gmail.com
   New password: m3n2o1p8q7r6... (64 chars)

📊 Migration Summary:
   ✅ Success: 3
   ❌ Failed: 0
   📝 Total: 3

✅ Migration completed successfully!

🔌 Disconnected from MongoDB
```

### What Gets Updated

- **Users with password = "google"** → Secure random 64-character hex string
- **Users with non-bcrypt passwords** → Secure random 64-character hex string
- **Users with bcrypt passwords** → No change (already secure)

### Safety Features

1. **Dry run by default** - Must explicitly use `--execute` flag
2. **5-second delay** - Time to cancel in execute mode
3. **Preview before execution** - Shows exactly what will change
4. **Detailed logging** - See results for each user
5. **No schema changes** - Only updates password field

### When to Run

Run this migration:

✅ **After deploying the authentication fix** - Ensures existing users have secure passwords
✅ **Before production deployment** - Critical security fix
✅ **On existing production systems** - If you have users with "google" passwords

❌ **Don't run on:**
- Fresh installations (no users with "google" passwords)
- Systems already migrated

### Post-Migration

After running the migration:

1. ✅ All Google OAuth users have secure random passwords
2. ✅ They can still login via Google OAuth
3. ✅ They CANNOT login via credentials (as intended)
4. ✅ If they want credential login, they must set a password via "Change Password"

### Verification

After migration, verify:

```bash
# Check that no users have "google" as password
# All should show random hex strings instead
```

### Rollback

⚠️ **There is no automatic rollback**. If you need to revert:

1. Restore from database backup
2. Or manually update specific users in MongoDB

**Recommendation:** Take a database backup before running `--execute`.

### Troubleshooting

**Error: "Cannot connect to MongoDB"**
- Check `.env.local` has correct `MONGO_URL`
- Ensure MongoDB is running
- Check network connectivity

**Error: "Failed to update user"**
- Check user document is not locked
- Verify user collection permissions
- Check MongoDB logs for details

**No users found to migrate**
- ✅ Good! All users already have secure passwords
- Or you may not have any Google OAuth users

### Technical Details

**How it works:**
1. Connects to MongoDB using `.env.local` config
2. Finds all users with non-bcrypt passwords
3. Generates secure random 64-character hex string
4. Updates user.password field
5. Saves to database

**Password format:**
- **Before:** `"google"` (7 chars, predictable)
- **After:** `"a1b2c3d4e5f6g7h8..."` (64 chars, unpredictable)

**Detection method:**
```javascript
// Bcrypt hashes have specific format: $2a$ or $2b$ or $2y$ + 56 chars
const isBcryptHash = /^\$2[ayb]\$.{56}$/.test(password);

// If not bcrypt, it's a Google OAuth user
```

---

## Other Migrations

Add documentation for other migration scripts here as they're created.

---

## commands

count lines:
```zsh
find . -type f \
  ! -path "./node_modules/*" \
  ! -path "./.next/*" \
  ! -path "./scripts/*" \
  ! -path "./.claude.md" \
  ! -path "./.git/*" \
  ! -path "./public/*" \
  -exec wc -l {} + | tail -n 1
```

---

**Last Updated:** 2025-10-12
**Related:** See `SECURITY_AUDIT_REPORT.md` for context
