# Phase 4 Salary-Leave Integration - COMPLETED ✅

**Date Completed:** 2025-10-10
**Duration:** ~30 minutes
**Status:** Leave deductions fully integrated with salary generation

---

## Summary

Phase 4 backend integration is complete! No-pay leave deductions are now automatically calculated and included in salary generation. The system seamlessly combines attendance-based deductions with leave-based deductions.

---

## What Was Implemented

### 1. **Leave Deduction Calculation Helper** (`src/app/lib/leaveDeductionCalculation.tsx`)

Created comprehensive helper functions for calculating and managing leave deductions:

#### **calculateLeaveDeductions(employeeId, period, basic, divideBy)**
Main calculation function that:
- Finds all approved no-pay leave requests for the salary period
- Handles leaves that span across periods (only counts days within the period)
- Calculates deduction using formula: `(basic / divideBy) × leave days`
- Returns:
  ```javascript
  {
    totalLeaveDeduction: number,
    leaveDeductions: [
      {
        leaveRequestId: ObjectId,
        leaveType: "No-Pay Leave",
        days: 3,
        amount: 15000
      }
    ],
    leaveDeductionReason: "3 days No-Pay Leave"
  }
  ```

#### **getLeaveDeductionSummary(employeeId, period)**
Summary function for display in payslips:
- Separates paid leaves and no-pay leaves
- Shows leave details for the period
- Calculates total days for each category
- Returns:
  ```javascript
  {
    paidLeaves: [...],
    noPayLeaves: [...],
    totalPaidLeaveDays: 5,
    totalNoPayLeaveDays: 3
  }
  ```

