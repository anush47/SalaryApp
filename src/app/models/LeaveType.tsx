import { Schema, model, models, Document } from "mongoose";

// Define an interface for the LeaveType document
interface ILeaveType extends Document {
  name: string;
  company: Schema.Types.ObjectId;
  code: string;
  maxDaysPerYear: number;
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
    maxDaysPerYear: {
      type: Number,
      required: true,
      default: 14,
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
