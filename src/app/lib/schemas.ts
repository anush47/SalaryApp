import { z } from "zod";

// Common validation schemas used across the application
export const objectIdSchema = z.string().length(24, "ID must be a valid ObjectId");
export const idSchema = z.string().min(1, "ID is required");
export const userIdSchema = z.string().min(1, "User ID is required");

// Common Geofencing Schema
const geoFencingSchema = z.object({
  enabled: z.boolean(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radiusMeters: z.number().optional(),
  enforceValidation: z.boolean().optional(),
  allowedLocations: z
    .array(
      z.object({
        lat: z.number(),
        lng: z.number(),
        radius: z.number(),
        name: z.string(),
      })
    )
    .optional(),
});

// User-related schemas
export const userCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "user"]).default("user"),
  image: z.string().optional(),
});

export const userUpdateSchema = z.object({
  _id: objectIdSchema,
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["admin", "user"]).optional(),
  image: z.string().optional(),
});

// Payment-related schemas
export const paymentSaveSchema = z.object({
  _id: z.string().optional(),
  company: objectIdSchema,
  period: z.string(),
  epfReferenceNo: z.string().optional(),
  epfAmount: z.number().gt(0, { message: "EPF amount must be above 0" }),
  epfSurcharges: z.number().optional(),
  epfPaymentMethod: z.string().optional(),
  epfChequeNo: z.string().optional(),
  epfPayDay: z.string().optional(),
  etfAmount: z.number().gt(0, { message: "ETF amount must be above 0" }),
  etfSurcharges: z.number().optional(),
  etfPaymentMethod: z.string().optional(),
  etfChequeNo: z.string().optional(),
  etfPayDay: z.string().optional(),
  remark: z.string().optional(),
});

export const paymentUpdateSchema = paymentSaveSchema.extend({
  _id: objectIdSchema,
});

// Employee-related schemas
export const employeeCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  memberNo: z.number().min(1, "Member number is required"),
  nic: z
    .string()
    .regex(
      /^(?:[0-9]{9}[vVxX]|[0-9]{12})$/,
      "NIC must be a valid format (e.g., 123456789V or 123456789012)"
    ),
  basic: z.number().min(1, "Basic salary is required"),
  totalSalary: z.union([z.string(), z.number(), z.null()]),
  divideBy: z.union([z.literal(240), z.literal(200)]).default(240),
  designation: z.string().optional(),
  remark: z.string().optional(),
  otMethod: z.string(),
  startedAt: z.string().optional(),
  active: z.boolean().default(true),
  canLogin: z.boolean().optional().default(false),
  workingDays: z
    .object({
      mon: z.string().optional(),
      tue: z.string().optional(),
      wed: z.string().optional(),
      thu: z.string().optional(),
      fri: z.string().optional(),
      sat: z.string().optional(),
      sun: z.string().optional(),
      isDynamicHolidays: z.boolean().optional(),
    })
    .optional(),
  shifts: z
    .array(
      z.object({
        start: z.string().min(1, "Start time is required"),
        end: z.string().min(1, "End time is required"),
        break: z.number().optional().default(0),
      })
    )
    .optional(),
  probabilities: z
    .object({
      workOnOff: z.number().optional(),
      workOnHoliday: z.number().optional(),
      absent: z.number().optional(),
      late: z.number().optional(),
      ot: z.number().optional(),
    })
    .optional(),
  paymentStructure: z
    .object({
      additions: z.array(
        z.object({
          name: z.string(),
          amount: z.union([z.string(), z.number(), z.null()]),
          affectTotalEarnings: z.boolean().optional(),
        })
      ),
      deductions: z.array(
        z.object({
          name: z.string(),
          amount: z.union([z.string(), z.number(), z.null()]),
          affectTotalEarnings: z.boolean().optional(),
        })
      ),
    })
    .optional(),
  company: objectIdSchema,
  phoneNumber: z
    .string()
    .regex(/^\d{10}$/, "Phone number must be a valid 10 digits")
    .optional(),
  email: z.string().email("Email must be a valid email").optional(),
  address: z.string().optional(),
  department: z.union([z.string(), z.null()]).optional(),
  manager: z.union([z.string(), z.null()]).optional(),
  employeeType: z.enum(["permanent", "contract", "intern", "temporary"]).optional().default("permanent"),
  overrides: z
    .object({
      shifts: z.boolean(),
      workingDays: z.boolean(),
      probabilities: z.boolean(),
      paymentStructure: z.boolean(),
      calendar: z.boolean(),
      leaveTypes: z.boolean(),
      salaryPeriod: z.boolean().optional().default(false),
    })
    .default({
      shifts: false,
      workingDays: false,
      probabilities: false,
      paymentStructure: false,
      calendar: false,
      leaveTypes: false,
      salaryPeriod: false,
    }),
  salaryPeriod: z.enum(["daily", "weekly", "bi-weekly", "monthly", "custom"]).optional(),
  customPeriodDays: z.number().optional(),
  rateDivisor: z.number().optional(),
  payPeriodConfig: z.object({
    startDay: z.number().optional(),
    endDay: z.number().optional(),
    type: z.enum(["fixed_dates", "start_to_end_of_month", "end_to_end_of_month"]).optional(),
  }).optional(),
  calculationMethod: z.enum(["attendance", "fixed_days", "no_ot"]).optional(),
  leaveTypes: z.array(z.object({
    leaveType: z.string(),
    maxDaysPerPeriod: z.number().min(0).optional(),
    balance: z.number().min(0).optional(),
    carryForward: z.boolean().optional(),
    currentPeriodStart: z.string().optional(),
    lastAccrualDate: z.string().optional(),
    carriedForwardBalance: z.number().optional(),
  })).optional(),
  calendar: z.enum(["default", "other"]).optional().default("default"),
  // Personal information fields
  fullName: z.string().optional(),
  motherName: z.string().optional(),
  fatherName: z.string().optional(),
  isMarried: z.boolean().optional(),
  spouseName: z.string().optional(),
  nationality: z.string().optional(),
  emergencyContact: z.string().optional(),
  editable: z.boolean().optional().default(false),
  documents: z.record(z.string()).optional(),
  taxType: z.enum(["company", "individual"]).optional(),
  autoAcknowledge: z.boolean().optional().default(true),
});

