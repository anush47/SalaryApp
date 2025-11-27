# SalaryApp Documentation

## 1. Project Overview

SalaryApp is a comprehensive cloud-based employee and payroll management system designed for Sri Lankan businesses. It automates salary calculations, EPF/ETF contributions, attendance tracking, and official form generation. The application supports multi-company management with flexible configurations for working schedules, payment structures, and holiday calendars.

**Key Technologies:**

*   **Framework:** Next.js 14 (App Router)
*   **Frontend:** React 18 with Material-UI (MUI) v5
*   **Backend:** Next.js API Routes
*   **Authentication:** NextAuth.js (Google OAuth & Credentials)
*   **Database:** MongoDB with Mongoose
*   **State Management:** React Context API & TanStack Query
*   **Styling:** Tailwind CSS + Material-UI

## 2. Architecture

The application follows a standard Next.js App Router structure.

### 2.1. Directory Structure

*   `src/app/api/`: Contains all backend API routes for data handling.
*   `src/app/models/`: Defines the Mongoose schemas for the MongoDB database.
*   `src/app/lib/`: Includes utility functions, constants, and the database connection logic.
*   `src/app/user/`: Frontend pages for authenticated users (employers and employees).
*   `src/app/admin/`: Frontend pages for administrative users.
*   `src/middleware.ts`: Handles authentication and role-based access control for protected routes.

### 2.2. Data Models

The core of the application revolves around a set of interconnected data models:

*   **User:** Manages user accounts and roles (`admin`, `employer`, `employee`).
*   **Company:** Represents an employer entity with its specific settings (shifts, payment structures, etc.).
*   **Employee:** Stores employee data, including personal details, salary information, and hierarchical position (department, manager).
*   **Department:** Allows for organizing employees into a hierarchical structure within a company.
*   **Salary:** Records the detailed breakdown of an employee's salary for a specific period.
*   **LeaveType:** Defines the types of leave available within a company (e.g., Annual, Casual, Medical).
*   **LeaveRequest:** Tracks leave applications from employees and the approval process.
*   **TaxConfiguration:** Stores the tax slabs and rules applicable for a given year, enabling dynamic tax calculations.

## 3. Key Features

### 3.1. Authentication and Authorization

*   **Authentication:** Users can sign in using Google or email/password credentials.
*   **Role-Based Access Control (RBAC):** The `middleware.ts` file enforces strict rules based on user roles:
    *   `/admin/*` routes are accessible only by users with the `admin` role.
    *   `/user/*` routes are for `employer` and `employee` roles, with specific sub-routes restricted based on the role. For example, employees cannot access company management pages.
    *   The system checks for active user status (`isActive`) on every request.

### 3.2. Employee and Organizational Management

*   **Hierarchical Structure:** Employers can create departments and assign managers, building an organizational chart.
*   **Employee Profiles:** Comprehensive employee records including contact information, salary details, and employment history.
*   **Override System:** Employee records can have settings that override the parent company's default configurations for shifts, working days, payment structures, and leave types.

### 3.3. Leave Management

The leave management system supports fully customizable leave policies with flexible accrual periods, making it adaptable to various business needs.

#### 3.3.1. Flexible Accrual Periods

Leave types can be configured with different accrual periods beyond traditional yearly leaves:

*   **Yearly Leaves** - Traditional annual leaves (e.g., 14 days per year)
*   **Monthly Leaves** - Leaves that reset monthly (e.g., 3 sick days per month)
*   **Weekly Leaves** - Leaves that reset weekly (e.g., 0.5 days per week)
*   **Quarterly Leaves** - Leaves that reset every quarter (e.g., 3.5 days per quarter)
*   **Half-Yearly Leaves** - Leaves that reset twice a year (e.g., 7 days per half-year)
*   **Custom Period Leaves** - Leaves with custom periods (e.g., 2 days every 30/60/90 days)

Each accrual period can have a configurable reset day (e.g., 1st of month, Monday of week).

#### 3.3.2. Accrual Methods

The system supports three accrual methods:

*   **Upfront:** All leaves available immediately at period start
*   **Monthly Accrual:** Leaves accrue gradually each month (e.g., 1 day per month for 12 days/year)
*   **Pro-Rata:** Leaves accrue proportionally based on time worked (ideal for new employees)

#### 3.3.3. Core Leave Features

