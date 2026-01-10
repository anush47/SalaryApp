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
*   **Attendance:** Records employee clock-in/out events with location verification, device tracking, and approval status.

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
*   `applicableFor` - Employee types (Array: `["permanent", "contract", ...]` or `["all"]`). Note: "all" is mutually exclusive with specific types.
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
*   **Auto-Acknowledgment System:** Employers can enable `autoAcknowledge` for specific employees. When enabled, newly generated salaries and advances are automatically marked as "Acknowledged".
*   **Integrated Payment History:** Employees have a unified "Payments" tab that combines salary payments and advances, ensuring clear visibility of their financial history.

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

### 3.6. Attendance and Geofencing

The application features a robust live attendance system with tiered location verification and employer management capabilities.

#### 3.6.1. Clock-in/out Mechanism
*   **Multi-Platform**: Support for PWA/Web-based check-in with specialized logic for mobile users.
*   **Device Identity**: Generates a persistent `deviceId` via `localStorage` and captures `deviceDetails` (UserAgent) for every record to prevent clock-in fraud.
*   **Verification Modes**:
    *   **Standard**: Validates user location against the company's geofence (latitude, longitude, and radius).
    *   **Overrides**: Allows individual employees to have custom allowed locations or be marked as "Remote" (bypassing geofencing while remaining verified).
    *   **Enforcement**: Configurable setting to block check-ins if the user is outside allowed zones.

#### 3.6.2. Employer Management
*   **Dashboard**: Real-time view of "Present Now" employees and comprehensive logs with date filtering.
*   **Data Integrity (Timestamp Restriction)**: Prevents employers from setting an attendance time earlier than the employee's preceding record to maintain logical consistency.
*   **Manual Control**: Moving away from auto-save to an explicit "Update Record" workflow for status and time corrections.
*   **Deletion**: Secure record removal with a Material-UI confirmation dialog for critical actions.

#### 3.6.3. Verification UI
*   **Map Integration**: Uses Leaflet to visually demonstrate the "Check-in Location" (marker) relative to the "Allowed Geofence" (circle) during record review.
*   **Precision Tracking**: Captures and displays GPS accuracy (± meters) to help employers judge potential verification failures.

## 4. Service Layer Architecture

The application follows a clean architecture with clear separation of concerns:

### 4.1. Service Layer Structure

#### 4.1.1. Service Files
* Employee service: `src/app/api/employees/service.ts`
* Company service: `src/app/api/companies/service.ts`
* Department service: `src/app/api/departments/service.ts`
* Leave request service: `src/app/api/leave-requests/service.ts`
* Leave type service: `src/app/api/leave-types/service.ts`
* Tax configuration service: `src/app/api/tax-configuration/service.ts`
* Business logic separated from route handlers
* Zod schemas defined within service files
* Proper error handling within service methods

#### 4.1.2. Schema Definitions
* Validation schemas in separate files: `src/app/lib/schemas.ts`
* Common types/interfaces in: `src/app/lib/types.ts`
* Centralized validation for all API endpoints
* Consistent data validation across the application

### 4.2. API Response Architecture

#### 4.2.1. Response Structure
Standardized response interface:
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code?: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    executionTime?: number;
  };
}
```

#### 4.2.2. Response Utilities
* Centralized API response utilities in `src/app/lib/apiResponseUtils.ts`
* Consistent response formatting across all endpoints
* Proper error message handling
* Success and error response helpers

### 4.3. Middleware System

#### 4.3.1. Authentication & Authorization
* Session verification using NextAuth.js
* Role-based access control (admin, employer, employee)
* Company access verification
* Request context creation with user information

#### 4.3.2. Error Handling
* Custom error classes (ValidationError, NotFoundError, ForbiddenError, etc.)
* Centralized error handling
* Consistent error response formatting
* Multiple error types with specific status codes

## 5. Frontend Integration

The frontend components follow a consistent pattern:

### 5.1. Data Fetching
* API calls abstracted into service functions in `src/app/lib/api/`
* Consistent response handling across all components
* Proper error message extraction from responses
* Loading and error state management

### 5.2. React Query Integration
* Centralized data fetching with TanStack Query
* Caching and stale time management
* Optimistic updates where appropriate
*   Consistent query keys across the application

### 5.3. UI Theming
*   **Theme Palette:** Use MUI theme palette colors (e.g., `primary.main`, `success.main`, `warning.main`, `error.main`) instead of hardcoded hex values.
*   **Backgrounds:** Use `action.hover` or `background.default` for background colors to ensure consistency and dark mode compatibility.
*   **Icons:** Inherit colors from the theme or parent components where possible.

## 6. Database Connection

The database connection is managed by `src/app/lib/db.tsx`. It uses a singleton pattern to create a cached Mongoose connection, preventing multiple connections in a serverless environment. It also includes a retry mechanism to handle transient database connection issues.

## 7. API Route Refactoring Plan

To maintain consistency across all API routes, follow this refactoring approach:

### 7.1. Template for New API Routes

#### 7.1.1. Service File Template
```typescript
import dbConnect from "@/app/lib/db";
import Entity from "@/app/models/Entity";
import { BadRequestError, NotFoundError, ForbiddenError } from "@/app/lib/errorHandler";
import { RequestContext } from "@/app/lib/apiResponse";
import { getPaginationParams, createPaginatedResponse, getTotalCount } from "@/app/lib/pagination";
import { z } from "zod";