export const employeeUpdateSchema = z.object({
  _id: idSchema,
  name: z.string().min(1, "Employee name is required"),
  memberNo: z.number().min(1, "Member number is required"),
  nic: z
    .string()
    .regex(
      /^(?:[0-9]{9}[vVxX]|[0-9]{12})$/,
      "NIC must be a valid format (e.g., 123456789V or 123456789012)"
    )
    .optional(),
  divideBy: z.union([z.literal(240), z.literal(200)]).default(240),
  active: z.boolean().default(true),
  canLogin: z.boolean().optional().default(false),
  basic: z.number().min(0, "Basic salary must be a positive number"),
  totalSalary: z.union([z.string(), z.number(), z.null()]),
  startedAt: z.string().optional(),
  resignedAt: z.string().optional(),
  company: z.union([z.string(), z.object({ _id: z.string() })]).transform((val) => {
    if (typeof val === "object") return val._id;
    return val;
  }),
  designation: z.string().optional(),
  remark: z.string().optional(),
  otMethod: z.string(),
  overrides: z
    .object({
      shifts: z.boolean().optional(),
      workingDays: z.boolean().optional(),
      probabilities: z.boolean().optional(),
      paymentStructure: z.boolean().optional(),
      calendar: z.boolean().optional(),
      leaveTypes: z.boolean().optional(),
      salaryPeriod: z.boolean().optional(),
      attendance: z.boolean().optional(),
    })
    .optional(),
  leaveTypes: z.array(z.object({
    leaveType: z.union([z.string(), z.object({ _id: z.string() })]).transform((val) => {
      if (typeof val === "object") return val._id;
      return val;
    }),
    maxDaysPerPeriod: z.number().min(0).optional(),
    balance: z.number().min(0).optional(),
    carryForward: z.boolean().optional(),
    currentPeriodStart: z.string().optional(),
    lastAccrualDate: z.string().optional(),
    carriedForwardBalance: z.number().optional(),
  })).optional(),
  probabilities: z
    .object({
      workOnOff: z.number().optional(),
      workOnHoliday: z.number().optional(),
      absent: z.number().optional(),
      late: z.number().optional(),
      ot: z.number().optional(),
    })
    .optional(),
  workingDays: z
    .object({
      mon: z.string(),
      tue: z.string(),
      wed: z.string(),
      thu: z.string(),
      fri: z.string(),
      sat: z.string(),
      sun: z.string(),
      isDynamicHolidays: z.boolean().optional(),
    })
    .optional(),
  shifts: z
    .array(
      z.object({
        start: z.string(),
        end: z.string(),
        break: z
          .number()
          .min(0, "Break time must be a positive number")
          .optional(),
      })
    )
    .optional(),
  shiftSettings: z.object({
    mode: z.enum(["fixed", "dynamic", "roster", "manual"]).optional(),
    shifts: z.array(z.object({
      _id: z.string().optional(),
      name: z.string(),
      type: z.enum(["fixed", "dynamic"]),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      breakDuration: z.number().optional().default(0),
      duration: z.number().optional(),
      minStartTime: z.string().optional(),
      maxStartTime: z.string().optional(),
      minEndTime: z.string().optional(),
      maxEndTime: z.string().optional(),
    })).optional(),
    defaultShiftId: z.string().optional(),
    autoSelect: z.boolean().optional(),
    useShiftStartForOT: z.boolean().optional(),
  }).optional(),
  paymentStructure: z
    .object({
      additions: z.array(
        z.object({
          name: z.string(),
          amount: z.union([z.string(), z.number(), z.null()]),
          affectTotalEarnings: z.boolean().optional(),
        })
      ),
      deductions: z.array(
        z.object({
          name: z.string(),
          amount: z.union([z.string(), z.number(), z.null()]),
          affectTotalEarnings: z.boolean().optional(),
        })
      ),
    })
    .optional(),
  salaryPeriod: z.enum(["daily", "weekly", "bi-weekly", "monthly", "custom"]).optional(),
  customPeriodDays: z.number().optional(),
  rateDivisor: z.number().optional(),
  payPeriodConfig: z.object({
    startDay: z.number().optional(),
    endDay: z.number().optional(),
    type: z.enum(["fixed_dates", "start_to_end_of_month", "end_to_end_of_month"]).optional(),
  }).optional(),
  calculationMethod: z.enum(["attendance", "fixed_days", "no_ot"]).optional(),
  phoneNumber: z
    .string()
    .regex(/^\d{10}$/, "Phone number must be a valid")
    .optional(),
  email: z.string().email("Email must be a valid email").optional(),
  address: z.string().optional(),
  calendar: z.enum(["default", "other"]).optional(),
  department: z.union([z.string(), z.null(), z.object({ _id: z.string() })]).optional().transform((val) => {
    if (typeof val === "object" && val !== null) return val._id;
    return val;
  }),
  manager: z.union([z.string(), z.null(), z.object({ _id: z.string() })]).optional().transform((val) => {
    if (typeof val === "object" && val !== null) return val._id;
    return val;
  }),
  employeeType: z.enum(["permanent", "contract", "intern", "temporary"]).optional(),
  // Personal information fields
  fullName: z.string().optional(),
  motherName: z.string().optional(),
  fatherName: z.string().optional(),
  isMarried: z.boolean().optional(),
  spouseName: z.string().optional(),
  nationality: z.string().optional(),
  emergencyContact: z.string().optional(),
  editable: z.boolean().optional(),
  documents: z.record(z.string()).optional(),
  taxType: z.enum(["company", "individual"]).optional(),
  autoAcknowledge: z.boolean().optional(),
  faceData: z.union([z.null(), z.undefined(), z.record(z.any())]).optional(),
  attendanceOverrides: z.object({
    enabled: z.boolean(),
    pwaCheckIn: z.boolean().optional(),
    hardwareIntegration: z.boolean().optional(),
    salaryIntegration: z.boolean().optional(),
    geoFencing: geoFencingSchema.optional(),
    allowRemoteCheckIn: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    approvalMode: z.enum(["automatic", "always", "out_of_zone"]).optional(),
    isRemote: z.boolean().optional(),
    livenessDetection: z.boolean().optional(),
  }).optional(),
});

