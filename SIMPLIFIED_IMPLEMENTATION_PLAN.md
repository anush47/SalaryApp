# SalaryApp Enhancement - Simplified Implementation Plan

## Executive Summary

This simplified plan focuses on the core features requested:
1. **Hierarchical Employee Management** (Departments, Managers)
2. **Employee Leave Management** (Apply, Approve, Track)
3. **Employee Portal** (Login, Dashboard, View Payslips/Leaves)
4. **Tax Compliance** (APIT & Sri Lankan Taxes)

**Attendance:** Keeping existing CSV upload system (no changes needed)

**Estimated Timeline:** 4-6 weeks

---

## Simplified Scope

### What We're Building:
- ✅ Department management with hierarchy
- ✅ Manager-employee relationships
- ✅ Complete leave management system
- ✅ Employee self-service portal
- ✅ APIT tax calculations
- ✅ Leave integration with salary (deductions for no-pay leave)

### What We're NOT Building (Simplified):
- ❌ Real-time attendance tracking
- ❌ Biometric/QR/GPS attendance
- ❌ Attendance devices
- **Keep existing:** CSV attendance upload (works as-is)

---

## Implementation Phases

### **Phase 1: Foundation - Core Models** (Week 1)

#### New Models to Create:

1. **Department Model** (`src/app/models/Department.tsx`)
```typescript
{
  name: string
  company: ObjectId (ref: Company)
  manager: ObjectId (ref: Employee)
  parentDepartment: ObjectId (ref: Department)  // For hierarchy
  description: string
  isActive: boolean
}
```

2. **LeaveType Model** (`src/app/models/LeaveType.tsx`)
```typescript
{
  name: string                    // Annual, Casual, Medical, No-Pay
  company: ObjectId (ref: Company)
  code: string                    // AL, CL, ML, NPL
  maxDaysPerYear: number
  carryForward: boolean
  requiresApproval: boolean
  isPaid: boolean                 // false for no-pay leave
  color: string                   // For calendar display
  description: string
  isActive: boolean
}
```

3. **LeaveRequest Model** (`src/app/models/LeaveRequest.tsx`)
```typescript
{
  employee: ObjectId (ref: Employee)
  leaveType: ObjectId (ref: LeaveType)
  startDate: Date
  endDate: Date
  totalDays: number
  halfDay: boolean
  reason: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  approvedBy: ObjectId (ref: Employee)
  approvedAt: Date
  rejectionReason: string
  documents: string[]             // Optional attachments
}
```

4. **TaxConfiguration Model** (`src/app/models/TaxConfiguration.tsx`)
```typescript
{
  year: number
  country: "LK"
  taxSlabs: [{
    min: number
    max: number
    rate: number
  }]
  personalAllowance: { monthly: number, annual: number }
  stampDuty: { threshold: number, amount: number }
  isActive: boolean
}
```

#### Updates to Existing Models:

**User Model** - Add employee role
```typescript
{
  // ... existing fields ...
  role: "admin" | "employer" | "employee"  // Add "employee"
  employee: ObjectId (ref: Employee)        // Link to employee record
  isActive: boolean
  forcePasswordChange: boolean
}
```

**Employee Model** - Add hierarchy and leave fields
```typescript
{
  // ... existing fields ...
  user: ObjectId (ref: User)                // For employee login
  department: ObjectId (ref: Department)
  manager: ObjectId (ref: Employee)
  employeeType: "permanent" | "contract" | "intern"
  canLogin: boolean

  leaveBalance: {
    annual: number
    casual: number
    medical: number
  }
}
```

**Salary Model** - Add tax fields
```typescript
{
  // ... existing fields ...

  taxes: {
    apitAmount: number
    stampDuty: number
    totalTax: number
  }

  leaveDeductions: [{
    leaveRequestId: ObjectId
    days: number
    amount: number
  }]
}
```

