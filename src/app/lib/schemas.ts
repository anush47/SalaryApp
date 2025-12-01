import { z } from "zod";

// Common validation schemas used across the application
export const objectIdSchema = z.string().length(24, "ID must be a valid ObjectId");
export const idSchema = z.string().min(1, "ID is required");
export const userIdSchema = z.string().min(1, "User ID is required");

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
    })
    .default({
      shifts: false,
      workingDays: false,
      probabilities: false,
      paymentStructure: false,
      calendar: false,
    }),
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
  company: z.string().min(1, "Company ID is required"),
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
    })
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
  phoneNumber: z
    .string()
    .regex(/^\d{10}$/, "Phone number must be a valid")
    .optional(),
  email: z.string().email("Email must be a valid email").optional(),
  address: z.string().optional(),
  calendar: z.enum(["default", "other"]).optional(),
  department: z.union([z.string(), z.null()]).optional(),
  manager: z.union([z.string(), z.null()]).optional(),
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
});

export const employeeIdSchema = z.string().min(1, "Employee ID is required");

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
});

export const companyUpdateSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  employerNo: z.string().min(1, "Employer number is required"),
  address: z.string().optional(),
  paymentMethod: z.string().optional(),
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
});

export const companyIdSchema = z.string().min(1, "Company ID is required");

// Leave-related schemas (common ones)
export const leaveRequestCreateSchema = z.object({
  employeeId: idSchema,
  leaveTypeId: idSchema,
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  halfDay: z.boolean().optional().default(false),
  reason: z.string().optional(),
  documents: z.array(z.string()).optional(),
});

export const leaveTypeCreateSchema = z.object({
  name: z.string().min(1, "Leave type name is required"),
  code: z.string().min(1, "Leave type code is required"),
  accrualPeriod: z.enum(["yearly", "monthly", "weekly", "quarterly", "half-yearly", "custom"]),
  maxDaysPerPeriod: z.number().min(0, "Max days must be a positive number"),
  customPeriodDays: z.number().optional(),
  accrualMethod: z.enum(["upfront", "monthly-accrual", "pro-rata"]),
  resetDay: z.number().optional(),
  carryForward: z.boolean().optional().default(false),
  maxCarryForwardDays: z.number().optional(),
  requiresApproval: z.boolean().optional().default(true),
  requiresDocument: z.boolean().optional().default(false),
  isPaid: z.boolean().optional().default(true),
  applicableFor: z.array(z.enum(["permanent", "contract", "intern", "temporary"])).optional(),
  gender: z.enum(["male", "female", "all"]).optional().default("all"),
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
  employee: z.string().min(1, "Employee ID is required"),
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
});

export const salaryUpdateSchema = salaryCreateSchema.extend({
  id: z.string().min(1, "Salary ID is required"),
});

export const salaryIdSchema = z.string().min(1, "Salary ID is required");
export const periodSchema = z.string();

export const salaryGenerateSchema = z.object({
  employees: z.array(z.string()).optional(),
  companyId: z.string().min(1, "Company ID is required"),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be in the format YYYY-MM"),
  inOut: z.any().optional(),
  update: z.boolean().optional(),
  existingSalaries: z.array(z.any()).optional(),
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