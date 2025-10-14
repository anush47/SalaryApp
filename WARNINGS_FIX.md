# Fixing Console Warnings

## ✅ Fixed Issues

### 1. Mongoose Duplicate Index Warning
**Status:** ✅ FIXED

**Issue:**
```
[MONGOOSE] Warning: Duplicate schema index on {"email":1} found
```

**Fix Applied:**
- Removed duplicate `userSchema.index({ email: 1 }, { unique: true })`
- The `unique: true` in the schema field definition already creates this index
- Location: `src/app/models/User.tsx:75`

---

## ⚠️ Remaining Warnings

### 2. NextAuth URL Warning
**Status:** ⏳ TO FIX

**Issue:**
```
[next-auth][warn][NEXTAUTH_URL]
https://next-auth.js.org/warnings#nextauth_url
```

**Fix:**
Add `NEXTAUTH_URL` to your `.env.local` file:

```bash
# .env.local

# Existing variables
MONGO_URL=your_mongodb_connection_string
NEXTAUTH_SECRET=your_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Add this:
NEXTAUTH_URL=http://localhost:3000
```

**For Production:**
```bash
NEXTAUTH_URL=https://salary-mocha.vercel.app
```

**Why this is needed:**
- NextAuth needs to know the base URL for callbacks
- Required for proper OAuth redirects
- Prevents potential security issues

---

### 3. Console.log Statements (Security Issue #4)
**Status:** ⏳ TO FIX

**Locations Found in Your Logs:**
- `src/app/lib/db.tsx` - "Database connected successfully"
- Multiple API routes

**Issue:**
- These appear in production logs
- Can expose sensitive data
- GDPR compliance risk
- Performance impact

**Quick Fix Options:**

#### Option A: Remove Completely (Recommended)
Simply delete all `console.log()` statements from production code.

#### Option B: Environment-Aware Logging
Replace with conditional logging:

```typescript
// src/app/lib/logger.ts
export const logger = {
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  error: (message: string, error?: Error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ERROR] ${message}`, error);
    }
    // In production: Send to error tracking service (Sentry, Datadog, etc.)
  }
};

// Usage:
import { logger } from '@/app/lib/logger';
logger.info('Database connected successfully');
```

#### Option C: Use a Logging Library
Install a proper logging library:

```bash
npm install winston
# or
npm install pino
```

---

## 🎯 Priority Order

1. **HIGH** - Add `NEXTAUTH_URL` to `.env.local` (Quick, 1 minute)
2. **MEDIUM** - Fix console.log statements (Would you like me to do this?)

---

## 🧪 Verify Fixes

After adding `NEXTAUTH_URL`:
1. Restart your dev server: `npm run dev`
2. Check console - NextAuth warning should be gone

After fixing console.logs:
1. Build production: `npm run build`
2. Start production: `npm start`
3. Check logs - Should be clean

---

## ❓ Next Steps

Would you like me to:

**A.** Remove all console.log statements from the codebase?
**B.** Implement environment-aware logging helper?
**C.** Both A and B?
**D.** Just leave this guide for you to fix manually?

Let me know and I'll proceed!
