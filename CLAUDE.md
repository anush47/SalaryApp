# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SalaryApp is a cloud-based employee and payroll management system built for Sri Lankan businesses. It automates salary calculations, EPF/ETF contributions, attendance tracking, and B-Card (Form A) generation. The system supports multi-company management with flexible working schedules, payment structures, and holiday calendars.

**Live Site:** https://salary-mocha.vercel.app/

## Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Frontend:** React 18 with Material-UI (MUI) v5
- **Authentication:** NextAuth.js with Google OAuth and credentials provider
- **Database:** MongoDB with Mongoose ODM
- **State Management:** React Context API, TanStack Query (React Query)
- **Styling:** Tailwind CSS + Material-UI
- **PDF Generation:** jsPDF, jsPDF-autotable, pdf-lib
- **PWA:** next-pwa (disabled in development)
- **Language:** TypeScript

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Environment Variables

Required in `.env.local`:
- `MONGO_URL` - MongoDB connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

## Architecture

### Directory Structure

```
src/app/
├── api/                  # API routes (Next.js App Router)
│   ├── auth/            # Authentication endpoints
│   ├── companies/       # Company management
│   ├── departments/     # Department management & hierarchy
│   ├── employees/       # Employee CRUD + Form A generation + hierarchy
│   ├── salaries/        # Salary generation and processing
│   ├── leave-types/     # Leave type CRUD operations
│   ├── leave-requests/  # Leave application & approval
│   ├── payments/        # Payment tracking
│   ├── purchases/       # Subscription/pricing
│   ├── pdf/             # PDF generation (EPF/ETF/Payslips)
│   ├── calendar/        # Holiday calendar management
│   └── users/           # User management
├── models/              # Mongoose schemas (.tsx files)
├── lib/                 # Utilities (db.tsx, consts.tsx, employeeHierarchy.tsx, leaveBalance.tsx)
├── context/             # React Contexts (Snackbar, Language)
├── user/                # User dashboard pages
├── admin/               # Admin dashboard pages
├── auth/                # Authentication pages
└── policies/            # Terms, Privacy, Agreement pages
```

### Data Models

**Core Entities:**

1. **Company** (`src/app/models/Company.tsx`)
   - Represents an employer with employerNo (unique ID)
   - Contains: shifts, workingDays, paymentStructure, probabilities
   - Has `overrides` system allowing per-employee customization
   - Supports dynamic holidays (`isDynamicHolidays`)
   - Three modes: "self", "visit", "aided"

2. **Employee** (`src/app/models/Employee.tsx`)
   - Belongs to a Company (via `company` reference)
   - Has `memberNo` (unique within company)
   - Salary calculation: `basic` + additions - deductions
   - OT methods: "random" (simulated), "noOt", "calc" (from In/Out records)
   - Can override company settings via `overrides` object
   - `divideBy`: 240 or 200 (hourly rate calculation basis)

3. **Salary** (`src/app/models/Salary.tsx`)
   - Links to Employee for a specific period (YYYY-MM format)
   - Contains: basic, holidayPay, noPay, ot, paymentStructure
   - Has `inOut` array tracking daily attendance
   - Final salary = basic + holidayPay + additions + ot - deductions - noPay
   - EPF 8% automatically deducted from total earnings

4. **User** (`src/app/models/User.tsx`)
   - Role: "admin", "employer", or "employee"
   - Can authenticate via credentials or Google OAuth
   - Linked to Employee record if role is "employee"
   - Has `canLogin`, `isActive`, `forcePasswordChange` fields

5. **Department** (`src/app/models/Department.tsx`)
   - Organizational units within a company
   - Hierarchical structure (via `parentDepartment`)
   - Each department has a manager (Employee)
   - Used for employee organization and reporting

6. **LeaveType** (`src/app/models/LeaveType.tsx`)
   - Fully customizable per company
   - Default types: Annual (AL), Casual (CL), Medical (ML), No-Pay (NPL)
   - Configurable: max days/year, carry forward, requires approval/document
   - Can be restricted by employee type and gender
   - Each has color for calendar display

7. **LeaveRequest** (`src/app/models/LeaveRequest.tsx`)
   - Employee leave applications
   - Status: pending, approved, rejected, cancelled
   - Links to LeaveType and Employee
   - Approver is employee's manager
   - Supports half-day leaves and document attachments

