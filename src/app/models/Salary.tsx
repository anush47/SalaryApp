import { Schema, model, models, Document } from "mongoose";

// Define an interface for the Salary document
export interface ISalary extends Document {
  employee: Schema.Types.ObjectId;
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
    in: String;
    out: String;
    workingHours: number;
    otHours: number;
    ot: number;
    noPay: number;
    holiday: string;
    description: string;
    remark: string;
  }[];
  // Tax fields
  taxes: {
    apitAmount: number;
    stampDuty: number;
    totalTax: number;
    taxableIncome: number;
    grossSalary: number;
  };
  // Leave deductions
  leaveDeductions: {
    leaveRequestId: Schema.Types.ObjectId;
    leaveType: string;
    days: number;
    amount: number;
  }[];
  advanceAmount: number;
  finalSalary: number;
  remark: string;
  // Flexible Salary Period Support
  salaryPeriod: "daily" | "weekly" | "bi-weekly" | "monthly" | "custom";
  periodStartDate: Date;
  periodEndDate: Date;
  periodDays?: number;
  workDays?: number;
  ratePerDay?: number;
  rateDivisor?: number;
  // Payment Tracking
  totalPaid: number;
  outstandingBalance: number;
  activeAdvances: {
    advanceId: Schema.Types.ObjectId;
    deductedAmount: number;
  }[];
  paymentStatus: "unpaid" | "partially_paid" | "fully_paid" | "overpaid";
  calculationMethod: "attendance" | "fixed_days" | "no_ot";
  acknowledgmentStatus: "pending" | "acknowledged";
}

// Define the schema for the Salary model
const salarySchema = new Schema<ISalary>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    period: {
      type: String,
      required: true,
    },
    basic: {
      type: Number,
      required: true,
    },
    holidayPay: {
      type: Number,
    },
    noPay: {
      amount: {
        type: Number,
        required: true,
      },
      reason: {
        type: String,
      },
    },
    ot: {
      amount: {
        type: Number,
        required: true,
      },
      reason: {
        type: String,
      },
    },
    paymentStructure: {
      additions: [
        {
          name: {
            type: String,
            required: true,
          },
          amount: {
            type: Number,
            required: true,
          },
          affectTotalEarnings: {
            type: Boolean,
            default: false,
          },
        },
      ],
      deductions: [
        {
          name: {
            type: String,
            required: true,
          },
          amount: {
            type: Number,
            required: true,
          },
          affectTotalEarnings: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },
    inOut: [
      {
        in: {
          type: String,
        },
        out: {
          type: String,
        },
        workingHours: {
          type: Number,
        },
        otHours: {
          type: Number,
        },
        ot: {
          type: Number,
        },
        noPay: {
          type: Number,
        },
        holiday: {
          type: String,
        },
        description: {
          type: String,
        },
        remark: {
          type: String,
        },
        day_status: {
          type: String,
          enum: ["full", "half", "off"],
        },
      },
    ],
    // Tax fields
    taxes: {
      apitAmount: {
        type: Number,
        default: 0,
      },
      stampDuty: {
        type: Number,
        default: 0,
      },
      totalTax: {
        type: Number,
        default: 0,
      },
      taxableIncome: {
        type: Number,
        default: 0,
      },
      grossSalary: {
        type: Number,
        default: 0,
      },
    },
    // Leave deductions
    leaveDeductions: [
      {
        leaveRequestId: {
          type: Schema.Types.ObjectId,
          ref: "LeaveRequest",
        },
        leaveType: {
          type: String,
        },
        days: {
          type: Number,
        },
        amount: {
          type: Number,
        },
      },
    ],
    advanceAmount: {
      type: Number,
    },
    finalSalary: {
      type: Number,
      required: true,
    },
    remark: {
      type: String,
    },
    // Flexible Salary Period Support
    salaryPeriod: {
      type: String,
      enum: ["daily", "weekly", "bi-weekly", "monthly", "custom"],
      required: true,
    },
    periodStartDate: {
      type: Date,
      required: true,
    },
    periodEndDate: {
      type: Date,
      required: true,
    },
    periodDays: {
      type: Number,
    },
    workDays: {
      type: Number,
    },
    ratePerDay: {
      type: Number,
    },
    rateDivisor: {
      type: Number,
    },
    // Payment Tracking
    totalPaid: {
      type: Number,
      default: 0,
      required: true,
    },
    outstandingBalance: {
      type: Number,
      required: true,
    },
    activeAdvances: [
      {
        advanceId: {
          type: Schema.Types.ObjectId,
          ref: "SalaryAdvance",
          required: true,
        },
        deductedAmount: {
          type: Number,
          required: true,
        },
      },
    ],
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partially_paid", "fully_paid", "overpaid"],
      default: "unpaid",
      required: true,
    },
    calculationMethod: {
      type: String,
      enum: ["attendance", "fixed_days", "no_ot"],
      required: true,
    },
    acknowledgmentStatus: {
      type: String,
      enum: ["pending", "acknowledged"],
      default: "pending",
    },
  },
  {
    timestamps: true, // Optionally add timestamps for createdAt and updatedAt
  }
);

// Indexes for performance
salarySchema.index({ employee: 1, period: -1 });
salarySchema.index({ period: 1 });

// Check if the model already exists
const Salary = models.Salary || model<ISalary>("Salary", salarySchema);

export default Salary;
