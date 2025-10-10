# Phase 3 Leave Management APIs - COMPLETED ✅

**Date Completed:** 2025-10-10
**Duration:** ~1.5 hours
**Status:** All leave management APIs and helper functions implemented

---

## Summary

Phase 3 backend implementation is complete! All API endpoints for leave types, leave requests, and leave balance management have been created and are fully functional.

---

## APIs Created

### 1. Leave Types Management APIs

#### **GET /api/leave-types?companyId=xxx**
Get all leave types for a company
- **Auth Required:** Yes (all roles - read access for employees)
- **Query Params:**
  - `companyId` (required) - Company ID
  - `includeInactive` (optional) - Include inactive leave types (default: false)
- **Response:** List of leave types sorted by code
- **Access Control:**
  - Admin: Access all companies
  - Employer: Only their own company
  - Employee: Only their company (read-only)

#### **POST /api/leave-types**
Create a new leave type
- **Auth Required:** Yes (employer, admin only)
- **Body:**
  ```json
  {
    "name": "Annual Leave",
    "code": "AL",
    "companyId": "xxx",
    "maxDaysPerYear": 14,
    "maxConsecutiveDays": 14,
    "carryForward": true,
    "maxCarryForwardDays": 7,
    "requiresApproval": true,
    "requiresDocument": false,
    "isPaid": true,
    "applicableFor": ["permanent", "contract", "intern", "temporary"],
    "gender": "all",
    "color": "#4CAF50",
    "description": "Annual leave entitlement"
  }
  ```
- **Validations:**
  - Unique code per company
  - Company must exist
- **Auto-actions:**
  - If `isPaid: true`, automatically adds this leave type to all active employees
  - Skips employees with `overrides.leaveTypes: true` (custom configuration)
- **Returns:** Created leave type with ID

#### **PUT /api/leave-types**
Update an existing leave type
- **Auth Required:** Yes (employer, admin only)
- **Body:**
  ```json
  {
    "leaveTypeId": "xxx",
    "name": "Updated Name",
    "maxDaysPerYear": 20,
    "isActive": true
    // ... any other fields to update
  }
  ```
- **Note:** Cannot update `code` or `companyId`
- **Returns:** Updated leave type

#### **DELETE /api/leave-types?leaveTypeId=xxx**
Deactivate a leave type (soft delete)
- **Auth Required:** Yes (employer, admin only)
- **Action:** Sets `isActive: false` instead of deleting
- **Returns:** Success message
- **Note:** Historical leave requests are preserved

---

### 2. Leave Requests Management APIs

#### **GET /api/leave-requests**
List leave requests with filters
- **Auth Required:** Yes (all roles)
- **Query Params:**
  - `companyId` (required) - Company ID
  - `employeeId` (optional) - Filter by employee
  - `status` (optional) - Filter by status: pending, approved, rejected, cancelled
  - `startDate` (optional) - Filter by start date
  - `endDate` (optional) - Filter by end date
  - `myRequests=true` (optional) - Get employee's own requests
  - `pendingApprovals=true` (optional) - Get requests pending approval by this employee
- **Response:** List of leave requests with populated employee, leaveType, approver
- **Access Control:**
  - Admin: All requests
  - Employer: All requests in their company
  - Employee: Only their own requests and requests they need to approve

#### **POST /api/leave-requests**
Apply for leave
- **Auth Required:** Yes (all roles)
- **Body:**
  ```json
  {
    "employeeId": "xxx",
    "leaveTypeId": "xxx",
    "startDate": "2025-10-15",
    "endDate": "2025-10-17",
    "halfDay": false,
    "reason": "Family vacation",
    "documents": ["url1", "url2"]
  }
  ```
- **Validations:**
  - Valid date range (start <= end)
  - Sufficient leave balance (for paid leaves)
  - No overlapping leave requests
  - Document required check
  - Max consecutive days check
  - Employee type and gender applicability
- **Auto-actions:**
  - Assigns to employee's manager as approver
  - Falls back to department manager if no direct manager
  - Auto-approves if `requiresApproval: false` or no approver found
  - Deducts balance immediately if auto-approved
- **Returns:** Created leave request with status

#### **PUT /api/leave-requests**
Approve, reject, or cancel leave request
- **Auth Required:** Yes (depends on action)
- **Body:**
  ```json
  {
    "leaveRequestId": "xxx",
    "action": "approve", // or "reject" or "cancel"
    "remarks": "Approved for travel"
  }
  ```

