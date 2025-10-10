# SalaryApp Enhancement Implementation Plan

## Executive Summary

This document outlines the phased implementation plan for enhancing SalaryApp with:
1. Hierarchical Employee Management (Departments, Managers)
2. Employee Leave Management System
3. Employee Portal with Dashboard
4. Advanced Attendance Tracking (Biometric, QR, GPS)
5. Tax Compliance (APIT & Sri Lankan Tax System)

**Estimated Timeline:** 8-12 weeks (depending on resources and testing requirements)

---

## Current System Analysis

### What Exists:
- ✅ Company and Employee management (employer-centric)
- ✅ Basic salary processing with EPF/ETF
- ✅ Simple attendance via CSV upload (inOut array)
- ✅ Public holiday calendar
- ✅ User authentication (admin/employer roles only)
- ✅ PDF generation (payslips, EPF/ETF reports)

### What's Missing:
- ❌ Employee login and self-service portal
- ❌ Hierarchical organizational structure
- ❌ Employee leave management
- ❌ Real-time attendance tracking
- ❌ Biometric/QR/GPS attendance integration
- ❌ APIT and tax calculations
- ❌ Department management
- ❌ Manager-employee relationships
- ❌ Leave approval workflows

---

## Implementation Phases

### **Phase 1: Foundation - Database Schema & Core Models** (Week 1-2)

**Goal:** Establish the data structure for all new features

#### Tasks:

1. **Update User Model**
   - Add "employee" role to existing ["admin", "employer"]
   - Add optional employee reference field
   - Add isActive, lastLogin fields

2. **Create Department Model**
   ```typescript
   - name: string
   - company: ObjectId (ref: Company)
   - manager: ObjectId (ref: Employee)
   - parentDepartment: ObjectId (ref: Department) // for hierarchy
   - description: string
   - isActive: boolean
   ```

3. **Update Employee Model**
   - Add user: ObjectId (ref: User) // for employee login
   - Add department: ObjectId (ref: Department)
   - Add manager: ObjectId (ref: Employee)
   - Add employeeType: "permanent" | "contract" | "intern"
   - Add joinDate, probationEndDate
   - Add leaveBalance: { annual: number, casual: number, medical: number }
   - Add canLogin: boolean

4. **Create LeaveType Model**
   ```typescript
   - name: string (Annual, Casual, Medical, No-Pay)
   - company: ObjectId (ref: Company)
   - maxDaysPerYear: number
   - carryForward: boolean
   - requiresApproval: boolean
   - isPaid: boolean
   - description: string
   ```

5. **Create LeaveRequest Model**
   ```typescript
   - employee: ObjectId (ref: Employee)
   - leaveType: ObjectId (ref: LeaveType)
   - startDate: Date
   - endDate: Date
   - days: number
   - reason: string
   - status: "pending" | "approved" | "rejected" | "cancelled"
   - approvedBy: ObjectId (ref: Employee/User)
   - approvedAt: Date
   - rejectionReason: string
   - documents: string[] // file paths
   ```

6. **Create Attendance Model** (Replace inOut in Salary)
   ```typescript
   - employee: ObjectId (ref: Employee)
   - date: Date
   - checkIn: Date
   - checkOut: Date
   - checkInMethod: "manual" | "biometric" | "qr" | "gps"
   - checkOutMethod: "manual" | "biometric" | "qr" | "gps"
   - checkInLocation: { lat: number, lng: number, address: string }
   - checkOutLocation: { lat: number, lng: number, address: string }
   - biometricData: { deviceId: string, confidence: number }
   - qrCode: string
   - workingHours: number
   - otHours: number
   - status: "present" | "absent" | "late" | "half-day" | "on-leave"
   - isApproved: boolean
   - approvedBy: ObjectId
   - remarks: string
   ```

7. **Create AttendanceDevice Model**
   ```typescript
   - company: ObjectId (ref: Company)
   - deviceId: string (unique)
   - deviceType: "biometric" | "qr-scanner"
   - location: string
   - ipAddress: string
   - apiKey: string // for device authentication
   - isActive: boolean
   - lastSyncAt: Date
   ```

