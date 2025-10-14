# Middleware RBAC Testing Guide

This guide helps you test the enhanced middleware with Role-Based Access Control.

## 🧪 Test Scenarios

### 1. **Unauthenticated Access** ❌

**Test:** Access protected routes without logging in

**Expected Behavior:**
- Redirected to `/auth/signIn` with callback URL
- URL should be: `/auth/signIn?callbackUrl=/user/...`

**Routes to Test:**
```
/user
/user/mycompanies
/admin
/admin/users
```

---

### 2. **Inactive User Account** ❌

**Setup:**
1. Create a user
2. Set `isActive: false` in MongoDB
3. Try to login

**Expected Behavior:**
- Redirected to `/auth/signIn?error=AccountDisabled`
- Cannot access any protected routes

**Test Cases:**
- ✅ Login with inactive credentials user
- ✅ Login with inactive Google OAuth user
- ✅ Try to access `/user` after account deactivation

---

### 3. **Employee Without canLogin Permission** ❌

**Setup:**
1. Create an employee user
2. Link to employee record
3. Set employee `canLogin: false`
4. Try to login

**Expected Behavior:**
- Credentials login: Rejected at login (returns null)
- Google OAuth login: Rejected at login (returns false)
- Middleware: Redirected to `/auth/signIn?error=NoLoginPermission`

**Test Cases:**
- ✅ Credentials login attempt
- ✅ Google OAuth login attempt
- ✅ Try to access any route after login

---

### 4. **Admin Role Access** ✅

**Expected Behavior:**
- ✅ Can access ALL routes
- ✅ Can access `/admin/*`
- ✅ Can access `/user/*` (including purchases)

**Routes to Test:**
```
✅ /user
✅ /user/mycompanies
✅ /user/employees
✅ /user/organization
✅ /user/salaries
✅ /user/payments
✅ /user/purchases      (admin only)
✅ /user/profile
✅ /user/settings
✅ /admin               (admin only)
```

---

### 5. **Employer Role Access** ✅/❌

**Expected Behavior:**
- ✅ Can access most `/user/*` routes
- ❌ CANNOT access `/user/purchases` (admin only)
- ❌ CANNOT access `/admin/*` routes

**Routes to Test:**
```
✅ /user
✅ /user/mycompanies
✅ /user/employees
✅ /user/organization
✅ /user/salaries
✅ /user/payments
✅ /user/profile
✅ /user/settings
❌ /user/purchases      → Redirect to /unauthorized
❌ /admin               → Redirect to /unauthorized
```

---

### 6. **Employee Role Access** ✅/❌

**Expected Behavior:**
- ✅ Can access ONLY employee-specific routes
- ❌ CANNOT access employer routes
- ❌ CANNOT access `/admin/*` routes
- ❌ Automatically redirected to dashboard when trying employer routes

**Routes to Test:**
```
✅ /user                               → Shows employee dashboard
✅ /user?userPageSelect=dashboard      → Employee dashboard
✅ /user?userPageSelect=leaves         → My leaves
✅ /user?userPageSelect=payslips       → Payslips
✅ /user?userPageSelect=profile        → Profile
✅ /user/profile                       → Employee profile
✅ /user/settings                      → Settings

❌ /user/mycompanies     → Redirect to /user?userPageSelect=dashboard
❌ /user/employees       → Redirect to /user?userPageSelect=dashboard
❌ /user/organization    → Redirect to /user?userPageSelect=dashboard
❌ /user/salaries        → Redirect to /user?userPageSelect=dashboard
❌ /user/payments        → Redirect to /user?userPageSelect=dashboard
❌ /user/purchases       → Redirect to /user?userPageSelect=dashboard
❌ /admin                → Redirect to /unauthorized
```

---

## 🔍 Manual Testing Steps

### Test 1: Unauthenticated Access

1. Open incognito/private browser window
2. Navigate to `http://localhost:3000/user`
3. **Expected:** Redirected to `/auth/signIn?callbackUrl=/user`
4. **Pass if:** You see the sign-in page with callback URL

### Test 2: Inactive User

1. Login as any user
2. In MongoDB, update user: `{ $set: { isActive: false } }`
3. Refresh the page or navigate to `/user`
4. **Expected:** Redirected to `/auth/signIn?error=AccountDisabled`
5. **Pass if:** Cannot access any protected routes

### Test 3: Employee without canLogin

1. Create employee user account
2. In MongoDB, find linked employee: `{ $set: { canLogin: false } }`
3. Try to login
4. **Expected:** Login fails or redirects with error
5. **Pass if:** Cannot login or access system

### Test 4: Admin Access

1. Login as admin user
2. Try accessing all routes listed above
3. **Expected:** All routes accessible
4. **Pass if:** No redirects or access denied errors

### Test 5: Employer Access

1. Login as employer user
2. Try accessing employer routes
3. **Expected:** All employer routes accessible
4. Try accessing `/user/purchases`
5. **Expected:** Redirected to `/unauthorized`
6. Try accessing `/admin`
7. **Expected:** Redirected to `/unauthorized`

### Test 6: Employee Access

