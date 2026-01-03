import { Schema, model, models, Document, Types } from "mongoose";

// Define an interface for the Employee document
export interface IEmployee extends Document {
  memberNo: number;
  name: string;
  fullName: string;
  nic: string;
  basic: number;
  totalSalary: string;
  company: string | Types.ObjectId;
  designation: string;
  startedAt: string;
  resignedAt: string;
  remark: string;
  phoneNumber: string;
  email: string;
  address: string;
  divideBy: 240 | 200;
  active: boolean;
  otMethod: "noOt" | "calc";
  // New fields for hierarchy and access
  user?: string | Types.ObjectId | null;
  department?: string | Types.ObjectId | null;
  manager?: string | Types.ObjectId | null;
  employeeType: "permanent" | "contract" | "intern" | "temporary";
  canLogin: boolean;
  taxType?: "company" | "individual";
  // Salary Period Configuration
  salaryPeriod: "daily" | "weekly" | "bi-weekly" | "monthly" | "custom";
  customPeriodDays?: number;
  rateDivisor: number; // For daily rate calculation (default 30)
  dailyRateOverride?: number;
  weeklyRateOverride?: number;
  monthlyRateOverride?: number;
  payPeriodConfig?: {
    startDay: number;
    endDay?: number; // null or undefined = end of month
    type: "fixed_dates" | "start_to_end_of_month" | "end_to_end_of_month";
  };
  calculationMethod: "attendance" | "fixed_days" | "no_ot";
  // Leave customization with override pattern
  overrides: {
    shifts: boolean;
    workingDays: boolean;
    probabilities: boolean;
    paymentStructure: boolean;
    calendar: boolean;
    leaveTypes: boolean;
    attendance: boolean;
    salaryPeriod: boolean;
  };
  attendanceOverrides: {
    enabled: boolean;
    pwaCheckIn: boolean;
    hardwareIntegration: boolean;
    salaryIntegration: boolean;
    geoFencing?: {
      enabled: boolean;
      latitude: number;
      longitude: number;
      radiusMeters: number;
      enforceValidation: boolean;
      allowedLocations: {
        lat: number;
        lng: number;
        radius: number;
        name: string;
      }[];
    };
    allowRemoteCheckIn: boolean;
    requireApproval: boolean;
    approvalMode?: "automatic" | "always" | "out_of_zone";
    isRemote: boolean;
  };
  leaveTypes: {
    leaveType: Schema.Types.ObjectId;
    maxDaysPerPeriod: number; // Represents max days per period
    balance: number; // Current period balance
    carryForward: boolean;
    currentPeriodStart?: Date; // Start date of current period
    lastAccrualDate?: Date; // For monthly-accrual tracking
    carriedForwardBalance?: number; // Balance carried from previous period
  }[];
  calendar?: "default" | "other";
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
  shiftSettings: {
    mode: "fixed" | "dynamic" | "roster" | "manual";
    shifts: {
      _id?: string;
      name: string;
      type: "fixed" | "dynamic";
      startTime?: string;
      endTime?: string;
      duration?: number;
      breakDuration: number;
      minStartTime?: string;
      maxStartTime?: string;
      minEndTime?: string;
      maxEndTime?: string;
      maxDuration?: number;
    }[];
    defaultShiftId?: string;
    autoSelect: boolean;
  };
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
  motherName: string;
  fatherName: string;
  isMarried: boolean;
  spouseName: string;
  nationality: string;
  documents: Map<string, string>;
  emergencyContact: string;
  editable: boolean;
  autoAcknowledge: boolean;
}

