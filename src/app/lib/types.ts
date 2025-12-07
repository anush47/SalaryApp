// Common types and interfaces used across the application

// User-related types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employer' | 'employee';
  isActive: boolean;
  employee?: string;
  canLogin?: boolean;
  lastLogin?: Date;
  [key: string]: any;
}

// Company-related types
export interface Company {
  _id: string;
  id: string; // For DataGrid compatibility
  name: string;
  employerNo: string;
  address?: string;
  mode?: string;
  active: boolean;
  requiredDocs?: {
    epf: boolean;
    etf: boolean;
    salary: boolean;
    paySlip: boolean;
  };
  paymentMethod?: string;
  monthlyPrice: string | number;
  monthlyPriceOverride: boolean;
  employerName?: string;
  employerAddress?: string;
  startedAt?: Date | string;
  endedAt?: Date | string;
  user?: any; // User reference
  workingDays: {
    mon: "full" | "half" | "off";
    tue: "full" | "half" | "off";
    wed: "full" | "half" | "off";
    thu: "full" | "half" | "off";
    fri: "full" | "half" | "off";
    sat: "full" | "half" | "off";
    sun: "full" | "half" | "off";
    isDynamicHolidays: boolean;
  };
  probabilities: {
    workOnHoliday: number;
    workOnOff: number;
    absent: number;
    late: number;
    ot: number;
  };
  openHours: {
    start: string;
    end: string;
    allDay: boolean;
  };
  paymentStructure: {
    additions: {
      name: string;
      amount: string;
      affectTotalEarnings: boolean;
    }[];
    deductions: {
      name: string;
      amount: string;
      affectTotalEarnings: boolean;
    }[];
  };
  calendar: "default" | "other";
  [key: string]: any;
}

// Employee-related types
export interface Employee {
  _id: string;
  id: string; // For DataGrid compatibility
  name: string;
  memberNo: number;
  nic: string;
  basic: number;
  divideBy: 240 | 200;
  designation?: string;
  otMethod: string;
  startedAt?: string;
  resignedAt?: string;
  active: boolean;
  canLogin: boolean;
  user?: any; // User reference
  email?: string;

  totalSalary: string;
  workingDays: {
    [key: string]: "full" | "half" | "off";
  };
  remark: string;
  shifts: {
    start: string;
    end: string;
    break: number;
  }[];
  paymentStructure: {
    additions: {
      name: string;
      amount: string;
      affectTotalEarnings: boolean;
    }[];
    deductions: {
      name: string;
      amount: string;
      affectTotalEarnings: boolean;
    }[];
  };

  company: string | Company; // Can be ID or populated object
  phoneNumber?: string;

  address?: string;
  department?: any; // Department reference
  manager?: any; // Manager reference
  employeeType: "permanent" | "contract" | "intern" | "temporary";
  // Personal details
  fullName?: string;
  motherName?: string;
  fatherName?: string;
  isMarried?: boolean;
  spouseName?: string;
  nationality?: string;
  emergencyContact?: string;
  editable?: boolean;
  documents?: Record<string, string>;
  [key: string]: any;
}

// Leave-related types
export interface LeaveType {
  _id: string;
  id: string;
  name: string;
  code: string;
  accrualPeriod: "yearly" | "monthly" | "weekly" | "quarterly" | "half-yearly" | "custom";
  maxDaysPerPeriod: number;
  customPeriodDays?: number;
  accrualMethod: "upfront" | "monthly-accrual" | "pro-rata";
  resetDay?: number;
  carryForward: boolean;
  maxCarryForwardDays?: number;
  requiresApproval: boolean;
  requiresDocument: boolean;
  isPaid: boolean;
  applicableFor: ("permanent" | "contract" | "intern" | "temporary")[];
  gender: "male" | "female" | "all";
  isActive: boolean;
  [key: string]: any;
}

export interface LeaveRequest {
  _id: string;
  id: string;
  employee: string | Employee;
  company: string;
  leaveType: string | LeaveType;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  halfDay: boolean;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approver?: string;
  approvedBy?: string;
  approvedAt?: Date;
  remarks?: string;
  documents: string[];
  [key: string]: any;
}

// Pagination types
export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// API Response types
export interface ApiResponse<T = any> {
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

// Common enums
export enum UserRole {
  ADMIN = 'admin',
  EMPLOYER = 'employer',
  EMPLOYEE = 'employee'
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export enum AccrualPeriod {
  YEARLY = 'yearly',
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
  QUARTERLY = 'quarterly',
  HALF_YEARLY = 'half-yearly',
  CUSTOM = 'custom'
}

export enum AccrualMethod {
  UPFRONT = 'upfront',
  MONTHLY_ACCRUAL = 'monthly-accrual',
  PRO_RATA = 'pro-rata'
}

// Salary-related types
export interface Salary {
  _id: string;
  id: string;
  employee: string | Employee;
  period: string;
  basic: number;
  holidayPay: number;
  noPay: {
    amount: number;
    reason: string;
  };
  ot: {
    amount: number;
    reason: string;
  };
  paymentStructure: {
    additions: {
      name: string;
      amount: number;
      affectTotalEarnings: boolean;
    }[];
    deductions: {
      name: string;
      amount: number;
      affectTotalEarnings: boolean;
    }[];
  };
  inOut: {
    in: string;
    out: string;
    workingHours: number;
    otHours: number;
    ot: number;
    noPay: number;
    holiday: string;
    description: string;
    remark: string;
    day_status: "full" | "half" | "off";
  }[];
  taxes: {
    apitAmount: number;
    stampDuty: number;
    totalTax: number;
    taxableIncome: number;
    grossSalary: number;
  };
  leaveDeductions: {
    leaveRequestId: string;
    leaveType: string;
    days: number;
    amount: number;
  }[];
  advanceAmount: number;
  finalSalary: number;
  remark: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}