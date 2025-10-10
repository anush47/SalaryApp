# Phase 5 Employee Portal UI - IMPLEMENTATION PLAN

**Status:** Ready to implement
**Approach:** Modify existing `/user` route to be role-aware

---

## Architecture Decision

### Current Structure:
- `/user` route shows employer dashboard (companies, employees, salaries, payments)
- Navigation is in `NavContainer` → `userSideBar` → `userMainBox`

### Employee Portal Approach:
**Modify existing `/user` route to show different UI based on role:**
- **Employer** sees: My Companies, Employees, Salaries, EPF/ETF Payments, Settings
- **Employee** sees: Dashboard, My Leaves, Payslips, Profile, Settings

---

## Implementation Steps

### Step 1: Modify Navigation Structure

#### 1.1 Update `NavContainer.tsx`
Add employee-specific selected types:
```typescript
export type Selected =
  | "quick"
  | "mycompanies"
  | "settings"
  | "purchases"
  | "employees"
  | "salaries"
  | "payments"
  // NEW: Employee-specific
  | "dashboard"      // Employee home
  | "leaves"         // Leave management
  | "payslips"       // Salary history
  | "profile";       // Personal details
```

#### 1.2 Update `userSideBar.tsx`
Modify menu array to be role-aware:
```typescript
const getMenusForRole = (role: string) => {
  if (role === "employee") {
    return [
      { name: "Dashboard", key: "dashboard", icon: <Dashboard /> },
      { name: "My Leaves", key: "leaves", icon: <EventNote /> },
      { name: "Payslips", key: "payslips", icon: <Receipt /> },
      { name: "Profile", key: "profile", icon: <Person /> },
      { name: "Settings", key: "settings", icon: <Settings /> },
    ];
  } else {
    // Employer/Admin menus (existing)
    return [
      { name: "My Companies", key: "mycompanies", icon: <Business /> },
      { name: "Employees", key: "employees", icon: <Group /> },
      { name: "Salaries", key: "salaries", icon: <LocalAtm /> },
      { name: "EPF/ETF Payments", key: "payments", icon: <Payments /> },
      { name: "Settings", key: "settings", icon: <Settings /> },
    ];
  }
};
```

#### 1.3 Update `userMainBox.tsx`
Add cases for employee-specific pages:
```typescript
case "dashboard":
  return <EmployeeDashboard user={user} />;
case "leaves":
  return <EmployeeLeaves user={user} />;
case "payslips":
  return <EmployeePayslips user={user} />;
case "profile":
  return <EmployeeProfile user={user} />;
```

### Step 2: Create Employee Dashboard

**File:** `src/app/user/clientComponents/employee/EmployeeDashboard.tsx`

**Components:**
```
EmployeeDashboard
├── WelcomeCard (name, designation, employee number)
├── LeaveBalanceCards (grid of leave types with balances)
├── UpcomingLeavesCard (calendar or list view)
├── PendingApprovalsCard (if manager)
└── RecentPayslipsCard (last 3 months)
```

**APIs to use:**
- `GET /api/employees?user=${userId}` - Get employee details
- `getLeaveBalanceSummary(employeeId)` - Get leave balances
- `getUpcomingLeaves(employeeId)` - Get upcoming leaves
- `GET /api/leave-requests?pendingApprovals=true` - Pending approvals (if manager)
- `GET /api/salaries?employee=${employeeId}` - Recent salaries

### Step 3: Create Leave Management UI

**File:** `src/app/user/clientComponents/employee/EmployeeLeaves.tsx`

**Tabs:**
```
EmployeeLeaves
├── Apply for Leave Tab
│   ├── LeaveApplicationForm
│   │   ├── Leave Type Selector
│   │   ├── Date Range Picker
│   │   ├── Half Day Toggle
│   │   ├── Reason TextField
│   │   ├── Document Upload (if required)
│   │   └── Submit Button
│   └── Leave Balance Summary (side panel)
│
├── My Leaves Tab
│   ├── Filter Bar (status, date range, leave type)
│   ├── LeaveRequestList
│   │   ├── LeaveRequestCard (per request)
│   │   │   ├── Leave type badge
│   │   │   ├── Dates & days
│   │   │   ├── Status chip
│   │   │   ├── Reason
│   │   │   └── Actions (cancel if pending/approved)
│   └── Pagination
│
└── Approve Leaves Tab (if manager)
    ├── PendingApprovalsList
    │   ├── ApprovalRequestCard
    │   │   ├── Employee info
    │   │   ├── Leave details
    │   │   ├── Approve/Reject buttons
    │   │   └── Remarks field
    └── Approved/Rejected History
```

**APIs to use:**
- `GET /api/leave-types?companyId=${companyId}` - Available leave types
- `GET /api/leave-requests?myRequests=true` - Employee's own requests
- `GET /api/leave-requests?pendingApprovals=true` - Requests to approve
- `POST /api/leave-requests` - Apply for leave
- `PUT /api/leave-requests` - Approve/reject/cancel

### Step 4: Create Payslip Viewer

**File:** `src/app/user/clientComponents/employee/EmployeePayslips.tsx`