8. **TaxConfiguration** (`src/app/models/TaxConfiguration.tsx`)
   - Year-based tax configuration (editable by admin)
   - Sri Lankan APIT tax slabs (progressive taxation)
   - Personal allowance, EPF relief, stamp duty settings
   - Effective date ranges for tax year

9. **Payment** - Tracks subscription payments
10. **Purchase** - Manages pricing/subscription plans
11. **Holiday** - Stores calendar events

### Key Business Logic

**Salary Generation Flow:**
1. `src/app/api/salaries/generate/salaryGeneration.tsx` - Main salary generation logic
   - `generateSalaryForOneEmployee()` - Entry point for salary calculation
   - Supports three OT calculation methods:
     - `randomCalc()` - Generates realistic simulated attendance
     - `noOtCalc()` - No overtime, basic salary only
     - `OtCalc()` - Calculates from actual In/Out CSV data
   - Payment structure adjustments:
     - Additions/deductions can be fixed amounts, ranges (e.g., "2000-5000"), or null
     - If `totalSalary` is set, algorithm auto-adjusts flexible fields to match target
     - EPF 8% automatically calculated on total earnings
   - Holiday pay calculated based on company calendar and working days

2. `src/app/api/salaries/salaryProcessing.tsx` - Attendance processing
   - Handles In/Out CSV uploads
   - Calculates working hours, OT hours, no-pay
   - Respects shift timings, breaks, and working day configurations

3. `src/app/api/salaries/initialInOutProcess.tsx` - CSV parsing and validation

**Override System:**
- Company defines default: shifts, workingDays, probabilities, paymentStructure, calendar
- Employee can enable overrides in `overrides` object
- If override enabled, employee's own settings take precedence
- Allows per-employee customization while maintaining company defaults
- **NEW**: Leave types can also be overridden per employee
  - Company sets default leave types via LeaveType collection
  - Employee can have custom leave balances in `employee.leaveTypes` array
  - If `overrides.leaveTypes: true`, use employee's custom leave configuration
  - Otherwise, use company's default leave types

**Leave Management System:**
- Leave types are fully customizable per company (stored in LeaveType collection)
- Default leave types created during migration: AL, CL, ML, NPL
- Each leave type has: max days/year, carry forward rules, approval requirements
- Employees have individual leave balances (tracked in `employee.leaveTypes`)
- Leave requests flow:
  1. Employee applies via LeaveRequest
  2. Auto-assigned to employee's manager for approval
  3. On approval, balance deducted from `employee.leaveTypes`
  4. No-pay leaves (isPaid: false) deduct from salary during salary generation

**Tax Calculation (APIT):**
- Sri Lankan APIT calculated progressively using tax slabs
- Tax configuration stored in TaxConfiguration (year-based, admin editable)
- Formula:
  ```
  Taxable Income = Gross Salary - EPF 8% (employee contribution)
  Income After Allowance = Taxable Income - Personal Allowance (LKR 100,000/month)
  APIT = Apply progressive tax slabs to Income After Allowance
  Stamp Duty = LKR 25 if Gross Salary >= LKR 50,000
  Total Tax = APIT + Stamp Duty
  ```
- Tax stored in `salary.taxes` object
- Integrated into salary generation process

**Form A (B-Card) Generation:**
- `src/app/api/employees/formA/` handles EPF Form A generation
- Uses `pdf-lib` to fill official Sri Lankan EPF forms
- Field mapping in `aFormFieldMap.tsx`

**PDF Generation:**
- `src/app/api/pdf/` contains generators for:
  - `epf.tsx` - EPF contribution reports (C3A form)
  - `etf.tsx` - ETF contribution reports
  - `payslip.tsx` - Employee payslips
  - `salary.tsx` - Salary sheets
  - `attendance.tsx` - Attendance reports

### Authentication Flow

- Middleware (`src/middleware.ts`) protects `/user/*` and `/admin/*` routes
- NextAuth config in `src/app/api/auth/[...nextauth]/options.tsx`
- Google OAuth auto-creates users with role "employer"
- Credentials auth requires existing user with hashed password (bcrypt)
- Session includes user role and ID via JWT callbacks

### Database Connection