// Define validation schemas
export const entityCreateSchema = z.object({
  // Define validation schema
});

export const entityUpdateSchema = z.object({
  // Define validation schema
});

const entityIdSchema = z.string().min(1, "Entity ID is required");

export class EntityService {
  static async getEntity(entityId: string, context: RequestContext) {
    await dbConnect();
    // Implementation
  }

  static async getEntities(req: any, context: RequestContext) {
    await dbConnect();
    // Implementation
  }

  static async createEntity(body: any, context: RequestContext) {
    await dbConnect();
    // Implementation
  }

  static async updateEntity(body: any, context: RequestContext) {
    await dbConnect();
    // Implementation
  }

  static async deleteEntity(body: any, context: RequestContext) {
    await dbConnect();
    // Implementation
  }
}
```

#### 7.1.2. Route Handler Template
```typescript
import { NextRequest, NextResponse } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { RequestContext } from "@/app/lib/apiResponse";
import { EntityService } from "./service";
import { entityCreateSchema, entityUpdateSchema } from "./service";
import { z } from "zod";

const entityIdSchema = z.string().min(1, "Entity ID is required");

export async function GET(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const entityId = req.nextUrl.searchParams.get("entityId");
      // Implementation
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      throw error; // Let the middleware handle the error
    }
  });
}

// Implement other methods (POST, PUT, DELETE) similarly
```

### 7.2. Routes to Refactor

The following API routes need to be updated following the same pattern:

* `src/app/api/leave-requests/route.tsx` - Leave requests API
* `src/app/api/leave-types/route.tsx` - Leave types API
* `src/app/api/departments/route.tsx` - Department management API
* `src/app/api/salaries/route.tsx` - Salary management API
* `src/app/api/payments/route.tsx` - Payment management API
* `src/app/api/tax-configuration/route.tsx` - Tax configuration API
* `src/app/api/users/route.tsx` - User management API
* All other routes in `src/app/api/`

### 7.3. Frontend Component Updates

For each route, update corresponding frontend components to use the new response structure:

* Update fetch functions to handle `success`, `data`, `error` structure
* Add proper error handling from the new response format
* Update mutation functions to process successful responses
* Ensure navigation and display logic works with new data structure

## 8. File Upload Strategy

The application uses an "on-submit" file upload strategy to ensure better user experience and data integrity. This prevents "orphaned" files (files uploaded but never attached to a record) and gives users control to remove/replace files before the final submission.

### 8.1. Architecture

1.  **Frontend (Manual Mode):**
    *   The `FileUpload` component operates in `mode="manual"`.
    *   It selects the file but **does not** upload it immediately.
    *   It passes the selected `File` object back to the parent form via `onFileSelect`.

2.  **State Management (Pending Files):**
    *   Parent components (e.g., `EmployeeProfile`, `EditEmployee`) maintain a `pendingFiles` state (e.g., `Record<string, File>`).
    *   When a user adds a document, it is stored in this state instead of being uploaded.
    *   The UI displays these as "Pending Upload".

3.  **Submission Flow (On-Submit):**
    *   When the user clicks "Save" or "Submit":
    *   The form handler iterates through `pendingFiles`.
    *   It calls `uploadService.ts` for each file.
    *   `uploadService` requests a **Presigned URL** from `/api/storage/upload`.
    *   The file is uploaded directly to cloud storage (Cloudflare R2) using the presigned URL.
    *   The resulting `key` (file path) is returned and added to the form data.
    *   Finally, the form data (with the new file keys) is sent to the backend API.

4.  **Upload Service (`src/app/lib/uploadService.ts`):**
    *   Centralized utility for handling the upload handshake.
    *   `uploadFile({ file, folder, entityId, companyId })` -> returns `{ key, filename }`.

### 8.2. Implementation Example

**Form Component:**
```tsx
const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

