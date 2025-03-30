import { Schema, model, models, Document } from "mongoose";

// Define an interface for the Employee document
interface IEmployee extends Document {
  memberNo: number;
  name: string;
  nic: string;
  basic: number;
  totalSalary: string;
  company: Schema.Types.ObjectId;
  designation: string;
  startedAt: string;
  resignedAt: string;
  remark: string;
  phoneNumber: string;
  email: string;
  address: string; // Add this line
  divideBy: 240 | 200;
  active: boolean;
  otMethod: "random" | "noOt" | "calc";
  overrides: {
    shifts: boolean;
    workingDays: boolean;
    probabilities: boolean;
    paymentStructure: boolean;
  };
  workingDays: {
    [key: string]: "full" | "half" | "off";
  };
  shifts: {
    start: string;
    end: string;
    break: number;
  }[];
  probabilities: {
    workOnOff: number;
    workOnHoliday: number;
    absent: number;
    late: number;
    ot: number;
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
}

// Define the schema for the Employee model
const employeeSchema = new Schema<IEmployee>(
  {
    memberNo: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    nic: {
      type: String,
      required: true,
    },
    basic: {
      type: Number,
      required: true,
    },
    totalSalary: {
      type: String,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    designation: {
      type: String,
    },
    remark: {
      type: String,
    },
    overrides: {
      type: {
        shifts: {
          type: Boolean,
          default: false,
        },
        workingDays: {
          type: Boolean,
          default: false,
        },
        probabilities: {
          type: Boolean,
          default: false,
        },
        paymentStructure: {
          type: Boolean,
          default: false,
        },
      },
    },
    shifts: {
      type: [
        {
          start: {
            type: String,
            required: true,
          },
          end: {
            type: String,
            required: true,
          },
          break: {
            type: Number,
            required: true,
          },
        },
      ],
    },
    startedAt: {
      type: String,
    },
    resignedAt: {
      type: String,
    },
    workingDays: {
      type: {
        mon: {
          type: String,
          enum: ["full", "half", "off"],
          default: "full",
          required: true,
        },
        tue: {
          type: String,
          enum: ["full", "half", "off"],
          default: "full",
          required: true,
        },
        wed: {
          type: String,
          enum: ["full", "half", "off"],
          default: "full",
          required: true,
        },
        thu: {
          type: String,
          enum: ["full", "half", "off"],
          default: "full",
          required: true,
        },
        fri: {
          type: String,
          enum: ["full", "half", "off"],
          default: "full",
          required: true,
        },
        sat: {
          type: String,
          enum: ["full", "half", "off"],
          default: "half",
          required: true,
        },
        sun: {
          type: String,
          enum: ["full", "half", "off"],
          default: "off",
          required: true,
        },
      },
      required: false,
    },
    divideBy: {
      type: Number,
      enum: [240, 200],
      default: 240,
    },
    otMethod: {
      type: String,
      required: true,
      default: "random",
    },
    active: {
      type: Boolean,
      default: true,
    },
    phoneNumber: {
      type: String,
    },
    email: {
      type: String,
    },
    address: {
      type: String,
    },
    probabilities: {
      type: {
        workOnOff: {
          type: Number,
          default: 1,
        },
        workOnHoliday: {
          type: Number,
          default: 1,
        },
        absent: {
          type: Number,
          default: 5,
        },
        late: {
          type: Number,
          default: 2,
        },
        ot: {
          type: Number,
          default: 75,
        },
      },
    },
    paymentStructure: {
      additions: {
        type: [
          {
            name: {
              type: String,
              required: true,
            },
            amount: {
              type: String,
            },
            affectTotalEarnings: {
              type: Boolean,
              default: false,
            },
          },
        ],
      },
      deductions: {
        type: [
          {
            name: {
              type: String,
            },
            amount: {
              type: String,
            },
            affectTotalEarnings: {
              type: Boolean,
              default: false,
            },
          },
        ],
        default: [{ name: "EPF 8%", amount: null }],
      },
    },
  },
  {
    timestamps: true, // Optionally add timestamps for createdAt and updatedAt
  }
);

// Check if the model already exists
const Employee =
  models.Employee || model<IEmployee>("Employee", employeeSchema);

export default Employee;