export const employeeIdSchema = z.string().min(1, "Employee ID is required");


const attendanceConfigSchema = z.object({
  enabled: z.boolean(),
  pwaCheckIn: z.boolean().optional(),
  hardwareIntegration: z.boolean().optional(),
  salaryIntegration: z.boolean().optional(),
  allowRemoteCheckIn: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
  livenessDetection: z.boolean().optional(),
  geoFencing: geoFencingSchema.optional(),
  apiKey: z.string().optional(),
});

// Company-related schemas
export const companyCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  employerNo: z
    .string()
    .min(1, "Employer Number is required")
    .regex(/^[A-Z]\/\d{5}$/, "Employer Number must match the pattern A/12345"),
  address: z.string().optional(),
  startedAt: z.string().optional(),
  paymentMethod: z.string().optional(),
  timezone: z.string().optional().default("Asia/Colombo"),
  monthlyPrice: z.number(),
  monthlyPriceOverride: z.boolean(),
  requiredDocs: z.object({
    epf: z.boolean(),
    etf: z.boolean(),
    salary: z.boolean(),
    paySlip: z.boolean(),
  }),
  workingDays: z.object({
    mon: z.string().optional(),
    tue: z.string().optional(),
    wed: z.string().optional(),
    thu: z.string().optional(),
    fri: z.string().optional(),
    sat: z.string().optional(),
    sun: z.string().optional(),
  }),
  active: z.boolean().default(true),
  employerName: z.string().optional(),
  employerAddress: z.string().optional(),
  openHours: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
    allDay: z.boolean().optional(),
  }),
  shiftSettings: z.object({
    mode: z.enum(["fixed", "dynamic", "roster", "manual"]).default("fixed"),
    shifts: z.array(z.object({
      name: z.string(),
      type: z.enum(["fixed", "dynamic"]),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      breakDuration: z.number().optional().default(0),
      duration: z.number().optional(),
    })).optional(),
    defaultShiftId: z.string().optional(),
    autoSelect: z.boolean().optional(),
    useShiftStartForOT: z.boolean().optional(),
  }).optional(),
  attendanceConfig: attendanceConfigSchema.optional(),
  salaryPeriodDefaults: z.object({
    salaryPeriod: z.enum(["daily", "weekly", "bi-weekly", "monthly", "custom"]).default("monthly"),
    customPeriodDays: z.union([z.number(), z.string()]).transform((val) => Number(val)).optional(),
    rateDivisor: z.union([z.number(), z.string()]).transform((val) => Number(val)).default(30),
    payPeriodConfig: z.object({
      startDay: z.union([z.number(), z.string()]).transform((val) => Number(val)).optional(),
      endDay: z.union([z.number(), z.string()]).transform((val) => Number(val)).optional(),
      type: z.enum(["fixed_dates", "start_to_end_of_month", "end_to_end_of_month"]).optional(),
    }).optional(),
    calculationMethod: z.enum(["attendance", "fixed_days", "no_ot"]).default("attendance"),
  }).optional(),
});