**Company Model** - Add leave settings
```typescript
{
  // ... existing fields ...

  leaveSettings: {
    annualLeaves: number          // Default: 14 (Sri Lankan standard)
    casualLeaves: number          // Default: 7
    medicalLeaves: number         // Default: 7
    carryForward: boolean
    maxCarryForward: number
  }
}
```

**Deliverables:**
- All 4 new models created
- Updated existing models
- Migration scripts for existing data

---

### **Phase 2: Employee Hierarchy & Departments** (Week 1-2)

#### API Endpoints:

**Departments:**
- `POST /api/departments` - Create department
- `GET /api/departments?companyId=xxx` - List all departments
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Deactivate department
- `GET /api/departments/:id/hierarchy` - Get org chart

**Employee Hierarchy:**
- `PUT /api/employees/:id/assign-manager`
- `PUT /api/employees/:id/assign-department`
- `GET /api/employees/:id/team` - Get subordinates

#### Frontend Pages (Employer):

1. **Department Management** (`src/app/user/departments/page.tsx`)
   - List all departments
   - Create/edit department dialog
   - Assign manager to department
   - View employees in department

2. **Organizational Chart** (`src/app/user/departments/org-chart/page.tsx`)
   - Visual hierarchy tree
   - Click to view department details

3. **Updated Employee Form**
   - Add department dropdown
   - Add manager dropdown (filtered by department)
   - Add "Create Login" button for employee portal access

**Deliverables:**
- Department CRUD APIs
- Org chart visualization
- Updated employee management UI

---

### **Phase 3: Leave Management System** (Week 2-3)

#### API Endpoints:

**Leave Types (Employer):**
- `POST /api/leave-types` - Create leave type
- `GET /api/leave-types?companyId=xxx` - List leave types
- `PUT /api/leave-types/:id` - Update leave type
- `GET /api/leave-types/default` - Get default Sri Lankan leave types

**Leave Requests:**
- `POST /api/leave-requests` - Apply for leave
- `GET /api/leave-requests` - List with filters (employee, status, dates)
- `PUT /api/leave-requests/:id/approve` - Approve leave
- `PUT /api/leave-requests/:id/reject` - Reject leave
- `PUT /api/leave-requests/:id/cancel` - Cancel leave
- `GET /api/employees/:id/leave-balance` - Get current balance

#### Business Logic:

**Leave Balance Calculation:**
```javascript
// Annual allocation (start of year or joining)
Initial Balance = Company's leaveSettings.annualLeaves

// On leave approval
New Balance = Current Balance - Leave Days

// Carry forward (if enabled, at year end)
Next Year Balance = Min(Remaining Balance, maxCarryForward) + Annual Allocation
```

**Leave Approval Workflow:**
1. Employee applies for leave
2. Leave request assigned to employee's manager
3. Manager approves/rejects
4. If approved, balance deducted
5. If rejected, balance unchanged

**Integration with Salary:**
- When processing salary for a period:
  1. Check for approved leaves in that month
  2. If leave type is no-pay (isPaid: false):
     - Calculate deduction: (Basic / 30) × Leave Days
     - Add to salary.leaveDeductions
     - Deduct from final salary

#### Frontend Pages (Employer):

1. **Leave Types Setup** (`src/app/user/leave-types/page.tsx`)
   - Configure leave types for company
   - Set max days, carry forward rules
   - Activate/deactivate leave types
   - Default templates (Annual, Casual, Medical, No-Pay)

2. **Leave Approvals** (`src/app/user/leaves/approvals/page.tsx`)
   - List pending leave requests
   - Filter by department, employee
   - Approve/reject with reason
   - View leave calendar (team availability)

3. **Leave Reports** (`src/app/user/leaves/reports/page.tsx`)
   - Employee leave balance report
   - Leave usage analytics
   - Department-wise leave summary

**Deliverables:**
- Complete leave management system
- Leave approval workflow
- Leave balance tracking
- Integration with salary deductions
- Employer leave management UI

---

### **Phase 4: Employee Portal** (Week 3-4)

#### Authentication Setup:

**Update NextAuth:**
- Add "employee" role support
- Create employee account when employer clicks "Create Login"
- Auto-generate temporary password (employee changes on first login)
- Send credentials via email or SMS (optional)

