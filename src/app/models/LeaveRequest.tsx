import { Schema, model, models, Document } from "mongoose";

// Define an interface for the LeaveRequest document
interface ILeaveRequest extends Document {
  employee: Schema.Types.ObjectId;
  company: Schema.Types.ObjectId;
  leaveType: Schema.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  totalMinutes?: number; // For short leaves
  halfDay: boolean;
  halfDayPeriod: "morning" | "afternoon";
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  appliedAt: Date;
  approver: Schema.Types.ObjectId;
  approvedBy: Schema.Types.ObjectId;
  approvedAt: Date;
  rejectionReason: string;
  cancelledAt: Date;
  cancelReason: string;
  documents: string[];
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema for the LeaveRequest model
const leaveRequestSchema = new Schema<ILeaveRequest>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    leaveType: {
      type: Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
    },
    totalMinutes: {
      type: Number,
      // Only for short leaves
    },
    halfDay: {
      type: Boolean,
      default: false,
    },
    halfDayPeriod: {
      type: String,
      enum: ["first_half", "final_half"],
    },
    reason: {
      type: String,
      required: false,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      required: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    approver: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    cancelledAt: {
      type: Date,
    },
    cancelReason: {
      type: String,
    },
    documents: [
      {
        type: String,
      },
    ],
    remarks: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
leaveRequestSchema.index({ employee: 1, startDate: -1 });
leaveRequestSchema.index({ status: 1, company: 1 });
leaveRequestSchema.index({ approver: 1, status: 1 });
leaveRequestSchema.index({ company: 1, startDate: 1, endDate: 1 });

// Check if the model already exists
const LeaveRequest =
  models.LeaveRequest || model<ILeaveRequest>("LeaveRequest", leaveRequestSchema);

export default LeaveRequest;