// Define Shift Schema separately to handle String _id
const shiftSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["fixed", "dynamic"], required: true },
  startTime: String,
  endTime: String,
  duration: Number,
  breakDuration: { type: Number, default: 0 },
  minStartTime: String,
  maxStartTime: String,
  minEndTime: String,
  maxEndTime: String,
  maxDuration: Number,
});

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
    fullName: {
      type: String,
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
    // New hierarchy fields
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
    },
    manager: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },
    employeeType: {
      type: String,
      enum: ["permanent", "contract", "intern", "temporary"],
      default: "permanent",
    },
    canLogin: {
      type: Boolean,
      default: false,
    },
    taxType: {
      type: String,
      enum: ["company", "individual"],
      required: false,
    },
    // Salary Period Configuration
    salaryPeriod: {
      type: String,
      enum: ["daily", "weekly", "bi-weekly", "monthly", "custom"],
    },
    customPeriodDays: {
      type: Number,
    },
    rateDivisor: {
      type: Number,
      default: 30,
    },

    payPeriodConfig: {
      startDay: {
        type: Number,
        min: 1,
        max: 31,
      },
      endDay: {
        type: Number,
        min: 1,
        max: 31,
      },
      type: {
        type: String,
        enum: ["fixed_dates", "start_to_end_of_month", "end_to_end_of_month"],
      },
    },
    calculationMethod: {
      type: String,
      enum: ["attendance", "fixed_days", "no_ot"],
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
        calendar: {
          type: Boolean,
          default: false,
        },
        leaveTypes: {
          type: Boolean,
          default: false,
        },
        attendance: {
          type: Boolean,
          default: false,
        },
        salaryPeriod: {
          type: Boolean,
          default: false,
        },


      },
    },

    attendanceOverrides: {
      enabled: { type: Boolean, default: false },
      pwaCheckIn: { type: Boolean, default: false },
      hardwareIntegration: { type: Boolean, default: false },
      salaryIntegration: { type: Boolean, default: false },
      geoFencing: {
        enabled: { type: Boolean, default: false },
        latitude: { type: Number, default: 0 },
        longitude: { type: Number, default: 0 },
        radiusMeters: { type: Number, default: 100 },
        enforceValidation: { type: Boolean, default: false },
        allowedLocations: [
          {
            _id: false,
            lat: Number,
            lng: Number,
            radius: Number,
            name: String,
          },
        ],
      },
      allowRemoteCheckIn: { type: Boolean, default: false },
      requireApproval: { type: Boolean, default: false },
      approvalMode: {
        type: String,
        enum: ["automatic", "always", "out_of_zone"],
        default: "automatic",
      },
      isRemote: { type: Boolean, default: false },
    },
    leaveTypes: [
      {
        leaveType: {
          type: Schema.Types.ObjectId,
          ref: "LeaveType",
          required: true,
        },
        maxDaysPerPeriod: {
          type: Number,
          required: true,
        },
        balance: {
          type: Number,
          required: true,
          // Current period balance
        },
        carryForward: {
          type: Boolean,
          default: false,
        },
        currentPeriodStart: {
          type: Date,
          // Start date of current leave period
        },
        lastAccrualDate: {
          type: Date,
          // Last date leaves were accrued (for monthly-accrual method)
        },
        carriedForwardBalance: {
          type: Number,
          default: 0,
          // Balance carried forward from previous period
        },
      },
    ],
    calendar: {
      type: String,
      enum: ["default", "other"],
      default: "default",
    },
    shiftSettings: {
      mode: {
        type: String,
        enum: ["fixed", "dynamic", "roster", "manual"],
        default: "fixed",
      },
      shifts: {
        type: [shiftSchema],
        default: [],
      },
      defaultShiftId: String,
      autoSelect: { type: Boolean, default: false },
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
        isDynamicHolidays: {
          type: Boolean,
          default: false,
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
      enum: ["noOt", "calc"],
      required: true,
      default: "noOt",
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
    motherName: {
      type: String,
    },
    fatherName: {
      type: String,
    },
    isMarried: {
      type: Boolean,
    },
    spouseName: {
      type: String,
    },
    nationality: {
      type: String,
      default: "Sri Lankan",
    },
    documents: {
      type: Map,
      of: String,
    },
    emergencyContact: {
      type: String,
    },
    editable: {
      type: Boolean,
      default: false,
    },
    autoAcknowledge: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Optionally add timestamps for createdAt and updatedAt
  }
);

// Indexes for performance
employeeSchema.index({ company: 1, memberNo: 1 }, { unique: true });
employeeSchema.index({ user: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ manager: 1 });
employeeSchema.index({ company: 1, canLogin: 1 });
employeeSchema.index({ company: 1, active: 1 });

// Check if the model already exists
// Check if the model already exists
if (models.Employee) delete models.Employee;
const Employee = model<IEmployee>("Employee", employeeSchema);

export default Employee;