#### API Endpoints for Employees:

- `GET /api/employee/dashboard` - Dashboard summary
- `GET /api/employee/profile` - View own profile
- `PUT /api/employee/profile/update` - Update contact info, photo
- `PUT /api/employee/change-password` - Change password
- `GET /api/employee/payslips` - List own payslips
- `GET /api/employee/payslips/:id/download` - Download PDF
- `GET /api/employee/leave-balance` - View leave balances
- `GET /api/employee/leave-history` - View leave history
- `POST /api/employee/apply-leave` - Apply for leave
- `GET /api/employee/team` - View team (if manager)

#### Employee Portal Pages (`src/app/employee/`):

1. **Dashboard** (`/employee/dashboard/page.tsx`)
   - Welcome message with employee name
   - Current month summary:
     - Leave balance cards
     - Upcoming leaves
     - Last salary info
   - Quick actions: Apply Leave, View Payslips

2. **Profile** (`/employee/profile/page.tsx`)
   - Personal information (read-only)
   - Contact details (editable)
   - Emergency contact
   - Change password

3. **Payslips** (`/employee/payslips/page.tsx`)
   - List of all payslips (by month/year)
   - Download PDF button
   - Summary: Basic, Deductions, Net Salary

4. **Leaves** (`/employee/leaves/page.tsx`)
   - Leave balance display
   - Apply for leave form:
     - Leave type dropdown
     - Date range picker
     - Reason textarea
     - Upload document (optional)
   - Leave history table (status, dates, approver)
   - Cancel pending leave option

5. **Team** (`/employee/team/page.tsx`) - If manager
   - List subordinates
   - View team leave calendar
   - Quick approve/reject leaves

#### Security:

- Middleware protects `/employee/*` routes
- API endpoints check `session.user.role === "employee"`
- Employees can only access their own data
- Managers can view subordinates' leaves (for approval)

**Deliverables:**
- Employee authentication
- Complete employee portal (5 pages)
- Self-service leave application
- Payslip download
- Secure access control

---

### **Phase 5: Tax Compliance (APIT)** (Week 4-5)

#### Tax Calculation Logic:

**Create Tax Utility** (`src/app/lib/taxCalculations.tsx`)

```typescript
// Sri Lankan APIT 2025 (verify current rates)
const TAX_SLABS = [
  { min: 0, max: 100000, rate: 0 },           // First LKR 100,000: 0%
  { min: 100000, max: 141667, rate: 0.06 },  // Next: 6%
  { min: 141667, max: 183333, rate: 0.12 },  // Next: 12%
  { min: 183333, max: 225000, rate: 0.18 },  // Next: 18%
  { min: 225000, max: Infinity, rate: 0.24 }, // Above: 24%
];

const PERSONAL_ALLOWANCE_MONTHLY = 100000; // LKR 1.2M annually
const STAMP_DUTY_THRESHOLD = 50000;
const STAMP_DUTY_AMOUNT = 25;

function calculateAPIT(grossSalary, epfEmployeeContribution) {
  // 1. Calculate taxable income
  const taxableIncome = grossSalary - epfEmployeeContribution;

  // 2. Apply personal allowance
  const incomeAfterAllowance = Math.max(0, taxableIncome - PERSONAL_ALLOWANCE_MONTHLY);

  // 3. Calculate APIT using tax slabs
  let apit = 0;
  let remainingIncome = incomeAfterAllowance;

  for (let slab of TAX_SLABS) {
    if (remainingIncome <= 0) break;

    const slabRange = slab.max - slab.min;
    const taxableInThisSlab = Math.min(remainingIncome, slabRange);
    apit += taxableInThisSlab * slab.rate;
    remainingIncome -= taxableInThisSlab;
  }

  // 4. Calculate stamp duty
  const stampDuty = grossSalary >= STAMP_DUTY_THRESHOLD ? STAMP_DUTY_AMOUNT : 0;

  return {
    apit: Math.round(apit),
    stampDuty,
    totalTax: Math.round(apit) + stampDuty
  };
}
```