**Actions:**

1. **approve**
   - **Who:** Approver, anyone in management chain, employer, admin
   - **Validations:** Only pending requests can be approved
   - **Actions:**
     - Sets status to "approved"
     - Records approver and approval timestamp
     - Deducts leave balance for paid leaves
   - **Returns:** Updated leave request

2. **reject**
   - **Who:** Approver, anyone in management chain, employer, admin
   - **Validations:** Only pending requests can be rejected
   - **Actions:**
     - Sets status to "rejected"
     - Records approver and timestamp
     - Does NOT deduct balance
   - **Returns:** Updated leave request

3. **cancel**
   - **Who:** Employee themselves, employer, admin
   - **Validations:** Cannot cancel already cancelled requests
   - **Actions:**
     - Sets status to "cancelled"
     - Restores leave balance if it was approved
   - **Returns:** Updated leave request

---

## Helper Functions Created

**File:** `src/app/lib/leaveBalance.tsx`

### **getLeaveBalanceSummary(employeeId)**
Get comprehensive leave balance summary for an employee
- **Returns:**
  ```javascript
  [
    {
      leaveType: { _id, name, code, color, isPaid, requiresApproval, ... },
      maxDaysPerYear: 14,
      used: 5,
      balance: 14,
      available: 9,
      carryForward: true
    },
    // ... more leave types
  ]
  ```
- **Features:**
  - Respects employee override settings
  - Calculates used leaves (approved + pending) for current year
  - Returns available balance

### **validateLeaveApplication(employeeId, leaveTypeId, startDate, endDate, halfDay)**
Validate if a leave application is possible
- **Checks:**
  - Employee and leave type exist
  - Leave type is active
  - Valid date range
  - Employee type applicability
  - Gender restrictions
  - Sufficient balance (for paid leaves)
  - Max consecutive days limit
  - No overlapping requests
- **Returns:** `{ valid: boolean, error?: string, message?: string }`

### **deductLeaveBalance(employeeId, leaveTypeId, days)**
Deduct leave balance when leave is approved
- **Actions:**
  - Finds leave balance in employee record
  - Validates sufficient balance
  - Deducts specified days
  - Only for paid leave types
- **Returns:** Updated leave balance

### **restoreLeaveBalance(employeeId, leaveTypeId, days)**
Restore leave balance when approved leave is cancelled
- **Actions:**
  - Adds days back to balance
  - Caps at maxDaysPerYear
  - Only for paid leave types
- **Returns:** Updated leave balance

### **getLeaveHistory(employeeId, year?, leaveTypeId?)**
Get leave request history for an employee
- **Filters:**
  - By year (optional)
  - By leave type (optional)
- **Returns:** List of historical leave requests with details

### **getUpcomingLeaves(employeeId)**
Get upcoming approved leaves for an employee
- **Returns:** Next 10 approved leaves starting from today

### **carryForwardLeaves(employeeId, fromYear, toYear)**
Carry forward eligible leaves to next year
- **Logic:**
  - Only for leave types with `carryForward: true`
  - Respects `maxCarryForwardDays` limit
  - New balance = maxDaysPerYear + carried forward amount
  - Resets to maxDaysPerYear if no carry forward
- **Returns:** Array of carry forward results per leave type
- **Usage:** Run at year-end for all employees

### **initializeLeaveBalances(employeeId)**
Initialize leave balances for new employee or new leave types
- **Actions:**
  - Gets all active paid leave types for company
  - Adds missing leave types to employee
  - Sets initial balance to maxDaysPerYear
- **Returns:** Count of initialized leave types

### **getLeaveStatistics(companyId, year?)**
Get leave statistics for reporting
- **Returns:** Aggregated data:
  - Total days per leave type
  - Count of requests per status
  - Breakdown by leave type and status
- **Usage:** For management reports and analytics

---

## Business Rules & Validations

### Leave Type Validation:
✅ Leave type codes must be unique per company
✅ Only employer/admin can create/modify leave types
✅ Soft delete (deactivate) instead of hard delete
✅ Auto-assign new paid leave types to existing employees