- `src/app/lib/db.tsx` - Singleton MongoDB connection with retry logic
- Connection reused across API routes (Next.js serverless functions)
- Uses mongoose connection caching to prevent exhausting connections

### Frontend Patterns

- All models are `.tsx` files (not `.ts`) - maintain this convention
- Server Components for initial page loads
- Client Components in `clientComponents/` directories
- Context Providers: SnackbarContext (notifications), LanguageContext (i18n)
- TanStack Query for data fetching and caching
- Material-UI components with custom theme (`theme-provider.tsx`)

## Important Conventions

1. **Model Files**: All Mongoose models are `.tsx` files, not `.ts`
2. **File Structure**: API routes follow Next.js 14 App Router conventions (`route.tsx`)
3. **Error Handling**: Always use try-catch in API routes, return proper status codes
4. **Database**: Always call `dbConnect()` before database operations
5. **Authentication**: Check `session` in protected API routes
6. **Periods**: Salary periods use "YYYY-MM" format (e.g., "2025-03")
7. **Employer Numbers**: Must be unique across companies
8. **Member Numbers**: Must be unique within a company

## Common Tasks

### Adding a New API Route
1. Create `src/app/api/[resource]/route.tsx`
2. Import `dbConnect` and relevant models
3. Export GET, POST, PUT, DELETE handlers
4. Always validate input and handle errors
5. Check authentication where needed

### Adding a New Model
1. Create `src/app/models/[ModelName].tsx` (note: `.tsx` not `.ts`)
2. Define TypeScript interface extending Document
3. Define Mongoose schema
4. Export with `models.ModelName || model<IModelName>()` pattern
5. Add timestamps: true for audit trail

### Testing Salary Generation
- Use the `/user/salaries` page
- Select company and period
- Choose OT method: "random" for testing without CSV data
- Use "calc" method with uploaded In/Out CSV for production

### Working with In/Out Data
- CSV format: Date/Time columns for clock in/out
- Parser in `initialInOutProcess.tsx`
- Validates against shift timings and working days
- Handles missing punches, late arrivals, early departures

## Payment Structure Formula

```
Total Earnings = Basic + Holiday Pay + Additions (affecting earnings) - Deductions (affecting earnings)
EPF 8% = Total Earnings × 0.08
Total Additions = Sum of all additions
Total Deductions = Sum of all deductions + EPF 8%
Final Salary = Basic + Holiday Pay + Total Additions + OT - Total Deductions - No Pay
```

## Key Features Implementation

**Multi-Company Support:**
- Users can manage multiple companies
- Each company has unique employerNo
- Company selection in user dashboard filters employees/salaries

**Dynamic Holidays:**
- If `isDynamicHolidays: true`, system accounts for mercantile/bank holidays
- Default calendar: Sri Lankan public holidays
- Can be customized per company or employee (via overrides)

**Attendance Probabilities:**
- Used in random salary generation mode
- Controls likelihood of: work on off days, work on holidays, absence, late arrival, overtime
- Values are percentages (0-100)

## Troubleshooting

- **Database connection issues**: Check MONGO_URL in `.env.local`, verify network access
- **Build errors**: Run `npm run build` locally to catch TypeScript errors
- **Authentication issues**: Verify NEXTAUTH_SECRET is set, check callback URLs in Google Console
- **PDF generation fails**: Ensure required fonts/assets are in public directory
- **Salary calculation mismatch**: Verify payment structure setup, check override settings

## Employee Hierarchy & Organizational Structure

**Departments:**
- Companies can create departments (hierarchical via `parentDepartment`)
- Each department has a manager (Employee reference)
- Employees are assigned to departments
- Used for org chart visualization and reporting

**Manager-Employee Relationships:**
- Each employee can have a manager (`employee.manager`)
- Manager approves subordinate leave requests
- Manager can view team information
- Hierarchical structure for approval workflows

**Employee Access Levels:**
- `canLogin: true` allows employee portal access
- Only employer or admin can create employee login accounts
- Employee gets temporary password, must change on first login
- Three roles: "admin" (full access), "employer" (company management), "employee" (self-service)

## Leave Management APIs

**Phase 3** introduced comprehensive leave management with fully customizable leave types and automated approval workflows.

### Leave Types API (`/api/leave-types`)

