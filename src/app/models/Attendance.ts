import { Schema, model, models, Document, Types } from "mongoose";
// Force Recompile

export interface IAttendance extends Document {
    company: string | Types.ObjectId;
    employee: string | Types.ObjectId;
    timestamp: Date;
    type: "in" | "out";
    method: "web" | "kiosk" | "external_api" | "manual";

    // Verification Data
    location: {
        lat: number;
        lng: number;
        accuracy: number;
        isVerified: boolean; // True if within radius
    };
    deviceId?: string;
    deviceDetails?: string;

    // External Machine Data (Optional)
    externalMachineId?: string;
    externalRecordId?: string;

    // Approval Flow
    status: "pending" | "approved" | "rejected";
    approvedBy?: string | Types.ObjectId | null;
    approvedAt?: Date;

    // Shift Data
    shift?: {
        shiftId: string;
        name: string;
        startTime: string;
        endTime: string;
        type: string;
    };
    resolutionMode?: string; // "fixed", "roster", "dynamic", "manual", "auto_select"
    remarks?: string;
    dayStatus?: "full" | "half" | "off";
}

const resolvedShiftSchema = new Schema({
    shiftId: String,
    name: String,
    startTime: String,
    endTime: String,
    type: String
}, { _id: false });

const attendanceSchema = new Schema<IAttendance>(
    {
        company: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },
        employee: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        timestamp: {
            type: Date,
            required: true,
        },
        type: {
            type: String,
            enum: ["in", "out"],
            required: true,
        },
        method: {
            type: String,
            enum: ["web", "kiosk", "external_api", "manual"],
            required: true,
            default: "web",
        },
        location: {
            lat: Number,
            lng: Number,
            accuracy: Number,
            isVerified: Boolean,
        },
        deviceId: {
            type: String,
        },
        deviceDetails: {
            type: String,
        },
        externalMachineId: {
            type: String,
        },
        externalRecordId: {
            type: String,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "approved",
            required: true,
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
        },
        approvedAt: {
            type: Date,
        },
        shift: {
            type: resolvedShiftSchema,
        },
        resolutionMode: {
            type: String,
        },
        remarks: {
            type: String,
        },
        dayStatus: {
            type: String,
            enum: ["full", "half", "off"],
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
attendanceSchema.index({ company: 1, timestamp: -1 });
attendanceSchema.index({ employee: 1, timestamp: -1 });
attendanceSchema.index({ company: 1, employee: 1, timestamp: -1 });

if (models.Attendance) delete models.Attendance;
const Attendance = model<IAttendance>("Attendance", attendanceSchema);

export default Attendance;