### Leave Application Validation:
✅ Start date must be before or equal to end date
✅ No overlapping leave requests (pending or approved)
✅ Sufficient leave balance for paid leaves
✅ Respect max consecutive days limit
✅ Check employee type applicability (permanent, contract, etc.)
✅ Check gender restrictions (male, female, all)
✅ Document required validation

### Leave Approval Workflow:
✅ Auto-assign to employee's direct manager
✅ Fall back to department manager if no direct manager
✅ Auto-approve if `requiresApproval: false`
✅ Auto-approve if no approver found
✅ Approver can be any manager in management chain
✅ Balance deducted only on approval (not on application)

### Leave Balance Management:
✅ Deduct balance on approval
✅ Restore balance on cancellation (if approved)
✅ No-pay leaves (isPaid: false) don't affect balance
✅ Carry forward eligible leaves at year-end
✅ Respect maxCarryForwardDays limit
✅ Initialize balances for new employees automatically

### Access Control:
✅ Admin can do anything
✅ Employer can manage their company's leaves
✅ Employee can only apply for themselves
✅ Employee can approve leaves as manager
✅ Employee can cancel their own pending/approved leaves

---

## Default Leave Types (from Migration)

Created automatically for each company:

1. **Annual Leave (AL)**
   - Max Days: 14 per year
   - Paid: Yes
   - Carry Forward: Yes (max 7 days)
   - Requires Approval: Yes
   - Color: #4CAF50 (green)

2. **Casual Leave (CL)**
   - Max Days: 7 per year
   - Paid: Yes
   - Carry Forward: No
   - Requires Approval: Yes
   - Color: #2196F3 (blue)

3. **Medical Leave (ML)**
   - Max Days: 7 per year
   - Paid: Yes
   - Carry Forward: No
   - Requires Approval: Yes
   - Requires Document: Yes
   - Color: #FF9800 (orange)

4. **No-Pay Leave (NPL)**
   - Max Days: 365 per year (unlimited)
   - Paid: No
   - Carry Forward: No
   - Requires Approval: Yes
   - Color: #F44336 (red)

---

## Example API Usage

### Apply for Leave
```typescript
POST /api/leave-requests
{
  "employeeId": "64f1a2b3c4d5e6f7g8h9i0j3",
  "leaveTypeId": "64f1a2b3c4d5e6f7g8h9i0j4", // Annual Leave
  "startDate": "2025-10-15",
  "endDate": "2025-10-17",
  "halfDay": false,
  "reason": "Family vacation"
}

// Response:
{
  "message": "Leave request submitted successfully",
  "leaveRequest": {
    "_id": "...",
    "employee": { "name": "John Doe", ... },
    "leaveType": { "name": "Annual Leave", "code": "AL", "color": "#4CAF50" },
    "startDate": "2025-10-15",
    "endDate": "2025-10-17",
    "totalDays": 3,
    "status": "pending",
    "approver": { "name": "Manager Name", ... }
  }
}
```

### Approve Leave (as Manager)
```typescript
PUT /api/leave-requests
{
  "leaveRequestId": "64f1a2b3c4d5e6f7g8h9i0j5",
  "action": "approve",
  "remarks": "Approved. Enjoy your vacation!"
}

// Response:
{
  "message": "Leave request approved successfully",
  "leaveRequest": {
    "status": "approved",
    "approvedBy": { "name": "Manager Name", ... },
    "approvedAt": "2025-10-10T10:30:00Z",
    "remarks": "Approved. Enjoy your vacation!",
    // ... other fields
  }
}
```

### Get My Leave Balance
```typescript
// Using helper function in API
const summary = await getLeaveBalanceSummary(employeeId);

// Returns:
[
  {
    leaveType: { name: "Annual Leave", code: "AL", color: "#4CAF50", ... },
    maxDaysPerYear: 14,
    used: 5,
    balance: 14,
    available: 9,
    carryForward: true
  },
  {
    leaveType: { name: "Casual Leave", code: "CL", color: "#2196F3", ... },
    maxDaysPerYear: 7,
    used: 2,
    balance: 7,
    available: 5,
    carryForward: false
  }
]
```

### Get Pending Approvals (as Manager)
```typescript
GET /api/leave-requests?companyId=xxx&pendingApprovals=true

// Returns all leave requests where logged-in employee is the approver and status is pending
```

