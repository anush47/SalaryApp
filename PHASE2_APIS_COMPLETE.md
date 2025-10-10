# Phase 2 Backend APIs - COMPLETED ✅

**Date Completed:** 2025-10-10
**Duration:** ~1 hour
**Status:** All department & employee hierarchy APIs implemented

---

## Summary

Phase 2 backend implementation is complete! All API endpoints for department management and employee hierarchy have been created and are ready to use.

---

## APIs Created

### 1. Department Management APIs

#### **GET /api/departments?companyId=xxx**
Get all departments for a company
- **Auth Required:** Yes (employer, admin)
- **Response:** List of departments with manager and parent dept populated
- **Features:**
  - Sorted by name
  - Includes manager info
  - Shows parent department

#### **POST /api/departments**
Create a new department
- **Auth Required:** Yes (employer, admin only)
- **Body:**
  ```json
  {
    "name": "Engineering",
    "companyId": "xxx",
    "managerId": "xxx",  // optional
    "parentDepartmentId": "xxx",  // optional
    "description": "Engineering team",  // optional
    "costCenter": "ENG-001"  // optional
  }
  ```
- **Validations:**
  - Unique department name per company
  - Manager must exist in same company
  - Parent department must exist
- **Returns:** Created department with populated fields

#### **PUT /api/departments**
Update an existing department
- **Auth Required:** Yes (employer, admin only)
- **Body:**
  ```json
  {
    "departmentId": "xxx",
    "name": "Engineering & Technology",  // optional
    "managerId": "xxx",  // optional
    "parentDepartmentId": "xxx",  // optional
    "description": "Updated description",  // optional
    "costCenter": "ENG-002",  // optional
    "isActive": true  // optional
  }
  ```
- **Validations:**
  - Cannot create circular hierarchy (dept cannot be its own parent)
  - Checks parent's parent chain to prevent loops
  - Name uniqueness check
- **Returns:** Updated department

#### **DELETE /api/departments?departmentId=xxx**
Delete a department
- **Auth Required:** Yes (employer, admin only)
- **Validations:**
  - Cannot delete department with employees (must reassign first)
  - Cannot delete department with sub-departments (must remove first)
- **Returns:** Success message

---

### 2. Department Hierarchy APIs

#### **GET /api/departments/[id]**
Get department details with employees
- **Auth Required:** Yes (all roles, read-only for employees)
- **Response:**
  ```json
  {
    "department": { /* dept with manager, parentDept populated */ },
    "employees": [ /* employees in this dept */ ],
    "subDepartments": [ /* child departments */ ],
    "totalEmployees": 42  // including sub-departments
  }
  ```

#### **GET /api/departments/hierarchy?companyId=xxx**
Get complete organizational hierarchy tree
- **Auth Required:** Yes (all roles)
- **Response:** Hierarchical tree structure
  ```json
  {
    "hierarchy": [
      {
        "_id": "dept1",
        "name": "Engineering",
        "manager": { /* manager details */ },
        "employees": [ /* employees in this dept */ ],
        "employeeCount": 10,
        "totalEmployeeCount": 25,  // including sub-depts
        "children": [
          {
            "_id": "dept2",
            "name": "Frontend Team",
            "manager": { /* manager details */ },
            "employees": [ /* employees */ ],
            "children": []
          }
        ]
      }
    ]
  }
  ```
- **Features:**
  - Recursive sub-department structure
  - Employee count per department
  - Total employee count (including sub-departments)
  - Ready for org chart visualization

---

### 3. Employee Hierarchy APIs

#### **POST /api/employees/hierarchy**
Manage employee hierarchy (assign manager/department)
- **Auth Required:** Yes (employer, admin only)
- **Body:**
  ```json
  {
    "action": "assign-manager",  // or "remove-manager", "assign-department", "remove-department"
    "employeeId": "xxx",
    "managerId": "xxx",  // required for assign-manager
    "departmentId": "xxx"  // required for assign-department
  }
  ```

**Actions:**
1. **assign-manager**
   - Validates manager exists in same company
   - Prevents circular references (manager cannot be subordinate)
   - Returns updated employee with manager populated

2. **remove-manager**
   - Sets manager to null
   - Returns updated employee

3. **assign-department**
   - Validates department exists in same company
   - Returns updated employee with department populated

4. **remove-department**
   - Sets department to null
   - Returns updated employee

#### **GET /api/employees/hierarchy?action=xxx&employeeId=xxx**
Get hierarchy-related data
- **Auth Required:** Yes (all roles)