export const companyUpdateSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  employerNo: z.string().min(1, "Employer number is required"),
  address: z.string().optional(),
  paymentMethod: z.string().optional(),
  timezone: z.string().optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  monthlyPrice: z.number().optional(),
  monthlyPriceOverride: z.boolean().optional(),
  active: z.boolean().optional(),
  employerName: z.string().optional(),
  employerAddress: z.string().optional(),
  requiredDocs: z.object({
    epf: z.boolean().optional(),
    etf: z.boolean().optional(),
    salary: z.boolean().optional(),
    paySlip: z.boolean().optional(),
  }),
  shifts: z
    .array(
      z.object({
        start: z.string().optional(),
        end: z.string().optional(),
        break: z
          .number()
          .min(0, "Break time must be a positive number")
          .optional(),
      })
    )
    .optional(),
  probabilities: z
    .object({
      workOnOff: z.number().optional(),
      workOnHoliday: z.number().optional(),
      absent: z.number().optional(),
      late: z.number().optional(),
      ot: z.number().optional(),
    })
    .optional(),
  mode: z.string().optional(),
  shiftSettings: z.object({
    defaultShiftId: z.string().optional(),
    autoSelect: z.boolean().optional(),
    useShiftStartForOT: z.boolean().optional(),
  }).optional(),
  workingDays: z
    .object({
      mon: z.string().optional(),
      tue: z.string().optional(),
      wed: z.string().optional(),
      thu: z.string().optional(),
      fri: z.string().optional(),
      sat: z.string().optional(),
      sun: z.string().optional(),
    })
    .optional(),
  openHours: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
      allDay: z.boolean().optional(),
    })
    .optional(),
  attendanceConfig: attendanceConfigSchema.optional(),
  salaryPeriodDefaults: z.object({
    salaryPeriod: z.enum(["daily", "weekly", "bi-weekly", "monthly", "custom"]).optional(),
    customPeriodDays: z.union([z.number(), z.string()]).transform((val) => Number(val)).optional(),
    rateDivisor: z.union([z.number(), z.string()]).transform((val) => Number(val)).optional(),
    payPeriodConfig: z.object({
      startDay: z.union([z.number(), z.string()]).transform((val) => Number(val)).optional(),
      endDay: z.union([z.number(), z.string()]).transform((val) => Number(val)).optional(),
      type: z.enum(["fixed_dates", "start_to_end_of_month", "end_to_end_of_month"]).optional(),
    }).optional(),
    calculationMethod: z.enum(["attendance", "fixed_days", "no_ot"]).optional(),
  }).optional(),
});