8. **Create TaxConfiguration Model**
   ```typescript
   - year: number
   - country: "LK" (Sri Lanka)
   - taxSlabs: [{
       min: number,
       max: number,
       rate: number,
       fixedAmount: number
     }]
   - personalAllowance: number
   - qualifyingPaymentRelief: number // for EPF contributions
   - stampDuty: { threshold: number, rate: number }
   - isActive: boolean
   ```

9. **Create EmployeeTax Model**
   ```typescript
   - employee: ObjectId (ref: Employee)
   - year: number
   - month: number
   - grossSalary: number
   - taxableIncome: number
   - apitAmount: number
   - stampDuty: number
   - totalTax: number
   - reliefs: { epf: number, donations: number, other: number }
   - cumulativeTax: number
   ```

**Deliverables:**
- All model files created in `src/app/models/`
- Database migration strategy documented
- TypeScript interfaces exported

---

### **Phase 2: Employee Hierarchy & Department Management** (Week 2-3)

**Goal:** Enable organizational structure with departments and manager relationships

#### Tasks:

1. **API Endpoints - Departments**
   - `POST /api/departments` - Create department
   - `GET /api/departments?companyId=xxx` - List all departments
   - `GET /api/departments/:id` - Get department details with employees
   - `PUT /api/departments/:id` - Update department
   - `DELETE /api/departments/:id` - Deactivate department
   - `GET /api/departments/:id/hierarchy` - Get org chart

2. **API Endpoints - Employee Hierarchy**
   - `PUT /api/employees/:id/assign-manager` - Assign manager
   - `PUT /api/employees/:id/assign-department` - Assign department
   - `GET /api/employees/:id/subordinates` - Get direct reports
   - `GET /api/employees/:id/team` - Get entire team (recursive)

3. **Frontend - Department Management (Employer)**
   - Department list page (`src/app/user/departments/page.tsx`)
   - Create/Edit department dialog
   - Organizational chart visualization
   - Assign employees to departments

4. **Frontend - Employee Updates**
   - Update employee form to include:
     - Department selection
     - Manager selection (filtered by department)
     - Employee type selection

**Deliverables:**
- Department CRUD APIs
- Organizational hierarchy visualization
- Updated employee management UI

---

### **Phase 3: Leave Management System** (Week 3-5)

**Goal:** Complete leave application, approval, and tracking system

#### Tasks:

1. **API Endpoints - Leave Types**
   - `POST /api/leave-types` - Create leave type (employer)
   - `GET /api/leave-types?companyId=xxx` - List leave types
   - `PUT /api/leave-types/:id` - Update leave type
   - `DELETE /api/leave-types/:id` - Delete leave type

2. **API Endpoints - Leave Requests**
   - `POST /api/leave-requests` - Apply for leave (employee)
   - `GET /api/leave-requests` - List leave requests (with filters)
   - `GET /api/leave-requests/:id` - Get leave request details
   - `PUT /api/leave-requests/:id/approve` - Approve leave (manager)
   - `PUT /api/leave-requests/:id/reject` - Reject leave (manager)
   - `PUT /api/leave-requests/:id/cancel` - Cancel leave (employee)
   - `GET /api/employees/:id/leave-balance` - Get leave balance

3. **Leave Balance Calculation Logic**
   - Annual allocation based on company policy
   - Carry forward logic (if enabled)
   - Deduction on approved leaves
   - Integration with attendance system

4. **Leave Approval Workflow**
   - Auto-assign to direct manager for approval
   - Email notifications (optional)
   - Multi-level approval support (future enhancement)

5. **Integration with Salary**
   - Update salary calculation to deduct no-pay leave days
   - Link leave requests to salary period
   - Auto-mark attendance as "on-leave" for approved dates