1. Login as employee user
2. Try accessing `/user`
3. **Expected:** Shows employee dashboard
4. Try accessing `/user/mycompanies`
5. **Expected:** Redirected to `/user?userPageSelect=dashboard`
6. Try accessing `/user/profile`
7. **Expected:** Shows employee profile (allowed)
8. Try accessing `/admin`
9. **Expected:** Redirected to `/unauthorized`

---

## 🧰 Testing Tools

### MongoDB Commands

```javascript
// Set user as inactive
db.users.updateOne(
  { email: "test@example.com" },
  { $set: { isActive: false } }
);

// Set employee canLogin to false
db.employees.updateOne(
  { email: "employee@example.com" },
  { $set: { canLogin: false } }
);

// Check user status
db.users.findOne({ email: "test@example.com" }, { isActive: 1, role: 1 });

// Check employee status
db.employees.findOne({ email: "employee@example.com" }, { canLogin: 1 });
```

### Browser DevTools

1. Open Network tab
2. Watch for redirects (307/302 status codes)
3. Check URLs being redirected to
4. Verify callback URLs and error parameters

### JWT Token Inspection

```javascript
// In browser console (after login)
// Check what's in the token
const session = await fetch('/api/auth/session').then(r => r.json());
console.log(session);

// Should show:
// {
//   user: {
//     email: "...",
//     role: "admin" | "employer" | "employee",
//     id: "...",
//     isActive: true/false,
//     canLogin: true/false (for employees)
//   }
// }
```

---

## ✅ Test Checklist

### Authentication Tests
- [ ] Unauthenticated users redirected to sign in
- [ ] Inactive users cannot access system
- [ ] Employees without canLogin cannot access system
- [ ] Session includes role, isActive, canLogin (for employees)

### Admin Role Tests
- [ ] Can access all /user/* routes
- [ ] Can access /user/purchases
- [ ] Can access /admin routes
- [ ] No unauthorized redirects

### Employer Role Tests
- [ ] Can access /user/mycompanies
- [ ] Can access /user/employees
- [ ] Can access /user/organization
- [ ] Can access /user/salaries
- [ ] Can access /user/payments
- [ ] Can access /user/profile
- [ ] Can access /user/settings
- [ ] CANNOT access /user/purchases (redirects to /unauthorized)
- [ ] CANNOT access /admin (redirects to /unauthorized)

### Employee Role Tests
- [ ] Can access /user (shows employee dashboard)
- [ ] Can access /user/profile
- [ ] Can access /user/settings
- [ ] Can access employee-specific query params
- [ ] CANNOT access /user/mycompanies (redirects to dashboard)
- [ ] CANNOT access /user/employees (redirects to dashboard)
- [ ] CANNOT access /user/organization (redirects to dashboard)
- [ ] CANNOT access /user/salaries (redirects to dashboard)
- [ ] CANNOT access /user/payments (redirects to dashboard)
- [ ] CANNOT access /user/purchases (redirects to dashboard)
- [ ] CANNOT access /admin (redirects to /unauthorized)

---

## 🐛 Common Issues

### Issue: Redirects in infinite loop
**Cause:** Middleware redirect target is also protected
**Fix:** Ensure `/auth/signIn` and `/unauthorized` are not in matcher

### Issue: Employee can still access employer routes
**Cause:** Frontend links not updated or query params bypassing check
**Fix:** Check that frontend uses role-based rendering (see userSideBar.tsx)

### Issue: Token doesn't include isActive or canLogin
**Cause:** JWT callback not updated
**Fix:** Ensure NextAuth options.tsx jwt callback includes these fields

### Issue: User logged out immediately after login
**Cause:** isActive or canLogin check failing
**Fix:** Check user/employee records in database

---

## 📊 Expected Results Summary

| User Type | Employer Routes | Employee Routes | Admin Routes | Purchases |
|-----------|----------------|-----------------|--------------|-----------|
| **Admin** | ✅ Access | ✅ Access | ✅ Access | ✅ Access |
| **Employer** | ✅ Access | ✅ Access | ❌ Blocked | ❌ Blocked |
| **Employee** | ❌ Blocked | ✅ Access | ❌ Blocked | ❌ Blocked |
| **Unauthenticated** | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| **Inactive User** | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| **No canLogin** | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked |

---

## 🚀 Automated Testing (Future)

To implement automated testing, consider:

1. **Unit Tests** - Test middleware logic with mocked tokens
2. **Integration Tests** - Test with actual NextAuth sessions
3. **E2E Tests** - Use Playwright/Cypress to test user flows

Example test structure:
```typescript
describe('Middleware RBAC', () => {
  describe('Admin Role', () => {
    it('should allow access to all routes', async () => {
      // Test implementation
    });
  });

  describe('Employer Role', () => {
    it('should block access to /user/purchases', async () => {
      // Test implementation
    });
  });

  describe('Employee Role', () => {
    it('should redirect employer routes to dashboard', async () => {
      // Test implementation
    });
  });
});
```

---

**Last Updated:** 2025-10-12
**Related:** See `SECURITY_AUDIT_REPORT.md` and `CLAUDE.md`