#### Integration with Salary Processing:

**Update** `src/app/api/salaries/generate/salaryGeneration.tsx`:

```typescript
// After calculating all additions and deductions

// Calculate EPF 8% first (as it provides tax relief)
const epfEmployeeContribution = basicForSalary * 0.08;

// Calculate APIT
const { apit, stampDuty, totalTax } = calculateAPIT(
  grossSalary,
  epfEmployeeContribution
);

// Add tax to deductions
parsedDeductions.push({
  name: "APIT",
  amount: apit,
  affectTotalEarnings: false
});

parsedDeductions.push({
  name: "Stamp Duty",
  amount: stampDuty,
  affectTotalEarnings: false
});

// Store in salary record
salary.taxes = {
  apitAmount: apit,
  stampDuty: stampDuty,
  totalTax: totalTax
};
```

#### Tax Configuration:

**Admin Interface** (`src/app/admin/tax-configuration/page.tsx`)
- Configure tax slabs for current year
- Set personal allowance
- Set stamp duty threshold/amount
- Preview tax calculation

**API Endpoints:**
- `GET /api/tax/configuration/:year` - Get tax config
- `POST /api/tax/configuration` - Create/update (admin only)
- `GET /api/tax/preview` - Preview tax calculation

#### Tax Reports:

**Employer Tax Reports** (`src/app/user/reports/taxes/page.tsx`)
- Monthly tax summary (all employees)
- Employee-wise tax breakdown
- Annual tax statement (Form IT-1)
- Export to Excel/PDF

**Employee Tax View** (in employee portal)
- Show APIT deduction in payslip
- Year-to-date tax paid
- Tax certificate download (annual)

**Deliverables:**
- APIT calculation engine
- Tax configuration interface
- Integration with salary processing
- Tax reports and certificates

---

### **Phase 6: Testing & Polish** (Week 5-6)

#### Testing Checklist:

**Leave Management:**
- ✅ Apply leave (various types)
- ✅ Approve/reject leave
- ✅ Leave balance updates correctly
- ✅ No-pay leave deducts from salary
- ✅ Carry forward works (if enabled)
- ✅ Cannot apply leave beyond balance

**Employee Portal:**
- ✅ Employee can login
- ✅ Employee sees only own data
- ✅ Payslips download correctly
- ✅ Leave application works
- ✅ Manager sees subordinate leaves

**Tax Calculation:**
- ✅ APIT calculated correctly (test various salary ranges)
- ✅ Stamp duty applied correctly
- ✅ EPF relief considered
- ✅ Tax shows in payslip
- ✅ Validate against official APIT calculator

**Hierarchy:**
- ✅ Departments created/edited
- ✅ Manager assigned
- ✅ Org chart displays correctly
- ✅ Employee assigned to department

#### Performance Testing:
- Load test with 1000 employees
- Leave approval response time < 1s
- Payslip generation < 2s per employee

#### User Acceptance Testing (UAT):
- Test with 1 real company (pilot)
- Gather feedback
- Fix critical issues

**Deliverables:**
- All features tested and validated
- Bug fixes completed
- Documentation updated
- Ready for production

---

## Detailed Feature Breakdown

### Feature 1: Hierarchical Employee Management

**User Story:** As an employer, I want to organize employees into departments with managers, so I can manage the organizational structure.

**Implementation:**
1. Create Department model and CRUD APIs
2. Update Employee model with department and manager fields
3. Build department management UI
4. Build organizational chart visualization
5. Update employee form to include department/manager selection

**Test Cases:**
- Create department ✓
- Assign manager to department ✓
- Assign employee to department ✓
- View org chart ✓
- Delete department (must be empty) ✓

---

### Feature 2: Leave Management

**User Story:** As an employee, I want to apply for leave online, so my manager can approve it digitally.

**User Story:** As a manager, I want to approve/reject leave requests, so I can manage team availability.

