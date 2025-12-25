import { Schema, model, models, Document } from "mongoose";

// Define an interface for the Company document
export interface ICompany extends Document {
  name: string;
  employerNo: string;
  address: string;
  user: Schema.Types.ObjectId;
  startedAt: String;
  endedAt: String;
  paymentMethod: String;
  active: boolean;
  monthlyPrice: number;
  monthlyPriceOverride: boolean;
  employerName: string;
  employerAddress: string;
  openHours: {
    start: string;
    end: string;
    allDay: boolean;
  };
  requiredDocs: {
    epf: boolean;
    etf: boolean;
    salary: boolean;
    paySlip: boolean;
  };
  mode: "self" | "visit" | "aided";
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
  probabilities: {
    workOnOff: number;
    workOnHoliday: number;
    absent: number;
    late: number;
    ot: number;
  };
  calendar: "default" | "other";
  attendanceConfig: {
    enabled: boolean;
    pwaCheckIn: boolean;
    hardwareIntegration: boolean;
    salaryIntegration: boolean;
  };
  geoFencing: {
    enabled: boolean;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    enforceValidation: boolean;
    allowedLocations?: {
      lat: number;
      lng: number;
      radius: number;
      name: string;
    }[];
  };
  allowRemoteCheckIn: boolean;
  requireApproval: boolean;
  apiKey?: string;
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

// Define the schema for the Company model
const companySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: true,
    },
    employerNo: {
      type: String,
      unique: true,
      required: true,
    },
    address: {
      type: String,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    monthlyPrice: {
      type: Number,
      required: true,
      default: 3000,
    },
    monthlyPriceOverride: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: String,
    },
    endedAt: {
      type: String,
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
    paymentMethod: {
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
    },
    mode: {
      type: String,
      required: true,
      default: "self",
      enum: ["self", "visit", "aided"],
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
            },
          },
        ],
        default: [
          { name: "Incentive", amount: null, affectTotalEarnings: false },
          {
            name: "Performance Allowance",
            amount: null,
            affectTotalEarnings: false,
          },
        ],
      },
      deductions: {
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
            },
          },
        ],
        default: [{ name: "EPF 8%", amount: null, affectTotalEarnings: false }],
      },
    },
    requiredDocs: {
      type: {
        epf: {
          type: Boolean,
          required: true,
          default: true,
        },
        etf: {
          type: Boolean,
          required: true,
          default: true,
        },
        salary: {
          type: Boolean,
          required: true,
          default: true,
        },
        paySlip: {
          type: Boolean,
          required: true,
          default: true,
        },
      },
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
    employerName: {
      type: String,
    },
    employerAddress: {
      type: String,
    },
    openHours: {
      type: {
        start: {
          type: String,
          default: "08:00",
        },
        end: {
          type: String,
          default: "17:00",
        },
        allDay: {
          type: Boolean,
          default: true,
        },
      },
    },
    calendar: {
      type: String,
      enum: ["default", "other"],
      default: "default",
    },
    attendanceConfig: {
      enabled: {
        type: Boolean,
        default: false,
      },
      features: {
        pwaCheckIn: { type: Boolean, default: false },
        hardwareIntegration: { type: Boolean, default: false },
        salaryIntegration: { type: Boolean, default: false },
      },
      geoFencing: {
        enabled: { type: Boolean, default: false },
        latitude: Number,
        longitude: Number,
        radiusMeters: { type: Number, default: 100 },
        enforceValidation: { type: Boolean, default: false },
        allowedLocations: [
          {
            lat: Number,
            lng: Number,
            radius: Number,
            name: String,
          },
        ],
      },
      allowRemoteCheckIn: {
        type: Boolean,
        default: false,
      },
      requireApproval: {
        type: Boolean,
        default: false,
      },
      apiKey: {
        type: String, // For hardware integration
      }
    },
  },
  {
    timestamps: true, // Optionally add timestamps for createdAt and updatedAt
  }
);

// Check if the model already exists
// Check if the model already exists and delete it to prevent caching issues with schema changes
if (models.Company) delete models.Company;
const Company = model<ICompany>("Company", companySchema);

export default Company;