#### **validateSalaryWithLeaves(employeeId, period)**
Validation function:
- Checks for pending leave requests in the period
- Returns warnings if pending leaves exist
- Still allows salary generation (pending leaves don't affect salary)
- Returns:
  ```javascript
  {
    valid: true,
    warning: "2 pending leave request(s) (3 days) in this period...",
    pendingLeaves: [...]
  }
  ```

### 2. **Salary Generation Integration** (`src/app/api/salaries/generate/salaryGeneration.tsx`)

Modified the `generateSalaryForOneEmployee` function to:

**Before (Attendance Only):**
```javascript
const finalSalary =
  employee.basic +
  holidayPay +
  totalAdditions +
  ot -
  totalDeductions -
  noPay; // Only attendance-based
```

**After (Attendance + Leaves):**
```javascript
// Calculate leave deductions
const {
  totalLeaveDeduction,
  leaveDeductions,
  leaveDeductionReason
} = await calculateLeaveDeductions(
  employee._id,
  period,
  source.basic,
  source.divideBy
);

// Combine attendance-based noPay with leave deductions
const totalNoPay = noPay + totalLeaveDeduction;

// Combine reasons
const combinedNoPayReason = [noPayReason, leaveDeductionReason]
  .filter(Boolean)
  .join("; ");

const finalSalary =
  employee.basic +
  holidayPay +
  totalAdditions +
  ot -
  totalDeductions -
  totalNoPay; // Attendance + leaves
```

**Salary Data Structure:**
```javascript
{
  ...
  noPay: {
    amount: totalNoPay, // Combined attendance + leaves
    reason: combinedNoPayReason // "3 absent days; 2 days No-Pay Leave"
  },
  leaveDeductions: [
    {
      leaveRequestId: "...",
      leaveType: "No-Pay Leave",
      days: 2,
      amount: 10000
    }
  ],
  ...
}
```

---

## How It Works

### Leave Deduction Calculation Flow

1. **Salary Generation Triggered** (for period 2025-10)
   ```
   User generates salary for employee for October 2025
   ```

2. **Attendance-Based Deductions Calculated**
   ```
   - Absent days: 3 days → noPay = 15,000
   - Reason: "3 absent days"
   ```

3. **Leave-Based Deductions Calculated**
   ```
   - Query: Find approved no-pay leaves overlapping with October 2025
   - Found: 1 leave request (Oct 15-17, 3 days, No-Pay Leave)
   - Calculate: (basic 300,000 / divideBy 240) × 3 days = 3,750
   - totalLeaveDeduction = 3,750
   - leaveDeductionReason = "3 days No-Pay Leave"
   ```

4. **Combined Deductions**
   ```
   - totalNoPay = 15,000 + 3,750 = 18,750
   - combinedReason = "3 absent days; 3 days No-Pay Leave"
   ```

5. **Final Salary Calculated**
   ```
   finalSalary = 300,000 (basic)
                + 0 (holiday pay)
                + 50,000 (additions)
                + 20,000 (OT)
                - 35,000 (deductions)
                - 18,750 (total no pay)
                = 316,250
   ```

6. **Salary Record Saved**
   ```javascript
   {
     employee: "...",
     period: "2025-10",
     basic: 300000,
     noPay: {
       amount: 18750,
       reason: "3 absent days; 3 days No-Pay Leave"
     },
     leaveDeductions: [
       {
         leaveRequestId: "...",
         leaveType: "No-Pay Leave",
         days: 3,
         amount: 3750
       }
     ],
     finalSalary: 316250
   }
   ```

---

## Handling Cross-Period Leaves

### Example: Leave Spans Multiple Months

**Scenario:**
- Leave Request: Sept 28 - Oct 5 (8 days total)
- No-Pay Leave
- Basic: 240,000
- DivideBy: 240
- Daily Rate: 1,000

**September Salary (2025-09):**
```
Period: Sept 1 - Sept 30
Overlap: Sept 28 - Sept 30 (3 days)
Deduction: 1,000 × 3 = 3,000
```

**October Salary (2025-10):**
```
Period: Oct 1 - Oct 31
Overlap: Oct 1 - Oct 5 (5 days)
Deduction: 1,000 × 5 = 5,000
```

The `calculateDaysBetween` function correctly calculates only the days that fall within each salary period.

---

## Formula Reference

### Daily Rate Calculation
```
Daily Rate = Basic Salary / DivideBy

Examples:
- Basic: 300,000, DivideBy: 240 → Daily Rate = 1,250
- Basic: 200,000, DivideBy: 200 → Daily Rate = 1,000
```

### Leave Deduction Amount
```
Deduction = Daily Rate × Leave Days in Period

Examples:
- Daily Rate: 1,250, Leave Days: 3 → Deduction = 3,750
- Daily Rate: 1,000, Leave Days: 5 → Deduction = 5,000
```

### Final Salary Formula (Updated)
```
Total Earnings = Basic + Holiday Pay + Additions (affecting earnings) - Deductions (affecting earnings)
EPF 8% = Total Earnings × 0.08
Total Additions = Sum of all additions
Total Deductions = Sum of all deductions + EPF 8%
Attendance NoPay = Calculated from attendance records
Leave NoPay = Sum of leave deductions
Total NoPay = Attendance NoPay + Leave NoPay

Final Salary = Basic + Holiday Pay + Total Additions + OT - Total Deductions - Total NoPay
```

---

## Paid Leaves vs No-Pay Leaves

### Paid Leaves (e.g., Annual Leave, Casual Leave)
- ✅ Deducted from leave balance
- ✅ Employee gets full salary
- ❌ No deduction from salary
- 📊 Tracked in `employee.leaveTypes.balance`

### No-Pay Leaves (e.g., No-Pay Leave, Unpaid Leave)
- ❌ Not deducted from any balance (unlimited)
- ❌ Employee loses salary for leave days
- ✅ Deducted from salary during generation
- 📊 Tracked in `salary.leaveDeductions[]`

---

## Integration Points

### 1. **With Leave Management (Phase 3)**
- Uses LeaveRequest model to find approved leaves
- Filters by leave type's `isPaid` property
- Respects leave approval workflow

### 2. **With Attendance System**
- Attendance noPay: Absent days, late hours, left early
- Leave noPay: Approved no-pay leave requests
- Both combined in `salary.noPay.amount`
- Reasons combined with semicolon separator

### 3. **With Payment Structure**
- Leave deductions are separate from paymentStructure.deductions
- Stored in dedicated `salary.leaveDeductions[]` array
- Clearly visible in payslips and reports

---

## Example Scenarios

### Scenario 1: Employee with Attendance Issues + No-Pay Leave
```
Employee: John Doe
Period: October 2025
Basic: 300,000
DivideBy: 240
Daily Rate: 1,250

Attendance Issues:
- 2 absent days → 2,500
- 4 hours left early → 1,042

Approved Leaves:
- Oct 15-17 (3 days, No-Pay Leave) → 3,750
- Oct 20-21 (2 days, Annual Leave) → 0 (paid leave, no deduction)

Calculations:
- Attendance NoPay: 3,542
- Leave NoPay: 3,750
- Total NoPay: 7,292
- NoPay Reason: "2 absent days, 4h left early; 3 days No-Pay Leave"

Final Salary: 300,000 + 50,000 - 35,000 - 7,292 = 307,708
```

### Scenario 2: Perfect Attendance + Paid Leave Only
```
Employee: Jane Smith
Period: October 2025
Basic: 250,000

Attendance: Perfect (0 noPay)
Approved Leaves:
- Oct 10-12 (3 days, Annual Leave) → 0 (paid)
- Oct 25 (1 day, Casual Leave) → 0 (paid)

Calculations:
- Attendance NoPay: 0
- Leave NoPay: 0
- Total NoPay: 0
- NoPay Reason: ""

Final Salary: Full salary (no deductions)
```

### Scenario 3: Leave Spanning Two Months
```
Employee: Mike Johnson
Period: October 2025
Basic: 240,000
DivideBy: 240
Daily Rate: 1,000

Leave: Sept 28 - Oct 3 (6 days, No-Pay Leave)

October Salary:
- Days in October: Oct 1-3 (3 days)
- Deduction: 1,000 × 3 = 3,000
- NoPay Reason: "3 days No-Pay Leave"

September Salary (generated separately):
- Days in September: Sept 28-30 (3 days)
- Deduction: 1,000 × 3 = 3,000
```

---

## Files Modified

### Modified Files:
- `src/app/api/salaries/generate/salaryGeneration.tsx` - Integrated leave deductions
  - Added import for calculateLeaveDeductions
  - Added leave calculation after attendance noPay
  - Combined noPay amounts and reasons
  - Added leaveDeductions array to salary data

### New Files:
- `src/app/lib/leaveDeductionCalculation.tsx` - Leave deduction helpers
  - calculateLeaveDeductions()
  - getLeaveDeductionSummary()
  - validateSalaryWithLeaves()

### Unchanged (Already Ready):
- `src/app/models/Salary.tsx` - Already has leaveDeductions field
- `src/app/models/LeaveRequest.tsx` - Already has approval workflow
- `src/app/models/LeaveType.tsx` - Already has isPaid field

---

## Testing Checklist

### Basic Functionality:
- [x] Calculate leave deduction for single no-pay leave
- [x] Calculate leave deduction for multiple no-pay leaves
- [x] Ignore paid leaves in deduction calculation
- [x] Handle leave spanning multiple months
- [x] Combine attendance noPay with leave noPay
- [x] Generate correct noPay reason

### Edge Cases:
- [x] Leave entirely outside salary period (0 deduction)
- [x] Leave partially overlapping salary period
- [x] Leave exactly matching salary period
- [x] Multiple leaves in same period
- [x] No leaves in period (no deduction)
- [x] Pending leaves (ignored, not deducted)

### Integration:
- [x] Salary generation with leave deductions
- [x] Leave deductions stored in database
- [x] Leave deductions visible in salary record
- [x] Correct daily rate calculation (divideBy 240/200)

---

## Next Steps - Phase 5: Employee Portal UI

Now that salary-leave integration is complete, proceed to **Phase 5: Employee Portal UI**:

### Phase 5 Tasks:
1. **Employee Dashboard** (`/user/employee/dashboard`)
   - Welcome message with employee details
   - Leave balance summary cards
   - Upcoming leaves calendar
   - Pending approvals (if manager)
   - Recent payslips

2. **Leave Management Pages**
   - Apply for leave form
   - My leaves list (with filters)
   - Leave approval interface (for managers)
   - Leave balance details

3. **Salary & Payslip Pages**
   - View payslips
   - Download payslip PDF
   - Salary history
   - Leave deductions breakdown

4. **Profile Pages**
   - View profile
   - Change password
   - Update personal details (if allowed)

---

## API Endpoints Ready for UI

All backend APIs are ready and tested:

### Leave Management:
- ✅ GET /api/leave-types?companyId=xxx
- ✅ GET /api/leave-requests?companyId=xxx&myRequests=true
- ✅ GET /api/leave-requests?companyId=xxx&pendingApprovals=true
- ✅ POST /api/leave-requests (apply for leave)
- ✅ PUT /api/leave-requests (approve/reject/cancel)

### Employee Data:
- ✅ GET /api/employees?company=xxx (list employees)
- ✅ GET /api/employees/hierarchy?action=subordinates (for managers)

### Salary Data:
- ✅ GET /api/salaries (with leave deductions integrated)
- ✅ POST /api/salaries/generate (auto-includes leave deductions)

### Helper Functions Available:
- ✅ getLeaveBalanceSummary(employeeId)
- ✅ getUpcomingLeaves(employeeId)
- ✅ getLeaveHistory(employeeId, year)
- ✅ getLeaveDeductionSummary(employeeId, period)

---

**Phase 4 Salary-Leave Integration: ✅ COMPLETE**
**Ready for Phase 5 (Employee Portal UI)!**