**Implementation:**
1. Create LeaveType and LeaveRequest models
2. Build leave application API (employee)
3. Build leave approval API (manager)
4. Implement leave balance tracking
5. Build employer leave configuration UI
6. Build employee leave application UI
7. Build manager approval UI
8. Integrate no-pay leave deductions with salary

**Test Cases:**
- Configure leave types ✓
- Employee applies for annual leave ✓
- Manager approves leave ✓
- Leave balance deducted ✓
- Employee applies for no-pay leave ✓
- Salary deducts no-pay leave amount ✓
- Employee cancels pending leave ✓
- Manager rejects leave with reason ✓

---

### Feature 3: Employee Portal

**User Story:** As an employee, I want to log in and view my payslips, so I don't need to ask HR.

**User Story:** As an employee, I want to check my leave balance, so I can plan my time off.

**Implementation:**
1. Update User model to support employee role
2. Update NextAuth configuration
3. Create employee account creation flow (employer action)
4. Build employee dashboard
5. Build employee profile page
6. Build payslips listing and download
7. Build leave application page
8. Implement role-based access control

**Test Cases:**
- Employer creates employee login ✓
- Employee logs in with temporary password ✓
- Employee changes password on first login ✓
- Employee views dashboard ✓
- Employee downloads payslip PDF ✓
- Employee views leave balance ✓
- Employee applies for leave ✓
- Employee cannot access other employees' data ✓

---

### Feature 4: Tax Compliance (APIT)

**User Story:** As an employer, I want APIT to be automatically calculated, so salaries are tax-compliant.

**Implementation:**
1. Create TaxConfiguration model
2. Build APIT calculation utility
3. Integrate with salary processing
4. Add APIT to salary deductions
5. Build tax configuration UI (admin)
6. Generate tax reports
7. Generate Form IT-1 (PDF)

**Test Cases:**
- Configure tax slabs ✓
- Calculate APIT for salary LKR 75,000 (should be 0) ✓
- Calculate APIT for salary LKR 150,000 ✓
- Calculate APIT for salary LKR 300,000 ✓
- Stamp duty applied when salary > LKR 50,000 ✓
- EPF contribution reduces taxable income ✓
- Tax appears in payslip ✓
- Annual tax report generated ✓

---

## Data Migration Plan

### Step 1: Backup Database
```bash
mongodump --uri="MONGO_URL" --out=./backup-$(date +%Y%m%d)
```

### Step 2: Add Fields to Existing Collections

**Users:**
```javascript
db.users.updateMany({}, {
  $set: {
    isActive: true,
    forcePasswordChange: false,
    employee: null
  }
});
```

**Employees:**
```javascript
db.employees.updateMany({}, {
  $set: {
    user: null,
    department: null,
    manager: null,
    employeeType: "permanent",
    canLogin: false,
    leaveBalance: {
      annual: 14,  // Sri Lankan standard
      casual: 7,
      medical: 7
    }
  }
});
```

**Companies:**
```javascript
db.companies.updateMany({}, {
  $set: {
    leaveSettings: {
      annualLeaves: 14,
      casualLeaves: 7,
      medicalLeaves: 7,
      carryForward: false,
      maxCarryForward: 0
    }
  }
});
```

**Salaries:**
```javascript
db.salaries.updateMany({}, {
  $set: {
    taxes: {
      apitAmount: 0,
      stampDuty: 0,
      totalTax: 0
    },
    leaveDeductions: []
  }
});
```

### Step 3: Create Default Leave Types