export const companyIdSchema = z.string().min(1, "Company ID is required");

// Leave-related schemas (common ones)
// Leave-related schemas
export const leaveRequestCreateSchema = z.object({
  employeeId: idSchema,
  leaveTypeId: idSchema,
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  halfDay: z.boolean().optional().default(false),
  halfDayPeriod: z.enum(["first_half", "final_half"]).optional(),
  totalMinutes: z.number().optional(),
  reason: z.string().optional(),
  documents: z.array(z.string()).optional(),
});

export const leaveRequestUpdateSchema = z.object({
  leaveRequestId: idSchema,
  action: z.enum(["approve", "reject", "cancel"]),
  remarks: z.string().optional(),
  documents: z.array(z.string()).optional(),
});

export const leaveTypeCreateSchema = z.object({
  name: z.string().min(1, "Leave type name is required"),
  code: z.string().min(1, "Leave type code is required"),
  companyId: idSchema,
  accrualPeriod: z.enum(["yearly", "monthly", "weekly", "quarterly", "half-yearly", "custom"]),
  maxDaysPerPeriod: z.number().min(0, "Max days must be a positive number"),
  customPeriodDays: z.number().optional(),
  accrualMethod: z.enum(["upfront", "monthly-accrual", "pro-rata"]),
  resetDay: z.number().optional(),
  maxConsecutiveDays: z.number().optional(),
  carryForward: z.boolean().optional().default(false),
  maxCarryForwardDays: z.number().optional(),
  requiresApproval: z.boolean().optional().default(true),
  requiresDocument: z.boolean().optional().default(false),
  isPaid: z.boolean().optional().default(true),
  applicableFor: z.array(z.enum(["permanent", "contract", "intern", "temporary"])).optional(),
  gender: z.enum(["male", "female", "all"]).optional().default("all"),
  color: z.string().optional(),
  description: z.string().optional(),
  isShortLeave: z.boolean().optional().default(false),
  maxDurationMinutes: z.number().optional(),
  allowPastDays: z.boolean().optional().default(true),
});

export const leaveTypeUpdateSchema = z.object({
  leaveTypeId: idSchema,
  name: z.string().min(1, "Leave type name is required").optional(),
  accrualPeriod: z.enum(["yearly", "monthly", "weekly", "quarterly", "half-yearly", "custom"]).optional(),
  maxDaysPerPeriod: z.number().min(0, "Max days must be a positive number").optional(),
  customPeriodDays: z.number().optional(),
  accrualMethod: z.enum(["upfront", "monthly-accrual", "pro-rata"]).optional(),
  resetDay: z.number().optional(),
  maxConsecutiveDays: z.number().optional(),
  carryForward: z.boolean().optional(),
  maxCarryForwardDays: z.number().optional(),
  requiresApproval: z.boolean().optional(),
  requiresDocument: z.boolean().optional(),
  isPaid: z.boolean().optional(),
  applicableFor: z.array(z.enum(["permanent", "contract", "intern", "temporary"])).optional(),
  gender: z.enum(["male", "female", "all"]).optional(),
  color: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  isShortLeave: z.boolean().optional(),
  maxDurationMinutes: z.number().optional(),
  allowPastDays: z.boolean().optional(),
  maxRequestsPerMonth: z.number().optional(),
});