**GET /api/leave-types?companyId=xxx&includeInactive=false**
- List all leave types for a company
- Filters: `includeInactive` (optional, boolean)
- Access: All roles (read-only for employees)
- Returns: Array of leave types sorted by code

**POST /api/leave-types**
- Create new leave type
- Access: Employer, Admin only
- Auto-assigns to all active employees if `isPaid: true`
- Skips employees with `overrides.leaveTypes: true`
- Required fields: `name`, `code`, `companyId`
- Optional fields: `maxDaysPerYear`, `carryForward`, `requiresApproval`, `requiresDocument`, `isPaid`, `applicableFor`, `gender`, `color`

**PUT /api/leave-types**
- Update leave type
- Access: Employer, Admin only
- Cannot update `code` or `companyId`

**DELETE /api/leave-types?leaveTypeId=xxx**
- Deactivate leave type (soft delete)
- Sets `isActive: false` instead of deleting
- Preserves historical leave requests

### Leave Requests API (`/api/leave-requests`)

**GET /api/leave-requests?companyId=xxx&[filters]**
- List leave requests with filters
- Query params: `employeeId`, `status`, `startDate`, `endDate`, `myRequests`, `pendingApprovals`
- Access control:
  - Admin: All requests
  - Employer: Company requests only
  - Employee: Own requests + requests to approve

**POST /api/leave-requests**
- Apply for leave
- Required: `employeeId`, `leaveTypeId`, `startDate`, `endDate`
- Optional: `halfDay`, `reason`, `documents`
- Validations:
  - Valid date range
  - Sufficient balance (paid leaves)
  - No overlapping requests
  - Document requirements
  - Max consecutive days
  - Employee type & gender applicability
- Auto-assigns to employee's manager as approver
- Auto-approves if no approval required or no approver

**PUT /api/leave-requests**
- Update leave request (approve/reject/cancel)
- Actions: `approve`, `reject`, `cancel`
- Access control:
  - approve/reject: Approver, management chain, employer, admin
  - cancel: Employee themselves, employer, admin
- On approval: Deducts leave balance
- On cancel (if approved): Restores balance

### Leave Balance Helper Functions (`src/app/lib/leaveBalance.tsx`)

**getLeaveBalanceSummary(employeeId)**
- Returns complete leave balance summary with usage statistics
- Respects employee override settings
- Calculates: maxDays, used, balance, available per leave type

**validateLeaveApplication(employeeId, leaveTypeId, startDate, endDate, halfDay)**
- Comprehensive validation before leave application
- Checks: dates, balance, overlaps, applicability, restrictions
- Returns: `{ valid: boolean, error?: string, message?: string }`

**deductLeaveBalance(employeeId, leaveTypeId, days)**
- Deduct balance when leave is approved
- Only for paid leave types
- Validates sufficient balance

**restoreLeaveBalance(employeeId, leaveTypeId, days)**
- Restore balance when approved leave is cancelled
- Only for paid leave types
- Caps at maxDaysPerYear

**getLeaveHistory(employeeId, year?, leaveTypeId?)**
- Get leave request history with optional filters
- Returns populated leave requests sorted by date

**getUpcomingLeaves(employeeId)**
- Get next 10 upcoming approved leaves
- Sorted by start date

**carryForwardLeaves(employeeId, fromYear, toYear)**
- Carry forward eligible leaves to new year
- Respects `maxCarryForwardDays` limit
- New balance = maxDaysPerYear + carried forward
- Run at year-end for all employees

**initializeLeaveBalances(employeeId)**
- Initialize leave balances for new employee
- Adds missing leave types from company defaults
- Sets initial balance to maxDaysPerYear

**getLeaveStatistics(companyId, year?)**
- Aggregate leave statistics for reporting
- Groups by leave type and status
- Returns total days and request counts

### Leave Management Workflow

1. **Leave Type Setup:**
   - Employer creates leave types (or uses defaults: AL, CL, ML, NPL)
   - Leave types auto-assigned to employees
   - Employee can override with custom configuration

2. **Leave Application:**
   - Employee applies for leave via POST /api/leave-requests
   - System validates: dates, balance, overlaps, requirements
   - Auto-assigns to employee's manager
   - Auto-approves if no approval required