**Actions:**

1. **action=subordinates&employeeId=xxx**
   - Get direct reports for a manager
   - Returns list of employees who report to this manager

2. **action=team&employeeId=xxx**
   - Get entire team (all subordinates recursively)
   - Returns all employees in the management chain below this manager
   - Includes count

3. **action=available-managers&companyId=xxx&employeeId=xxx**
   - Get list of employees who can be assigned as managers
   - Excludes the employee themselves
   - Excludes employee's subordinates (prevents circular references)
   - Used for manager dropdown in UI

---

## Helper Functions Created

**File:** `src/app/lib/employeeHierarchy.tsx`

### **getSubordinates(managerId)**
Returns direct reports for a manager

### **getEntireTeam(managerId)**
Returns all subordinates recursively (entire team)

### **getManagerChain(employeeId)**
Returns all managers up to the top of the hierarchy

### **isInManagementChain(managerId, employeeId)**
Checks if manager A can approve items for employee B

### **validateManagerAssignment(employeeId, newManagerId)**
Validates manager assignment to prevent:
- Self-assignment
- Circular references
Returns: `{ valid: boolean, error?: string }`

### **getDepartmentWithCounts(departmentId)**
Gets department with employee counts (direct and total including sub-depts)

### **getAvailableManagers(companyId, employeeId?)**
Gets list of employees who can be assigned as managers
Excludes subordinates to prevent circular references

---

## Validation & Business Rules

### Department Validation:
✅ Department names must be unique per company
✅ Parent department must exist in same company
✅ Prevents circular hierarchy (dept cannot be its own ancestor)
✅ Cannot delete department with employees
✅ Cannot delete department with sub-departments

### Manager Assignment Validation:
✅ Manager must exist in same company
✅ Employee cannot be their own manager
✅ Cannot assign a subordinate as manager (prevents circular references)
✅ Validates entire subordinate chain before allowing assignment

### Access Control:
✅ Only employer/admin can create/modify departments
✅ Only employer/admin can assign managers/departments
✅ Employees can view (read-only) department and hierarchy data
✅ Admin can access all companies
✅ Employers can only access their own companies

---

## Example API Usage

### Create a Department
```typescript
POST /api/departments
{
  "name": "Engineering",
  "companyId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "managerId": "64f1a2b3c4d5e6f7g8h9i0j2",
  "description": "Engineering and Development team"
}
```

### Assign Employee to Department
```typescript
POST /api/employees/hierarchy
{
  "action": "assign-department",
  "employeeId": "64f1a2b3c4d5e6f7g8h9i0j3",
  "departmentId": "64f1a2b3c4d5e6f7g8h9i0j4"
}
```

### Assign Manager
```typescript
POST /api/employees/hierarchy
{
  "action": "assign-manager",
  "employeeId": "64f1a2b3c4d5e6f7g8h9i0j3",
  "managerId": "64f1a2b3c4d5e6f7g8h9i0j2"
}
```

### Get Org Chart
```typescript
GET /api/departments/hierarchy?companyId=64f1a2b3c4d5e6f7g8h9i0j1
```

### Get Employee's Team
```typescript
GET /api/employees/hierarchy?action=team&employeeId=64f1a2b3c4d5e6f7g8h9i0j2
```

---

## Files Created

### New Files:
- `src/app/api/departments/route.tsx` - Department CRUD
- `src/app/api/departments/[id]/route.tsx` - Department details
- `src/app/api/departments/hierarchy/route.tsx` - Org chart data
- `src/app/api/employees/hierarchy/route.tsx` - Employee hierarchy management
- `src/app/lib/employeeHierarchy.tsx` - Helper functions

---

## Next Steps - Phase 2 UI (Optional)

If you want to build the UI for department management:
1. Department list page (`/user/departments/page.tsx`)
2. Create/edit department dialog
3. Organizational chart visualization component
4. Update employee form to include department/manager dropdowns

**OR** proceed to **Phase 3: Leave Management APIs** (recommended to complete backend first)

---

## Testing Endpoints

### Test Department Creation:
```bash
curl -X POST http://localhost:3000/api/departments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering",
    "companyId": "YOUR_COMPANY_ID"
  }'
```

### Test Hierarchy:
```bash
curl http://localhost:3000/api/departments/hierarchy?companyId=YOUR_COMPANY_ID
```

---

**Phase 2 Backend: ✅ COMPLETE**
**Ready for Phase 3 (Leave Management APIs) or Phase 2 UI implementation!**