// Salary-related schemas
export const noPaySchema = z.object({
  amount: z.number().min(0, "No Pay amount must be a positive number"),
  reason: z.string().optional(),
});

export const otSchema = z.object({
  amount: z.number().min(0, "Overtime amount must be a positive number"),
  reason: z.string().optional(),
});

export const salaryPaymentStructureSchema = z.object({
  additions: z.array(
    z.object({
      name: z.string().min(1, "Addition name is required"),
      amount: z.number().min(0, "Addition amount must be a positive number"),
      affectTotalEarnings: z.boolean().optional(),
    })
  ),
  deductions: z.array(
    z.object({
      name: z.string().min(1, "Deduction name is required"),
      amount: z.number().min(0, "Deduction amount must be a positive number"),
      affectTotalEarnings: z.boolean().optional(),
    })
  ),
});

export const salaryCreateSchema = z.object({
  id: z.string().optional(),
  employee: z.union([z.string(), z.any()]),
  period: z.string().min(1, "Period is required"),
  basic: z.number().min(1, "Basic salary is required"),
  holidayPay: z.number().optional(),
  noPay: noPaySchema,
  ot: otSchema,
  paymentStructure: salaryPaymentStructureSchema,
  inOut: z
    .array(
      z.object({
        in: z.string().datetime().optional(),
        out: z.string().datetime().optional(),
        workingHours: z
          .number()
          .min(0, "Working hours must be a positive number")
          .optional(),
        otHours: z
          .number()
          .min(0, "OT hours must be a positive number")
          .optional(),
        ot: z.number().min(0, "OT amount must be a positive number").optional(),
        noPay: z
          .number()
          .min(0, "No Pay amount must be a positive number")
          .optional(),
        holiday: z.string().optional(),
        description: z.string().optional(),
        remark: z.string().optional(),
        day_status: z.string().optional(),
      })
    )
    .optional(),
  advanceAmount: z.number().optional(),
  finalSalary: z.number().min(0, "Final salary must be a positive number"),
  remark: z.string().optional(),

  // Flexible Period Fields
  salaryPeriod: z.enum(["daily", "weekly", "bi-weekly", "monthly", "custom"]).optional(),
  periodStartDate: z.union([z.string(), z.date()]).optional(),
  periodEndDate: z.union([z.string(), z.date()]).optional(),
  periodDays: z.number().optional(),
  workDays: z.number().optional(),
  ratePerDay: z.number().optional(),
  rateDivisor: z.number().optional(),
  calculationMethod: z.enum(["attendance", "fixed_days", "no_ot"]).optional(),

  // Payment Tracking Fields
  totalPaid: z.number().optional().default(0),
  outstandingBalance: z.number().optional(),
  paymentStatus: z.enum(["unpaid", "partially_paid", "fully_paid", "overpaid"]).optional().default("unpaid"),

  activeAdvances: z.array(z.object({
    advanceId: z.string().optional(),
    deductedAmount: z.number().optional()
  })).optional(),

  leaveDeductions: z.array(z.any()).optional(),

  // New attendance-linked structure
  dailyRecords: z.array(z.object({
    date: z.union([z.string(), z.date()]).optional(),
    attendanceRecords: z.array(z.union([z.string(), z.any()])).optional(), // Array of Attendance ObjectIds or Objects
    shift: z.union([z.string(), z.any()]).optional(), // Shift ObjectId or Enriched Object
    shiftName: z.string().optional(),
    shiftStartTime: z.string().optional(),
    shiftEndTime: z.string().optional(),
    appliedLeaves: z.array(z.union([z.string(), z.any()])).optional(), // Array of LeaveRequest ObjectIds or Objects
    workingHours: z.number().min(0).optional().default(0),
    breakHours: z.number().min(0).optional().default(0),
    normalOT: z.number().min(0).optional().default(0),
    doubleOT: z.number().min(0).optional().default(0),
    tripleOT: z.number().min(0).optional().default(0),
    noPay: z.number().min(0).optional().default(0),
    noPayReason: z.string().optional().default(""),
    holiday: z.string().optional().default(""),
    isMercantileHoliday: z.boolean().optional().default(false),
    isPublicHoliday: z.boolean().optional().default(false),
    day_status: z.enum(["full", "half", "off"]).optional().default("full"),
    remark: z.string().optional().default(""),
  })).optional(),
  usesNewStructure: z.boolean().optional().default(false),
});