3. **Leave Approval:**
   - Manager receives pending request
   - Approves/rejects via PUT /api/leave-requests
   - On approval: Balance deducted immediately
   - On rejection: Balance unchanged

4. **Leave Cancellation:**
   - Employee or manager can cancel
   - If approved leave cancelled: Balance restored
   - If pending leave cancelled: No balance impact

5. **Year-End Processing:**
   - Run `carryForwardLeaves()` for all employees
   - Eligible leaves carried forward (up to max)
   - Non-eligible leaves reset to max

## Employee Portal (Phase 5)

**Full employee self-service portal** accessible at `/user` route (role-aware):

**For Employees:**
- **Dashboard:** Leave balance, upcoming leaves, recent payslips, quick actions
- **My Leaves:** Apply for leave, view history, approve subordinate leaves (if manager)
- **Payslips:** View salary history, earnings/deductions breakdown, attendance details
- **Profile:** Personal info, employment details, change password

**Components:** (`src/app/user/clientComponents/employee/`)
- `EmployeeDashboard.tsx` - Employee home with overview widgets
- `EmployeeLeaves.tsx` - 3-tab leave management (Apply, My Leaves, Approvals)
- `EmployeePayslips.tsx` - Salary history viewer with period selector
- `EmployeeProfile.tsx` - Personal information and password change

**Role-Based Navigation:**
- Employers see: Companies, Employees, Salaries, Payments
- Employees see: Dashboard, My Leaves, Payslips, Profile
- Modified: `NavContainer.tsx`, `userSideBar.tsx`, `userMainBox.tsx`

**New API Endpoints:**
- `GET /api/employees/leave-balance?employeeId=xxx` - Leave balance summary
- `POST /api/users/change-password` - Change password

### Leave Integration with Salary (Phase 4)

**Salary-Leave Integration** seamlessly combines attendance-based deductions with leave-based deductions:

**Leave Deduction Helper** (`src/app/lib/leaveDeductionCalculation.tsx`):
- `calculateLeaveDeductions(employeeId, period, basic, divideBy)` - Main calculation
  - Finds approved no-pay leaves for the period
  - Handles cross-period leaves (counts only days in period)
  - Formula: `(basic / divideBy) × leave days`
  - Returns: totalLeaveDeduction, leaveDeductions array, reason
- `getLeaveDeductionSummary(employeeId, period)` - For payslip display
- `validateSalaryWithLeaves(employeeId, period)` - Check for pending leaves

**Salary Generation Flow** (updated):
1. Calculate attendance-based noPay (absent, late, left early)
2. Calculate leave-based noPay (approved no-pay leaves)
3. Combine: `totalNoPay = attendanceNoPay + leaveNoPay`
4. Combine reasons: `"3 absent days; 2 days No-Pay Leave"`
5. Final salary: `basic + holidayPay + additions + ot - deductions - totalNoPay`

**Salary Record Structure:**
```javascript
{
  noPay: {
    amount: 18750, // Combined attendance + leaves
    reason: "3 absent days; 2 days No-Pay Leave"
  },
  leaveDeductions: [
    {
      leaveRequestId: "...",
      leaveType: "No-Pay Leave",
      days: 2,
      amount: 10000
    }
  ]
}
```

**Paid vs No-Pay Leaves:**
- Paid leaves (AL, CL, ML): Deduct from balance, no salary impact
- No-pay leaves (NPL): Deduct from salary, tracked in leaveDeductions[]

## Migration & Database Updates

**Running Phase 1 Migration:**
```bash
node scripts/migration-phase1.js
```

This script:
- Updates existing User, Employee, Salary collections with new fields
- Creates default TaxConfiguration for 2025
- Creates default LeaveTypes for each company (AL, CL, ML, NPL)
- Initializes employee leave balances

**Default Leave Types:**
- Annual Leave (AL): 14 days/year, paid
- Casual Leave (CL): 7 days/year, paid
- Medical Leave (ML): 7 days/year, paid, requires document
- No-Pay Leave (NPL): Unlimited, unpaid

## Additional Context

- The system is designed for Sri Lankan payroll regulations (EPF/ETF/APIT)
- Supports both simulated data (for demos) and real attendance data (production)
- Price calculation logic in `src/app/api/purchases/price/priceUtils.tsx`
- Holiday management in `src/app/api/calendar/holidays/holidayHelper.tsx`
- **NEW**: Leave types are fully customizable - employers can create custom leave types beyond defaults
- **NEW**: Tax slabs are editable by admin - can be updated for new tax years

