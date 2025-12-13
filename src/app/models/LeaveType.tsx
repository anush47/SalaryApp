import { Schema, model, models, Document } from "mongoose";

// Define an interface for the LeaveType document
interface ILeaveType extends Document {
  name: string;
  company: Schema.Types.ObjectId;
  code: string;
  // New flexible period fields
  accrualPeriod: "yearly" | "monthly" | "weekly" | "quarterly" | "half-yearly" | "custom";
  maxDaysPerPeriod: number;
  customPeriodDays?: number; // For custom periods (e.g., every 90 days)
  accrualMethod: "upfront" | "monthly-accrual" | "pro-rata";
  resetDay?: number; // Day of month/week when period resets (1-31 for monthly, 0-6 for weekly)
  maxConsecutiveDays: number;
  carryForward: boolean;
  maxCarryForwardDays: number;
  requiresApproval: boolean;
  requiresDocument: boolean;
  isPaid: boolean;
  applicableFor: ("permanent" | "contract" | "intern" | "temporary")[];
  gender: "male" | "female" | "all";
  color: string;
  description: string;
  isActive: boolean;
  // Short Leave fields
  isShortLeave: boolean;
  maxDurationMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema for the LeaveType model
const leaveTypeSchema = new Schema<ILeaveType>(
  {
    name: {
      type: String,
      required: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
    },
    // New flexible period fields
    accrualPeriod: {
      type: String,
      enum: ["yearly", "monthly", "weekly", "quarterly", "half-yearly", "custom"],
      default: "yearly",
      required: true,
    },
    maxDaysPerPeriod: {
      type: Number,
      required: true,
      default: 14,
    },
    customPeriodDays: {
      type: Number,
      // Only required if accrualPeriod is "custom"
    },
    accrualMethod: {
      type: String,
      enum: ["upfront", "monthly-accrual", "pro-rata"],
      default: "upfront",
      required: true,
    },
    resetDay: {
      type: Number,
      // Day of month (1-31) for monthly/quarterly/half-yearly
      // Day of week (0-6) for weekly
      // Not used for yearly (resets on company fiscal year start or calendar year)
    },
    maxConsecutiveDays: {
      type: Number,
    },
    carryForward: {
      type: Boolean,
      default: false,
    },
    maxCarryForwardDays: {
      type: Number,
      default: 0,
    },
    requiresApproval: {
      type: Boolean,
      default: true,
    },
    requiresDocument: {
      type: Boolean,
      default: false,
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
    applicableFor: [
      {
        type: String,
        enum: ["permanent", "contract", "intern", "temporary"],
      },
    ],
    gender: {
      type: String,
      enum: ["male", "female", "all"],
      default: "all",
    },
    color: {
      type: String,
      default: "#4CAF50",
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Short Leave fields
    isShortLeave: {
      type: Boolean,
      default: false,
    },
    maxDurationMinutes: {
      type: Number,
      // Only used if isShortLeave is true
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
leaveTypeSchema.index({ company: 1, code: 1 }, { unique: true });
leaveTypeSchema.index({ company: 1, isActive: 1 });

// Check if the model already exists
const LeaveType =
  models.LeaveType || model<ILeaveType>("LeaveType", leaveTypeSchema);

export default LeaveType;