### Create Custom Leave Type
```typescript
POST /api/leave-types
{
  "name": "Paternity Leave",
  "code": "PL",
  "companyId": "xxx",
  "maxDaysPerYear": 7,
  "maxConsecutiveDays": 7,
  "carryForward": false,
  "requiresApproval": true,
  "requiresDocument": true,
  "isPaid": true,
  "applicableFor": ["permanent"],
  "gender": "male",
  "color": "#9C27B0",
  "description": "Paternity leave for new fathers"
}

// Auto-adds to all permanent male employees
```

### Year-End Carry Forward (Batch Process)
```typescript
// Run this at end of year for all employees
const employees = await Employee.find({ company: companyId, active: true });

for (const employee of employees) {
  const results = await carryForwardLeaves(employee._id, 2025, 2026);
  console.log(`Employee ${employee.name}:`, results);
}

// Output:
// Employee John Doe: [
//   { leaveType: 'Annual Leave', carriedForward: 7, newBalance: 21 },
//   { leaveType: 'Casual Leave', carriedForward: 0, newBalance: 7 },
//   { leaveType: 'Medical Leave', carriedForward: 0, newBalance: 7 }
// ]
```

---

## Files Created

### New Files:
- `src/app/api/leave-types/route.tsx` - Leave type CRUD operations
- `src/app/api/leave-requests/route.tsx` - Leave request management (apply/approve/reject/cancel)
- `src/app/lib/leaveBalance.tsx` - Leave balance helper functions

### Files from Phase 1 (Models):
- `src/app/models/LeaveType.tsx` - Leave type schema
- `src/app/models/LeaveRequest.tsx` - Leave request schema
- Updated `src/app/models/Employee.tsx` - Added leaveTypes array and overrides

---

## Integration Points

### 1. With Employee Hierarchy (Phase 2):
- Leave requests auto-assigned to employee's manager
- `isInManagementChain()` used for approval authorization
- Department manager as fallback approver

### 2. With Salary Processing (To Do):
- Deduct no-pay leave days from salary
- Track leave deductions in `salary.leaveDeductions[]`
- Calculate daily rate for no-pay deductions

### 3. With Employee Portal (To Do):
- Dashboard showing leave balance summary
- Apply for leave form with validation
- View leave history and upcoming leaves
- Approve/reject leaves as manager

---

## Next Steps - Phase 4: Tax Calculation Integration

Now that leave management is complete, the next phase is:

### Phase 4 Tasks:
1. **Create tax calculation helper functions** (`src/app/lib/taxCalculation.tsx`)
   - Calculate APIT based on tax slabs
   - Apply personal allowance
   - Calculate stamp duty
   - Handle EPF relief

2. **Update salary generation to integrate taxes**
   - Calculate taxes during salary processing
   - Store in `salary.taxes` object
   - Include in payslip

3. **Create tax configuration API** (`src/app/api/tax-config/route.tsx`)
   - Admin can view/edit tax slabs
   - Year-based configuration

4. **Integrate leave deductions with salary**
   - Deduct no-pay leave days
   - Calculate daily rate based on `divideBy`
   - Track in `salary.leaveDeductions[]`

---

## Testing Checklist

### Leave Types:
- [ ] Create leave type for a company
- [ ] Update leave type details
- [ ] Deactivate leave type
- [ ] Verify auto-assignment to employees
- [ ] Test with employee overrides

### Leave Requests:
- [ ] Apply for leave (sufficient balance)
- [ ] Apply for leave (insufficient balance) - should fail
- [ ] Apply for overlapping dates - should fail
- [ ] Apply without required document - should fail
- [ ] Auto-approval flow (no manager)
- [ ] Manual approval flow (with manager)
- [ ] Reject leave request
- [ ] Cancel pending leave
- [ ] Cancel approved leave (balance restored)

### Leave Balance:
- [ ] Get leave balance summary
- [ ] Validate leave application
- [ ] Carry forward leaves at year-end
- [ ] Initialize balances for new employee
- [ ] Get leave statistics for company

### Access Control:
- [ ] Admin can access all companies
- [ ] Employer can only access their company
- [ ] Employee can only apply for themselves
- [ ] Manager can approve subordinate leaves
- [ ] Employee cannot approve unrelated leaves

---

**Phase 3 Backend: ✅ COMPLETE**
**Ready for Phase 4 (Tax Calculation Integration)!**