const handleSave = async () => {
  // 1. Upload Pending Files
  if (Object.keys(pendingFiles).length > 0) {
    // ... iterate and call uploadFile()
    // ... update form data with new keys
  }

  // 2. Submit Form Data
  mutation.mutate(formData);
};
```


## 9. Development Guidelines & Best Practices

The following guidelines reflect learnings from the Next.js 16 upgrade and recent component standardizations.

### 9.1. Next.js 16 Compatibility

*   **Dynamic Routes:** In Next.js 15/16, accessing `params` in dynamic routes (e.g., `page.tsx`, `route.ts`) is asynchronous. You must `await params` before accessing properties like `params.id`.
    ```typescript
    // Correct
    const { id } = await params;
    ```
*   **Client Components:** Any component using React hooks (`useState`, `useEffect`, `useQuery`) or event handlers must start with `"use client"`. This includes most interaction-heavy UI components.
*   **Middleware:** The file `src/middleware.ts` is deprecated in favor of `src/proxy.ts` in some custom configurations, but standard Next.js uses `middleware.ts`. Ensure your middleware exports a config matcher.
*   **MUI Compatibility:** We currently use `@mui/material` v6 with `@mui/x-data-grid` v7 to ensure compatibility with React 19.

### 9.2. DataGrid Implementation Standard

To ensure a consistent user experience across the application (Salaries, Payments, Employees, Leave Requests), follow this "Golden Standard" for DataGrids:

1.  **Container Structure:**
    *   Outer wrapper: `Box` (with width/flex settings if needed, but avoid height here).
    *   Inner wrapper: `div` with `style={{ width: "100%" }}`.
    *   Component: `DataGrid` with `sx={{ height: "calc(100vh - 230px)" }}`.
    *   *Rationale:* This structure ensures the DataGrid takes up the correct vertical space without overflowing the main layout, and the `div` wrapper prevents width calculation issues.

2.  **Server-Side Features:**
    *   Always use server-side pagination and filtering for performance.
    *   Props:
        *   `paginationMode="server"`
        *   `filterMode="server"`
        *   `rowCount={total}` (from API meta)
        *   `paginationModel={...}` & `onPaginationModelChange`
        *   `filterModel={...}` & `onFilterModelChange` (for Quick Filter)

3.  **Interactivity:**
    *   **Clickable Links:** Use `renderCell` to make primary identifiers (e.g., Employee Name, Company Name) clickable links.
    *   Use `Link` from `next/link` wrapping a `Button` (variant `text`) for consistent styling.
    *   *Example:* Navigate to employee details via `?companyPageSelect=employees&employeeId=...` query params to maintain context.

3.  **Value Transformation Guidelines (`renderCell` vs `valueGetter`):**
    *   **Priority:** Use `renderCell` as the primary method for transforming displayed values (formatting dates, currency, case changes).
    *   **Rationale:** `renderCell` is more robust for complex display logic and handles cases where the column might not have a direct field mapping. It also provides direct access to `params.row`, making it safer for nested property checks (e.g., `row.type === "advance"`).
    *   **Best Practices:**
        *   Always include a safe check for `params.row` to prevent `TypeError: cannot read property of undefined`.
        *   Use `renderCell` for:
            *   Date formatting (e.g., `dayjs(val).format()`)
            *   Currency/Number formatting (e.g., `val.toLocaleString()`)
            *   Case transformations (e.g., `.toUpperCase()`)
            *   Conditional logic based on other row properties.

4.  **Component Modes:**
    *   For complex DataGrids reusable in different contexts (e.g., "All Requests" vs "My Requests"), use a `mode` prop.
    *   Adapt `columnVisibilityModel` and API query parameters based on the mode.

### 9.4. UI/UX Interaction Standards

*   **Manual Update Pattern**: For critical record modifications (e.g., Attendance edits, Salary adjustments), avoid "auto-save on blur". Use local temporary states (`tempStatus`, `tempTimestamp`) and an explicit "Update" button to prevent accidental data corruption and minimize API noise.
*   **Critical Confirmations**: Never use the native browser `confirm()` for destructive actions like Deletion. Use a themed `MUI Dialog` to provide context (e.g., "Are you sure you want to delete [Name]'s record?") and ensure a premium, integrated experience.
*   **Actionable Feedbacks**: Always provide context-aware snackbars (e.g., "Record deleted successfully") and maintain button `loading` states during async operations to prevent double-submissions.
*   **Dependency Order**: In complex React components, ensure data fetching hooks (e.g., `useQuery`) are initialized before selectors or memoized values (`useMemo`) that depend on that data to avoid `ReferenceError`.



### 9.5. Configuration Management Standard

*   **Centralized Configuration Forms**: For complex settings shared between multiple entities (e.g., Company defaults vs. Employee overrides), implementation should use a single, reusable configuration form (e.g., `AttendanceConfigurationForm`). This ensures feature parity, consistent validation logic, and a unified UI across different contexts.
*   **Feature Flags**: Deprecated feature flags (like `liveDashboard`) should be aggressively cleaned up from both frontend interfaces and backend schemas to prevent technical debt accumulation.


## 10. API Development Patterns

### 10.1. Search Implementation
*   **Text Search:** Implement text search in the service layer using MongoDB regex queries (`$regex`) for string fields.
*   **Relational Search:** For searching populated fields (e.g., Employee Name in Leave Request), pre-fetch matching IDs and use `$in`, or use aggregation pipelines if complex matching is required.
*   **DTO Pattern:** Accepting a generic `params` object in service methods allows for flexible extension (filtering, searching, sorting) without changing the function signature.

### 10.2. Production Population
*   **Model Imports:** When using Mongoose `.populate()`, ensure the target model is explicitly imported in the service file. If the model hasn't been initialized elsewhere, Mongoose might fail to find the reference, resulting in unpopulated objects (displaying as empty or `-`).

### 10.3. Sequential Data Processing
*   **Stateful Generation:** When generating data across multiple periods (e.g., monthly salaries for an entire year), maintain a running state of balances (like salary advances) to ensure deductions in one period correctly affect the starting balance of the next.

## 11. Recent Architectural Improvements (Salary & Attendance 2.0)

### 11.1. Attendance-Driven Salary Architecture
Refactored the salary engine to move away from legacy `inOut` processing to a robust `dailyRecords` structure.

*   **Granular Daily Records**: Instead of simple IN/OUT strings, each day now stores a rich `DailyAttendanceRecord` object containing:
    *   Linked Attendance IDs (`inLogId`, `outLogId`)
    *   Shift Information (ID, Name, Times) - *Actual recorded shift*
    *   Detailed OT Breakdown (`normalOT`, `doubleOT`, `tripleOT`)
    *   Break Analysis (`breakHours`)
    *   Holiday Status (`isMercantileHoliday`, `isPublicHoliday`)
*   **Separation of Concerns**:
    *   `AttendanceAggregator`: Responsible for fetching raw punches, pairing them based on time proximity, detecting shifts, and linking leave requests.
    *   `DailyCalculationService`: Pure logic for processing a single day's stats (OT, late, working hours) given the inputs.
    *   `SalaryGenerationService`: Orchestrates the process, summing up daily totals into the final salary slip.
*   **Timezone Awareness**: All calculations now respect the company's timezone (passed explicitly to services) ensuring accurate "Start of Day" and "End of Day" determination, vital for overnight shifts.

### 11.2. Attendance Shift Management Pattern
Implements a dual-view strategy for managing shifts within attendance:

*   **Unified View Strategy (Aggregated)**:
    *   Displays a "Daily" table row even if there are multiple punches.
    *   **Shift Resolution**: The displayed shift is prioritized based on the *actual* IN record's assigned shift, falling back to the roster only if no record exists.
    *   **Synchronized Updates**: Changing a shift in this view automatically finds and updates both the IN and OUT records (paired by type) to maintain data consistency.
*   **All Records View Strategy (Raw)**:
    *   Displays every single punch (IN/OUT) as a separate row.
    *   **Read-Only Context**: Shift editing is *disabled* in this granular view to prevent desynchronization (e.g., updating the IN record's shift but forgetting the OUT record). Users are guided to use the Unified View for shift adjustments.

### 11.3. Service-to-Service Communication
*   **Type Sharing**: Strictly use `src/app/lib/types.ts` for shared interfaces (`Company`, `Employee`, `Salary`) to prevent drift between Mongoose models, Service logic, and Frontend components (DataGrids).
*   **Signature Consistency**: When Services call other Services (e.g., `SalaryService` calling `AttendanceService`), ensuring function signatures match exactly (including optional arguments like `timezone`) is critical to prevent build failures.

### 11.4. Salary Data Robustness
*   **Hybrid Storage**: `dailyRecords` stores enriched shift objects (for history) but services sanitize to IDs for valid updates.
*   **Break Resolution**: Implements `Math.max(detected, default)` logic. Automatically looks up legacy shift definitions if `breakDuration` is missing from logs.

### 11.5. Statistics Dashboard Architecture
The attendance statistics panel demonstrates modern dashboard design patterns with employer-focused analytics.

#### 11.5.1. Data Aggregation Pattern
*   **Single-Pass Aggregation**: Use `useMemo` to perform all calculations in one pass through records, tracking multiple metrics simultaneously:
    *   Daily aggregates (present, late, hours, OT)
    *   Employee-level metrics (total hours, attendance rate, compliance issues)
    *   Leaderboards (top performers, needs attention)
*   **Computed Metrics**: Calculate derived values (averages, rates, percentages) during aggregation rather than in render phase for better performance.
*   **Type Safety**: Define explicit TypeScript interfaces for aggregated data structures to ensure consistency across calculations.

**Example Structure:**
```typescript
const stats = useMemo(() => {
  const employeeData: Record<string, {
    totalHours: number;
    daysPresent: number;
    lateCount: number;
    locationIssues: number;
    // ... other metrics
  }> = {};
  
  records.forEach(r => {
    // Single-pass aggregation
  });
  
  return {
    kpis: { attendanceRate, avgHours, ... },
    charts: { dailyStats, ... },
    leaderboards: { topPerformers, needsAttention }
  };
}, [records]);
```

#### 11.5.2. Responsive Dashboard Layout
*   **Progressive Disclosure**: Use MUI Grid breakpoints to adapt layout complexity:
    *   **Mobile (xs)**: Single column, stacked cards
    *   **Tablet (sm)**: 2-column layout for paired insights
    *   **Desktop (lg)**: 3-4 column layout for comprehensive overview
*   **Consistent Card Styling**: Match KPI card design across different dashboard sections:
    ```typescript
    <Paper variant="outlined" sx={{
      p: { xs: 1, sm: 2 },
      borderLeft: `3px solid`,
      borderColor: `${color}.main`,
      textAlign: 'center'
    }}>
    ```
*   **Compact UI**: Reduce padding and spacing for information density:
    *   Card padding: `p: 1.5` instead of `p: 2-3`
    *   Chart heights: `200-250px` instead of `300px+`
    *   Typography: `subtitle2` instead of `h6` for headers

#### 11.5.3. Location Compliance Tracking
*   **Verification Flags**: Track `inVerified` and `outVerified` from attendance records to identify location compliance issues.
*   **Multi-Criteria Alerts**: Combine multiple issue types in "Needs Attention":
    *   Late arrivals (warning - yellow)
    *   Early departures (warning - yellow)
    *   Absences (error - red)
    *   Location issues (info - blue)
*   **Detailed Breakdown**: Use color-coded chips to display multiple issues per employee:
    ```typescript
    <Chip 
      label="2 late"
      size="small"
      color="warning"
      sx={{ fontSize: '0.7rem', height: 20 }}
    />
    ```

#### 11.5.4. Chart Selection Guidelines
*   **Bar Charts**: Use for categorical comparisons (daily attendance by status)
*   **Line/Area Charts**: Use for trends over time (work hours, OT trends)
*   **Stacked Charts**: Show composition (on-time vs late within present count)
*   **Compact Legends**: Use `fontSize: '12px'` for chart legends
*   **Responsive Heights**: Adjust chart heights based on screen size:
    ```typescript
    <Box height={{ xs: 200, sm: 250 }}>
    ```

#### 11.5.5. Leave Statistics Pattern
*   **Detailed Tracking**: Store leave details with employee name, date, type, and status during aggregation.
*   **Inline Display**: Position leave statistics alongside other leaderboards on large screens (3-column layout).
*   **Scrollable Content**: Use `maxHeight: 400px` with `overflowY: 'auto'` for long lists.
*   **Compact List Items**: Display each leave as a single row with dot indicator and condensed information.

## 12. Coding Standards
*   **Imports**: Use absolute aliases (`@/app/...`) to prevent relative path drift (`ts(2307)`).
*   **UI Patterns**: Design stateless tables (e.g., `DailyRecordsTable`) for reuse across Dialogs and Pages.
*   **Data Aggregation**: Prefer single-pass aggregation in `useMemo` for complex statistics calculations.
*   **Responsive Design**: Always implement mobile-first layouts with progressive enhancement for larger screens.
*   **Color Consistency**: Use theme palette colors (`primary.main`, `success.main`, etc.) instead of hardcoded values.