6. **Frontend - Employer Leave Management**
   - Leave types configuration page
   - Pending leave approvals dashboard
   - Leave calendar view (company-wide)
   - Leave reports and analytics

**Deliverables:**
- Complete leave management APIs
- Leave approval workflow
- Integration with salary and attendance
- Employer leave management UI

---

### **Phase 4: Employee Portal & Dashboard** (Week 5-7)

**Goal:** Enable employees to log in and access their information

#### Tasks:

1. **Authentication Updates**
   - Update NextAuth config to support employee role
   - Create employee account creation flow
   - Add "Create Login" action in employee management (employer)
   - Auto-generate secure passwords or send setup email

2. **Employee Dashboard API**
   - `GET /api/employee/dashboard` - Dashboard summary
   - `GET /api/employee/profile` - View profile
   - `PUT /api/employee/profile` - Update limited fields (photo, contact)
   - `GET /api/employee/payslips` - List payslips
   - `GET /api/employee/payslips/:id` - Download payslip PDF
   - `GET /api/employee/attendance` - View attendance history
   - `GET /api/employee/leave-balance` - View leave balances

3. **Employee Portal Pages** (`src/app/employee/`)
   - `/employee/dashboard` - Overview (salary, attendance, leaves)
   - `/employee/profile` - Personal information
   - `/employee/payslips` - Payslip history and downloads
   - `/employee/attendance` - Attendance records with calendar view
   - `/employee/leaves` - Apply leave and view history
   - `/employee/team` - View team members (if manager)

4. **Employee Dashboard Features**
   - Current month attendance summary
   - Upcoming leaves
   - Recent payslips
   - Leave balance cards
   - Quick actions (apply leave, view attendance)

5. **Security & Access Control**
   - Employees can only view their own data
   - Managers can view subordinates' data
   - Row-level security in API endpoints
   - Update middleware to protect `/employee/*` routes

6. **Change Password Feature**
   - Employee can change own password
   - Force password change on first login

**Deliverables:**
- Employee authentication system
- Complete employee portal
- Self-service features
- Secure access control

---

### **Phase 5: Advanced Attendance Tracking** (Week 7-10)

**Goal:** Implement real-time attendance with multiple tracking methods

#### Tasks:

1. **Attendance API Endpoints**
   - `POST /api/attendance/check-in` - Clock in
   - `POST /api/attendance/check-out` - Clock out
   - `GET /api/attendance/today` - Today's attendance status
   - `GET /api/attendance/history` - Attendance history with filters
   - `PUT /api/attendance/:id/approve` - Approve/edit attendance (manager)
   - `POST /api/attendance/bulk-upload` - CSV upload (existing functionality)
   - `GET /api/attendance/reports` - Generate reports

2. **Biometric Integration**
   - Device registration API
   - Device authentication via API keys
   - Webhook endpoint for biometric devices
   - `POST /api/attendance/biometric` - Receive biometric data
   - Support for common protocols (e.g., ZKTeco API)
   - Store fingerprint/face template hash (not raw data)

3. **QR Code Attendance**
   - Generate unique daily QR codes per company/location
   - `POST /api/attendance/qr-generate` - Generate QR code
   - `POST /api/attendance/qr-scan` - Validate and record attendance
   - QR code expiry (time-based, single-use)
   - Location-based validation (optional)

4. **GPS-Based Attendance**
   - Define geo-fence boundaries for company/sites
   - `POST /api/attendance/gps` - Check-in with location
   - Validate location against geo-fence
   - Store location coordinates and address
   - Support for remote workers (no geo-fence required)
   - Distance calculation from office location

5. **Attendance Rules Engine**
   - Late arrival detection
   - Early departure detection
   - Missing check-out handling
   - Auto check-out after shift end + buffer
   - Overtime calculation based on actual hours
   - Grace period configuration

6. **Attendance Approval Workflow**
   - Flag unusual attendance (late, early, location mismatch)
   - Manager approval for flagged records
   - Bulk approval interface
   - Attendance correction requests from employees