**Components:**
```
EmployeePayslips
├── PeriodSelector (month/year dropdown)
├── PayslipList
│   ├── PayslipCard (per month)
│   │   ├── Period header
│   │   ├── Earnings breakdown
│   │   │   ├── Basic salary
│   │   │   ├── Holiday pay
│   │   │   ├── OT
│   │   │   └── Additions
│   │   ├── Deductions breakdown
│   │   │   ├── EPF 8%
│   │   │   ├── No Pay (attendance)
│   │   │   ├── Leave deductions
│   │   │   └── Other deductions
│   │   ├── Final Salary (highlighted)
│   │   └── Download PDF button
│   └── Pagination
└── LeaveDeductionDetails (expandable)
    ├── Leave deduction summary
    └── Leave deduction list (from salary.leaveDeductions[])
```

**APIs to use:**
- `GET /api/salaries?employee=${employeeId}` - Salary history
- `GET /api/employees/${employeeId}` - Employee details
- `getLeaveDeductionSummary(employeeId, period)` - Leave deduction details

### Step 5: Create Profile Page

**File:** `src/app/user/clientComponents/employee/EmployeeProfile.tsx`

**Sections:**
```
EmployeeProfile
├── PersonalInfoCard
│   ├── Avatar upload
│   ├── Name
│   ├── Email
│   ├── Phone
│   ├── Address
│   └── Edit button
├── EmploymentDetailsCard (read-only)
│   ├── Member Number
│   ├── Designation
│   ├── Department
│   ├── Manager
│   ├── Join Date
│   └── Employee Type
├── SalaryInfoCard (read-only)
│   ├── Basic Salary
│   ├── Payment Structure
│   └── Divide By
└── ChangePasswordCard
    ├── Current Password
    ├── New Password
    ├── Confirm Password
    └── Change Button
```

**APIs to use:**
- `GET /api/employees?user=${userId}` - Employee details
- `PUT /api/employees` - Update personal details (if allowed)
- `POST /api/users/change-password` - Change password

---

## Required New Icons

Import from `@mui/icons-material`:
- `Dashboard` - Dashboard icon
- `EventNote` - Leaves icon
- `Receipt` - Payslips icon
- `Person` - Profile icon
- `CalendarToday` - Date picker icon
- `AttachFile` - Document upload icon
- `CheckCircle`, `Cancel`, `Pending` - Status icons

---

## Data Flow Example

### Apply for Leave Flow:
```
1. Employee opens "My Leaves" → "Apply for Leave" tab
2. Component fetches:
   - Employee details (to get companyId, employeeId)
   - Leave types for company
   - Current leave balances
3. Employee fills form:
   - Selects leave type
   - Chooses dates
   - Enters reason
   - Uploads document (if required)
4. On submit:
   - Client-side validation
   - POST /api/leave-requests
   - API validates and creates request
   - Auto-assigns to manager
   - Returns success/error
5. UI updates:
   - Shows success message
   - Refreshes leave balance
   - Adds to "My Leaves" list
   - Clears form
```

### Approve Leave Flow (Manager):
```
1. Manager opens "My Leaves" → "Approve Leaves" tab
2. Component fetches:
   - GET /api/leave-requests?pendingApprovals=true
   - Filters requests assigned to this employee as approver
3. Manager reviews request:
   - Sees employee details
   - Sees leave type, dates, reason
   - Sees documents (if any)
4. Manager approves/rejects:
   - Enters remarks (optional)
   - Clicks Approve or Reject
   - PUT /api/leave-requests { action: "approve", remarks: "..." }
5. API processes:
   - Updates status
   - Deducts balance (if approved)
   - Records approver
6. UI updates:
   - Shows success message
   - Removes from pending list
   - (Optional) Sends notification to employee
```

---

## Responsive Design

All components must be responsive:
- **Desktop (md+):** Sidebar + main content (existing layout)
- **Tablet (sm-md):** Collapsible sidebar + main content
- **Mobile (xs-sm):** Bottom navigation or hamburger menu

Use Material-UI breakpoints:
```typescript
<Box sx={{
  display: { xs: 'block', md: 'grid' },
  gridTemplateColumns: { md: '1fr 1fr' },
  gap: 2
}}>
```

---

## State Management

Use React Query (TanStack Query) for:
- Fetching employee data
- Fetching leave requests
- Fetching salary data
- Caching and automatic refetching

Example:
```typescript
const { data: leaveBalance, isLoading } = useQuery({
  queryKey: ['leaveBalance', employeeId],
  queryFn: () => getLeaveBalanceSummary(employeeId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## Error Handling

Every API call must handle:
- Loading states (skeleton/spinner)
- Error states (error message + retry button)
- Empty states (no data message)

Example:
```typescript
if (isLoading) return <CircularProgress />;
if (error) return <Alert severity="error">Failed to load data</Alert>;
if (!data || data.length === 0) return <Typography>No leaves found</Typography>;
```

---

## Next Steps

1. ✅ Modify NavContainer to add employee selected types
2. ✅ Modify userSideBar to show role-based menus
3. ✅ Modify userMainBox to route to employee components
4. ✅ Create EmployeeDashboard component
5. ✅ Create EmployeeLeaves component (with all tabs)
6. ✅ Create EmployeePayslips component
7. ✅ Create EmployeeProfile component
8. ✅ Test complete employee portal flow
9. ✅ Create Phase 5 completion summary

---

**Implementation Order:**
1. Navigation modifications (NavContainer, userSideBar, userMainBox)
2. Employee Dashboard (simple overview)
3. Leave Management UI (most complex, highest priority)
4. Payslip Viewer (medium complexity)
5. Profile Page (simple CRUD)

Let's start with Step 1: Modifying the navigation structure!