---

## Security Best Practices

**IMPORTANT:** A comprehensive security audit was conducted on 2025-10-12. See `SECURITY_AUDIT_REPORT.md` for detailed findings.

### Critical Security Rules

1. **NEVER use "google" or any known string as a password**
   - Use cryptographically random strings: `crypto.randomBytes(32).toString('hex')`
   - Track authentication provider separately (`authProvider` field)

2. **ALWAYS validate user status in authentication**
   - Check `user.isActive` before allowing login
   - Check `user.canLogin` for employee roles
   - Enforce `forcePasswordChange` requirement

3. **NEVER use console.log/console.error in production**
   - Use environment-aware logging
   - Send errors to monitoring service (Sentry, Datadog)
   - Remove all console statements before production deployment

4. **ALWAYS implement rate limiting**
   - Authentication endpoints: 5 attempts per 15 minutes
   - Password change: 3 attempts per hour
   - API endpoints: 100 requests per 15 minutes

5. **ALWAYS paginate list endpoints**
   - Default limit: 50 items
   - Max limit: 1000 items
   - Include total count for pagination UI

### Authentication & Authorization Checklist

When adding/modifying authentication:
- [ ] Check session exists (`await getServerSession(options)`)
- [ ] Validate user role matches endpoint requirements
- [ ] Check `user.isActive` status
- [ ] For employee role, verify `canLogin` permission
- [ ] Verify company/resource ownership (except for admin)
- [ ] Handle "visit" and "aided" mode restrictions
- [ ] Log sensitive operations for audit trail

### API Route Security Pattern

```typescript
export async function POST(req: NextRequest) {
  try {
    // 1. Get and validate session
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Check role-based access
    if (session.user.role === "employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Connect to database
    await dbConnect();

    // 4. Parse and validate input with Zod
    const body = await req.json();
    const validatedData = yourSchema.parse(body);

    // 5. Check resource ownership (unless admin)
    if (session.user.role !== "admin") {
      const resource = await Resource.findById(validatedData.id);
      if (resource.user.toString() !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // 6. Check company mode restrictions
    const company = await Company.findById(validatedData.companyId);
    if (session.user.role !== "admin" &&
        (company.mode === "aided" || company.mode === "visit")) {
      return NextResponse.json(
        { error: "You are not allowed to modify this company" },
        { status: 403 }
      );
    }

    // 7. Perform operation
    // ... business logic ...

    // 8. Return success response
    return NextResponse.json({ message: "Success", data }, { status: 200 });
  } catch (error) {
    // 9. Handle errors appropriately
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    // NEVER expose error details in production
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
```

### Password Security

**Minimum Requirements:**
- 12 characters minimum length
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Zod Schema:**
```typescript
const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Must contain uppercase letter")
  .regex(/[a-z]/, "Must contain lowercase letter")
  .regex(/[0-9]/, "Must contain number")
  .regex(/[^A-Za-z0-9]/, "Must contain special character");
```

### Sensitive Data Handling

**Password Field Exclusion:**
```typescript
// Method 1: Select exclusion in query
const user = await User.findOne({ email }).select('-password');

// Method 2: Model-level exclusion (recommended)
userSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    delete ret.password;
    return ret;
  }
});
```

**Never Log Sensitive Data:**
- Passwords (plaintext or hashed)
- Session tokens
- API keys
- Personal identification numbers (NIC)
- Salary amounts in error messages

### Performance Best Practices

1. **Use Indexes** (already implemented well)
   ```typescript
   employeeSchema.index({ company: 1, memberNo: 1 }, { unique: true });
   ```

2. **Avoid N+1 Queries**
   ```typescript
   // BAD: Query in loop
   for (const employee of employees) {
     const company = await Company.findById(employee.company);
   }

   // GOOD: Batch query or populate
   const employees = await Employee.find(filter)
     .populate('company', 'name employerNo')
     .lean();
   ```

3. **Use Lean Queries** for read-only operations
   ```typescript
   const companies = await Company.find(filter).lean();
   ```