export const salaryUpdateSchema = salaryCreateSchema.extend({
  id: z.string().min(1, "Salary ID is required"),
});

export const salaryIdSchema = z.string().min(1, "Salary ID is required");
export const periodSchema = z.string();

export const salaryGenerateSchema = z.object({
  employees: z.array(z.string()).optional(),
  companyId: z.string().min(1, "Company ID is required"),
  period: z.string().min(1, "Period is required"), // Validation is handled by service layer to support multiple formats
  inOut: z.any().optional(),
  update: z.boolean().optional(),
  useLiveAttendance: z.boolean().optional(),
  existingSalaries: z.array(z.any()).optional(),
  save: z.boolean().optional(),
});

// Purchase-related schemas
export const purchaseSchema = z.object({
  periods: z
    .array(z.string().min(1, "Period is required"))
    .min(1, "At least one period is required"),
  company: z
    .string()
    .min(1, "Company ID is required")
    .refine((id) => /^[0-9a-fA-F]{24}$/.test(id), "Invalid company ID"),
  price: z.number().min(0, "Price must be a positive number"),
  totalPrice: z.number().min(0, "Total price must be a positive number"),
  request: z.union([z.string().optional(), z.null()]),
  requestDay: z.string().min(1, "Request day is required"),
  remark: z.string().optional(),
  approvedStatus: z.enum(["approved", "pending", "rejected"]).optional(),
  attachmentKey: z.string().optional(),
});

export const purchaseUpdateSchema = z.object({
  _id: z.string().min(1, "Purchase ID is required"),
  approvedStatus: z.enum(["approved", "pending", "rejected"]).optional(),
  request: z.union([z.string().optional(), z.null()]),
  remark: z.string().optional(),
  totalPrice: z
    .number()
    .min(0, "Total price must be a positive number")
    .optional(),
  attachmentKey: z.string().nullable().optional(),
});

export type PaymentCalculationResult = {
  epfAmount: number;
  etfAmount: number;
};

export const employerNoSchema = z
  .string()
  .min(1, "Employer Number is required")
  .regex(
    /^[A-Z]\/*\d{4,5}$/i,
    "Employer Number must match the pattern A/12345 or a/12345"
  );

export const periodFormatSchema = z
  .string()
  .min(1, "Period is required")
  .regex(/^\d{4}-\d{2}$/i, "Period must match the pattern YYYY-MM");

// PDF-related schemas
export const pdfTypeSchema = z.union([
  z.literal("etf"),
  z.literal("salary"),
  z.literal("epf"),
  z.literal("payslip"),
  z.literal("all"),
  z.literal("print"),
  z.literal("attendance"),
]);

export const pdfGenerationSchema = z.object({
  companyId: objectIdSchema,
  period: periodFormatSchema,
  salaryIds: z.array(z.string()).optional(),
  pdfType: pdfTypeSchema,
});

// Department-related schemas
export const departmentCreateSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  company: objectIdSchema,
  manager: z.union([objectIdSchema, z.string().length(0), z.null()]).optional(),
  parentDepartment: z.union([objectIdSchema, z.string().length(0), z.null()]).optional(),
  description: z.string().optional(),
  costCenter: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const departmentUpdateSchema = z.object({
  id: objectIdSchema,
  name: z.string().min(1, "Department name is required").optional(),
  manager: z.union([objectIdSchema, z.string().length(0), z.null()]).optional(),
  parentDepartment: z.union([objectIdSchema, z.string().length(0), z.null()]).optional(),
  description: z.string().optional(),
  costCenter: z.string().optional(),
  isActive: z.boolean().optional(),
});