7. **Real-time Attendance Dashboard**
   - Live attendance status (who's in, who's out)
   - Attendance analytics (on-time %, late %, absent %)
   - Heatmap of attendance patterns
   - Export to Excel/PDF

8. **Mobile-Friendly Attendance**
   - Responsive check-in/out pages
   - GPS permission handling
   - Camera for QR scanning
   - PWA push notifications for missed check-out

9. **Integration with Salary**
   - Replace CSV-based inOut with Attendance model data
   - Auto-fetch attendance for salary period
   - Calculate working hours, OT, no-pay from Attendance records
   - Update `salaryProcessing.tsx` to query Attendance collection

**Deliverables:**
- Multi-method attendance tracking
- Biometric device integration
- QR code system
- GPS geo-fencing
- Real-time attendance monitoring
- Integration with salary processing

---

### **Phase 6: Tax Compliance (APIT & Sri Lankan Taxes)** (Week 10-12)

**Goal:** Implement APIT and other tax calculations as per Sri Lankan regulations

#### Tasks:

1. **Tax Configuration Setup**
   - Create default APIT tax slabs for Sri Lanka
   - Personal allowance configuration
   - Qualifying payment relief (EPF contributions)
   - Stamp duty configuration
   - Admin interface for tax configuration

2. **APIT Calculation Logic** (`src/app/lib/taxCalculations.tsx`)
   - Calculate monthly taxable income
   - Apply tax slabs progressively
   - Deduct reliefs (EPF employee contribution)
   - Handle personal allowance
   - Calculate stamp duty (if applicable)
   - Cumulative tax calculation (year-to-date)

3. **Tax Formulas (Sri Lanka 2025)**
   ```
   Taxable Income = Gross Salary - EPF 8% - Other Reliefs

   APIT Slabs (Example - verify with current rates):
   - 0 to 100,000: 0%
   - 100,001 to 141,667: 6%
   - 141,668 to 183,333: 12%
   - 183,334 to 225,000: 18%
   - Above 225,000: 24%

   Personal Allowance: LKR 1,200,000 per year (LKR 100,000 per month)
   Qualifying Payment Relief: EPF employee contribution (8%)
   Stamp Duty: LKR 25 if monthly salary > LKR 50,000
   ```

4. **Integration with Salary Processing**
   - Add tax calculation step in salary generation
   - Store tax details in EmployeeTax model
   - Add APIT and stamp duty to deductions
   - Update final salary calculation
   - Generate tax certificates (Form IT-1)

5. **Tax Deduction at Source (TDS)**
   - Calculate monthly APIT
   - Maintain year-to-date tax paid
   - Adjust for tax credits/refunds
   - Handle tax exemptions (if any)

6. **Tax Reports & Compliance**
   - Monthly tax summary report
   - Annual tax statement (per employee)
   - Form IT-1 generation (PDF)
   - Tax register (company-wide)
   - IR8A / IR21 form support (if needed)

7. **API Endpoints**
   - `GET /api/tax/configuration/:year` - Get tax config
   - `POST /api/tax/configuration` - Create/update tax config (admin)
   - `GET /api/tax/calculate` - Preview tax calculation
   - `GET /api/tax/employee/:id/:year` - Employee tax summary
   - `GET /api/tax/reports/:year/:month` - Tax reports

8. **Frontend - Tax Management**
   - Tax configuration page (admin)
   - Employee tax summary in salary view
   - Tax reports download
   - Year-end tax statements

9. **Testing & Validation**
   - Test with various salary ranges
   - Verify against official APIT calculators
   - Test edge cases (mid-year joiners, leavers)
   - Validate tax certificates

**Deliverables:**
- Complete APIT calculation engine
- Tax compliance reports
- Form IT-1 generation
- Tax configuration interface
- Integration with salary processing

---

## Phase Dependencies

