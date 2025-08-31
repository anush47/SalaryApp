import { Schema, model, models, Document } from "mongoose";

// Define an interface for the Salary document
interface ISalary extends Document {
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

// Check if the model already exists
const Salary = models.Salary || model<ISalary>("Salary", salarySchema);

export default Salary;
