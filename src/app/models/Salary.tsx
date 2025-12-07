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