```
Phase 1 (Foundation)
    ├─> Phase 2 (Hierarchy) - depends on Department model
    ├─> Phase 3 (Leave) - depends on Employee updates
    ├─> Phase 4 (Employee Portal) - depends on User model updates
    ├─> Phase 5 (Attendance) - depends on Attendance model
    └─> Phase 6 (Tax) - depends on TaxConfiguration model

Phase 2 can run parallel to Phase 3
Phase 4 depends on Phase 3 (leave features in portal)
Phase 5 should be after Phase 4 (employee check-in interface)
Phase 6 can start after Phase 1, parallel to others
```

---

## Technical Considerations

### Database Migrations
- Add new fields to existing models (User, Employee)
- Create indexes for performance:
  - Attendance: `{ employee: 1, date: 1 }` unique
  - LeaveRequest: `{ employee: 1, status: 1 }`
  - Department: `{ company: 1 }`

### Breaking Changes
- Attendance data structure change (inOut array → Attendance collection)
- Need migration script to convert existing salary.inOut to Attendance records
- Employee model adds required fields (handle null values)

### Performance Optimization
- Use aggregation pipelines for reports
- Implement pagination for attendance lists
- Cache leave balances
- Index frequently queried fields

### Security
- API key management for biometric devices
- Encrypt sensitive biometric data
- HTTPS required for GPS/QR attendance
- Rate limiting on attendance endpoints
- RBAC (Role-Based Access Control) enforcement

### Third-Party Integrations
- Biometric devices: ZKTeco, Suprema, Anviz
- SMS notifications (optional): Twilio, Dialog SMS
- Email notifications: SendGrid or AWS SES
- Map services: Google Maps API (for GPS)

### Testing Strategy
- Unit tests for tax calculations
- Integration tests for leave workflow
- E2E tests for employee portal
- Load testing for attendance check-in (concurrent users)

---

## Rollout Strategy

1. **Phase 1**: Deploy to staging, run migration scripts
2. **Phase 2-3**: Beta test with one company
3. **Phase 4**: Limited employee rollout (25-50 employees)
4. **Phase 5**: Phased biometric device integration (start with QR)
5. **Phase 6**: Tax compliance testing before year-end
6. **Full Rollout**: After all phases validated

---

## Success Metrics

- ✅ 100% of employees can log in and view payslips
- ✅ Leave approval time < 24 hours average
- ✅ Attendance accuracy > 95%
- ✅ Tax calculation accuracy 100% (validated against official calculators)
- ✅ System uptime > 99.5%
- ✅ Biometric device sync latency < 5 minutes

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data migration failure | High | Test on copy of production DB, backup before migration |
| Biometric device compatibility | Medium | Start with QR/GPS, add biometric as phase 2 |
| Tax regulation changes | High | Make tax config editable, version by year |
| Employee adoption (portal) | Medium | Provide training materials, simple UI |
| Performance issues (attendance) | High | Implement caching, pagination, load testing |

---

## Post-Implementation

### Maintenance
- Monthly review of tax slabs (update if regulations change)
- Quarterly biometric device sync health checks
- Regular database cleanup (old attendance records)

### Future Enhancements
- Multi-level leave approval
- Shift scheduling system
- Mobile apps (iOS/Android)
- AI-based attendance anomaly detection
- Payroll forecasting
- Performance management integration

---

## Questions for User

Before proceeding with implementation, please confirm:

1. **Priority**: Which phase is most critical? (Recommend: Phase 3 Leave → Phase 4 Portal → Phase 5 Attendance → Phase 6 Tax)
2. **Attendance Methods**: Which methods are needed immediately? (QR, GPS, Biometric, or all?)
3. **Biometric Hardware**: Do you have specific biometric devices? (Model/brand?)
4. **Tax Year**: Start tax implementation for which year? (2025 onwards?)
5. **Timeline**: Any hard deadlines? (e.g., tax compliance by year-end)
6. **Budget**: Any budget for third-party services? (SMS, maps API)
7. **User Base**: Expected number of employees using the system?

---

**Next Steps**: Please review this plan and provide feedback. I'll proceed with Phase 1 once approved.