4. **Paginate Large Datasets**
   ```typescript
   const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
   const limit = 50;
   const skip = (page - 1) * limit;

   const results = await Model.find(filter).skip(skip).limit(limit);
   const total = await Model.countDocuments(filter);
   ```

### Error Handling

**Production vs Development:**
```typescript
catch (error) {
  // Always log server-side (use logging service in production)
  console.error("[DEV ONLY]", error);

  // Return sanitized error to client
  return NextResponse.json(
    {
      error: "An unexpected error occurred",
      // Only include debug info in development
      ...(process.env.NODE_ENV === 'development' && {
        debug: error instanceof Error ? error.message : String(error)
      })
    },
    { status: 500 }
  );
}
```

### Database Query Optimization

**Batch Operations:**
```typescript
// GOOD: Use aggregation for counts
const employeeCounts = await Employee.aggregate([
  { $match: { company: { $in: companyIds }, active: true } },
  { $group: { _id: "$company", count: { $sum: 1 } } }
]);

// BAD: Individual count queries in loop
for (const company of companies) {
  const count = await Employee.countDocuments({ company: company._id });
}
```

**Select Only Needed Fields:**
```typescript
const employees = await Employee.find(filter)
  .select('_id name memberNo company')
  .lean();
```

### Security Headers (to be implemented)

Add to `next.config.js`:
```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains'
        }
      ]
    }
  ];
}
```

### Middleware Enhancements (to be implemented)

```typescript
// Enhanced middleware with role-based protection
export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL('/auth/signIn', req.url));
  }

  // Check active status
  if (!token.isActive) {
    return NextResponse.redirect(new URL('/auth/signIn?error=AccountDisabled', req.url));
  }

  // Role-based route protection
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin') && token.role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  // Employee role restrictions
  if (token.role === 'employee') {
    const employerOnlyRoutes = [
      '/user/mycompanies',
      '/user/employees',
      '/user/organization',
      '/user/salaries',
      '/user/payments'
    ];

    if (employerOnlyRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/user?userPageSelect=dashboard', req.url));
    }
  }

  return NextResponse.next();
}
```

### Testing Checklist

Before deploying:
- [ ] Run security audit: `npm audit`
- [ ] Check for exposed secrets: `git secrets --scan`
- [ ] Test authentication bypass attempts
- [ ] Verify RBAC on all endpoints
- [ ] Test with deactivated user accounts
- [ ] Verify pagination works correctly
- [ ] Test rate limiting (if implemented)
- [ ] Check error messages don't expose sensitive info
- [ ] Verify all console.log statements removed
- [ ] Test with SQL injection payloads (via Zod)
- [ ] Test with XSS payloads (React escapes by default)

### Compliance & Audit

**Audit Logging (to be implemented):**
```typescript
await AuditLog.create({
  user: session.user.id,
  action: "EMPLOYEE_CREATED",
  resource: "Employee",
  resourceId: newEmployee._id,
  changes: { name: newEmployee.name, memberNo: newEmployee.memberNo },
  ip: req.headers.get('x-forwarded-for') || req.ip,
  userAgent: req.headers.get('user-agent'),
  timestamp: new Date()
});
```

**GDPR Compliance:**
- Implement data export functionality
- Implement data deletion (right to be forgotten)
- Add consent management
- Document data retention policies
- Implement audit trail for data access

### Known Security Issues (From Audit)

**CRITICAL - Fix Immediately:**
1. ❌ Password "google" authentication bypass
2. ❌ Missing isActive/canLogin checks in authentication
3. ❌ Weak password policy (4 char minimum)

**HIGH - Fix This Month:**
4. ❌ Console.log statements in production code
5. ❌ No rate limiting on authentication
6. ❌ Middleware lacks role-based protection

**MEDIUM - Fix This Quarter:**
7. ❌ Missing pagination on list endpoints
8. ❌ N+1 query problems in several routes
9. ❌ No explicit CSRF protection

See `SECURITY_AUDIT_REPORT.md` for detailed information and remediation steps.

### Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [NextAuth.js Security](https://next-auth.js.org/configuration/options#security)
- [MongoDB Security Checklist](https://www.mongodb.com/docs/manual/administration/security-checklist/)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

**Last Security Audit:** 2025-10-12
**Next Security Audit:** 2025-11-12 (Monthly)