*   **Customizable Leave Types:** Employers can define unlimited leave policies with specific rules per leave type.
*   **Automatic Period Management:** System automatically detects period boundaries and resets balances with carry-forward support.
*   **Cross-Period Leave Handling:** Validates and splits leaves that span multiple periods (e.g., leave from Jan 29 to Feb 2 in a monthly leave type).
*   **Leave Application & Approval:** Employees apply for leave, managers receive notifications, and approvals are tracked with full audit trail.
*   **Automated Balance Tracking:** System calculates and updates balances per period upon approval or cancellation.
*   **Salary Integration:** Approved no-pay leaves are automatically deducted during salary generation, with accurate period-based calculations.
*   **Carry Forward:** Supports configurable carry-forward rules with maximum limits per period type.

#### 3.3.4. Leave Type Configuration

Each leave type includes:

*   `name` - Display name (e.g., "Monthly Sick Leave")
*   `code` - Unique identifier (e.g., "MSL")
*   `accrualPeriod` - Period type (yearly/monthly/weekly/quarterly/half-yearly/custom)
*   `maxDaysPerPeriod` - Maximum days available per period
*   `customPeriodDays` - Days in custom period (if using custom type)
*   `accrualMethod` - How leaves become available (upfront/monthly-accrual/pro-rata)
*   `resetDay` - Day when period resets (e.g., 1st of month, Monday)
*   `carryForward` - Whether unused leaves carry to next period
*   `maxCarryForwardDays` - Maximum days that can be carried forward
*   `requiresApproval` - Whether manager approval is needed
*   `requiresDocument` - Whether supporting documents are required
*   `isPaid` - Paid vs. unpaid leave
*   `applicableFor` - Employee types (permanent/contract/intern/temporary)
*   `gender` - Gender restrictions (male/female/all)

#### 3.3.5. Leave Period Examples

**Example 1: Monthly Sick Leave**
```json
{
  "name": "Monthly Sick Leave",
  "code": "MSL",
  "accrualPeriod": "monthly",
  "maxDaysPerPeriod": 3,
  "accrualMethod": "upfront",
  "resetDay": 1
}
```
Employees get 3 sick days on the 1st of each month. Unused days don't carry forward.

**Example 2: Weekly Casual Leave**
```json
{
  "name": "Weekly Casual Leave",
  "code": "WCL",
  "accrualPeriod": "weekly",
  "maxDaysPerPeriod": 0.5,
  "accrualMethod": "upfront",
  "resetDay": 1,
  "carryForward": true,
  "maxCarryForwardDays": 2
}
```
Employees get 0.5 days every Monday with carry-forward up to 2 days.

**Example 3: Quarterly Leave with Monthly Accrual**
```json
{
  "name": "Quarterly Annual Leave",
  "code": "QAL",
  "accrualPeriod": "quarterly",
  "maxDaysPerPeriod": 3.5,
  "accrualMethod": "monthly-accrual"
}
```
Employees accrue ~1.17 days per month, totaling 3.5 days by end of quarter.

#### 3.3.6. Technical Implementation

**Period Calculation Engine** (`src/app/lib/leavePeriodCalculations.tsx`):
*   `getCurrentPeriod()` - Calculates period boundaries for any date
*   `calculateAvailableLeaves()` - Determines available leaves based on accrual method
*   `spansMultiplePeriods()` - Checks if leave crosses period boundaries
*   `splitDaysAcrossPeriods()` - Splits leave days across multiple periods

**Leave Balance Management** (`src/app/lib/leaveBalance.tsx`):
*   Automatic period reset when boundaries change
*   Per-period balance tracking in employee records
*   Cross-period validation for spanning leave requests
*   Carry-forward calculation at period transitions

**Employee Leave Balance Schema:**
```typescript
{
  leaveType: ObjectId,
  maxDaysPerYear: Number,  // Represents maxDaysPerPeriod
  balance: Number,  // Current period balance
  carryForward: Boolean,
  currentPeriodStart: Date,  // Period tracking
  lastAccrualDate: Date,  // For accrual tracking
  carriedForwardBalance: Number  // Carried from previous period
}
```

#### 3.3.7. Migration

The system includes a migration script (`scripts/migration-flexible-leaves.js`) that:
*   Updates existing leave types with default yearly periods
*   Initializes employee balances with period tracking fields
*   Maintains full backward compatibility
*   Verifies successful migration

Run with: `node scripts/migration-flexible-leaves.js`

### 3.4. Salary Processing and Payroll

