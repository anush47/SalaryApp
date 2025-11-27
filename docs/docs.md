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

*   **Customizable Leave Types:** Employers can define their own leave policies.
*   **Leave Application & Approval:** Employees can apply for leave through the portal, and their designated managers can approve or reject the requests.
*   **Automated Balance Tracking:** The system automatically calculates and updates leave balances upon approval or cancellation of leave requests.
*   **Salary Integration:** Approved no-pay leaves are automatically deducted during the salary generation process.

### 3.4. Salary Processing and Payroll

*   **Automated Salary Generation:** The system can generate salaries based on employee basic pay, attendance data, overtime, and other additions/deductions.
*   **Attendance Integration:** It processes in/out time data (from CSV uploads) to calculate working hours, overtime, and no-pay days.
*   **Tax Compliance (APIT):** Sri Lankan APIT (Advanced Personal Income Tax) is automatically calculated based on the configurable tax slabs stored in the `TaxConfiguration` model.
*   **PDF Generation:** The system can generate various PDF documents, including payslips, EPF/ETF reports, and official government forms like Form A.

### 3.5. Employee Portal

*   **Self-Service:** Employees with login access can view their own dashboard, payslips, and leave balances.
*   **Profile Management:** Employees can view their profile and change their password.
*   **Leave Application:** The portal provides an interface for employees to apply for leave and track the status of their requests.

## 4. Database Connection

The database connection is managed by `src/app/lib/db.tsx`. It uses a singleton pattern to create a cached Mongoose connection, preventing multiple connections in a serverless environment. It also includes a retry mechanism to handle transient database connection issues.