For each company, create default leave types:
```javascript
const companies = db.companies.find({});

companies.forEach(company => {
  const defaultLeaveTypes = [
    {
      name: "Annual Leave",
      company: company._id,
      code: "AL",
      maxDaysPerYear: 14,
      carryForward: false,
      requiresApproval: true,
      isPaid: true,
      color: "#4CAF50",
      isActive: true
    },
    {
      name: "Casual Leave",
      company: company._id,
      code: "CL",
      maxDaysPerYear: 7,
      carryForward: false,
      requiresApproval: true,
      isPaid: true,
      color: "#2196F3",
      isActive: true
    },
    {
      name: "Medical Leave",
      company: company._id,
      code: "ML",
      maxDaysPerYear: 7,
      carryForward: false,
      requiresApproval: true,
      isPaid: true,
      color: "#FF9800",
      isActive: true
    },
    {
      name: "No-Pay Leave",
      company: company._id,
      code: "NPL",
      maxDaysPerYear: 999,
      carryForward: false,
      requiresApproval: true,
      isPaid: false,
      color: "#F44336",
      isActive: true
    }
  ];

  db.leavetypes.insertMany(defaultLeaveTypes);
});
```

### Step 4: Create Default Tax Configuration

```javascript
db.taxconfigurations.insertOne({
  year: 2025,
  country: "LK",
  taxSlabs: [
    { min: 0, max: 100000, rate: 0 },
    { min: 100000, max: 141667, rate: 0.06 },
    { min: 141667, max: 183333, rate: 0.12 },
    { min: 183333, max: 225000, rate: 0.18 },
    { min: 225000, max: 9999999, rate: 0.24 }
  ],
  personalAllowance: {
    monthly: 100000,
    annual: 1200000
  },
  stampDuty: {
    threshold: 50000,
    amount: 25
  },
  isActive: true,
  effectiveFrom: new Date("2025-01-01"),
  effectiveTo: new Date("2025-12-31")
});
```

---

## Updated CLAUDE.md Additions

After implementation, add to CLAUDE.md:

```markdown
## Leave Management

**Leave Types:** Configured per company in `/user/leave-types`
- Default types: Annual (AL), Casual (CL), Medical (ML), No-Pay (NPL)
- Each type has: max days/year, carry forward rules, paid/unpaid status

**Leave Balance:** Stored in `employee.leaveBalance`
- Allocated at year start or employee joining
- Deducted on leave approval
- Carry forward logic (if enabled)

**Leave Approval Workflow:**
1. Employee applies via `/employee/leaves`
2. Assigned to employee's manager
3. Manager approves via `/user/leaves/approvals`
4. Balance auto-deducted

**Integration with Salary:**
- No-pay leaves deduct from salary: (Basic / 30) × Days
- Stored in `salary.leaveDeductions`

## Employee Portal

**Access:** Employees with `canLogin: true` can access `/employee/*`
- Employer creates login via employee management
- First login forces password change

**Features:**
- Dashboard: Summary of leave balance, recent payslips
- Profile: View/edit contact info
- Payslips: Download PDF
- Leaves: Apply, view history, check balance

**Security:** Employees can only view own data (enforced in API)

## Tax Calculation (APIT)

**Formula:**
```
Taxable Income = Gross Salary - EPF 8%
Income After Allowance = Taxable Income - Personal Allowance (LKR 100,000/month)
APIT = Apply progressive tax slabs
Stamp Duty = LKR 25 if salary > LKR 50,000
```

**Configuration:** Admin configures via `/admin/tax-configuration`

**Integration:** APIT auto-calculated during salary generation, added to deductions

## Organizational Hierarchy

**Departments:** Created in `/user/departments`
- Can have parent department (nested hierarchy)
- Each department has a manager

**Manager Assignment:**
- Assigned at employee level
- Manager can approve subordinates' leaves
- Manager can view team in `/employee/team`
```

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Phase 1 | All models created, migrations done |
| 1-2 | Phase 2 | Departments, hierarchy, org chart |
| 2-3 | Phase 3 | Complete leave management |
| 3-4 | Phase 4 | Employee portal (5 pages) |
| 4-5 | Phase 5 | APIT integration, tax reports |
| 5-6 | Phase 6 | Testing, bug fixes, UAT |

---

## Next Steps - Approve to Proceed

Please confirm:
1. ✅ Is this simplified scope correct?
2. ✅ Any specific leave types beyond the defaults?
3. ✅ Do you want to start with Phase 1 (models)?
4. ✅ Any specific APIT rates/slabs I should use?

**Ready to start Phase 1 once you approve!**