*   **Automated Salary Generation:** The system can generate salaries based on employee basic pay, attendance data, overtime, and other additions/deductions.
*   **Attendance Integration:** It processes in/out time data (from CSV uploads) to calculate working hours, overtime, and no-pay days.
*   **PDF Generation:** The system can generate various PDF documents, including payslips, EPF/ETF reports, and official government forms like Form A.

#### 3.4.1. Tax Calculation (APIT)

The system implements Sri Lankan APIT (Advance Personal Income Tax) with automatic progressive tax calculation.

**Tax Calculation Flow:**
```
1. Gross Salary = Basic + Holiday Pay + Additions (affecting earnings)
2. Total Earnings = Gross Salary + OT + All Additions
3. EPF 8% = Total Earnings × 0.08
4. Taxable Income = Gross Salary - EPF 8%
5. APIT = Progressive tax calculated from tax slabs
6. Stamp Duty = Rs. 25 (if Gross Salary >= Rs. 50,000)
7. Total Tax = APIT + Stamp Duty
8. Final Salary = Total Earnings - EPF 8% - Total Tax - Deductions - No Pay
```

**Sri Lankan Tax Slabs 2025 (Effective April 1, 2025):**

| Monthly Taxable Income | Tax Rate |
|------------------------|----------|
| Rs. 0 - 150,000 | 0% (Personal Relief) |
| Rs. 150,001 - 233,333 | 6% |
| Rs. 233,334 - 275,000 | 18% |
| Rs. 275,001 - 316,667 | 24% |
| Rs. 316,668 - 358,333 | 30% |
| Above Rs. 358,333 | 36% |

**Key Features:**
*   **Automatic Calculation** - Tax calculated automatically during salary generation.
*   **Progressive System** - Implements the latest progressive tax slabs (e.g., 0% to 36%).
*   **Global & Company-Specific Configuration** - Tax rules can be managed globally by admins or overridden on a per-company basis by employers.
*   **Centralized Admin Management** - Admins manage the base (global default) tax configurations for each year from the admin dashboard (`/admin?adminPageSelect=taxConfig`).
*   **Per-Company Overrides** - Employers can override the global default tax slabs and personal allowance for their company from their dedicated "Tax" page (`/user/mycompanies/[id]?companyPageSelect=tax`).
*   **Tax Preview** - API endpoint (`/api/tax-configuration/preview`) for pre-calculation.
*   **EPF Integration** - Properly deducts EPF 8% before calculating tax.
*   **Personal Allowance** - Supports the standard personal relief allowance (e.g., Rs. 150,000/month).

**Tax Configuration Management:**

The system uses a single tax document for each year (e.g., 2025). This document contains the global default tax rules and an `overrides` array to store company-specific settings.

*   **Admin Role:** Administrators are responsible for creating and maintaining the base (global) tax configuration for each year.
*   **Employer Role:** Employers can view the active tax configuration for their company on the "Tax" page.
    *   If the company is using the global default, an employer can choose to "Override and Customize" it. This adds an entry for their company to the `overrides` array in the base tax document.
    *   If an override is already in place, an employer can edit it or "Reset to Global Default," which removes their company's entry from the `overrides` array.
*   **Data Structure:** This approach ensures that there is only one master document per year, preventing database conflicts while providing full flexibility for per-company overrides.
*   **Migration script:** `node scripts/migration-tax-2025.js` can be used to set up initial configurations.

**Example (Rs. 300,000 salary):**
```
Gross Salary:        Rs. 300,000
EPF 8%:             -Rs.  24,000
Taxable Income:      Rs. 276,000

Tax Breakdown (Progressive):
  0-150,000 at 0%    = Rs. 0
  150,001-233,333 at 6% = Rs. 5,000
  233,334-275,000 at 18% = Rs. 7,500
  275,001-276,000 at 24% = Rs. 240

APIT:                Rs.  12,740
Stamp Duty:          Rs.      25
Total Tax:           Rs.  12,765
Net Salary:          Rs. 263,235
Effective Rate:      4.26%
```

### 3.5. Employee Portal

*   **Self-Service:** Employees with login access can view their own dashboard, payslips, and leave balances.
*   **Profile Management:** Employees can view their profile and change their password.
*   **Leave Application:** The portal provides an interface for employees to apply for leave and track the status of their requests.

## 4. Database Connection

The database connection is managed by `src/app/lib/db.tsx`. It uses a singleton pattern to create a cached Mongoose connection, preventing multiple connections in a serverless environment. It also includes a retry mechanism to handle transient database connection issues.
