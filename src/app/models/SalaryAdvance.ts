import { Schema, model, models, Document, Types } from "mongoose";

export interface ISalaryAdvance extends Document {
    employee: Types.ObjectId;
    company: Types.ObjectId;

    // Advance Details
    amount: number;
    advanceDate: Date;
    reason?: string;

    // Deduction Plan
    deductionStartPeriod: string;
    deductionMonths: number;
    monthlyDeduction: number;

    // Status Tracking
    totalDeducted: number;
    remainingBalance: number;
    status: "active" | "fully_deducted" | "written_off";

    // References
    relatedPayments: Types.ObjectId[];

    // Audit
    createdBy: Types.ObjectId;
    note?: string;
}

const salaryAdvanceSchema = new Schema<ISalaryAdvance>(
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
        amount: {
            type: Number,
            required: true,
        },
        advanceDate: {
            type: Date,
            required: true,
        },
        reason: {
            type: String,
        },
        deductionStartPeriod: {
            type: String,
            required: true,
        },
        deductionMonths: {
            type: Number,
            required: true,
        },
        monthlyDeduction: {
            type: Number,
            required: true,
        },
        totalDeducted: {
            type: Number,
            default: 0,
            required: true,
        },
        remainingBalance: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["active", "fully_deducted", "written_off"],
            default: "active",
            required: true,
        },
        relatedPayments: [
            {
                type: Schema.Types.ObjectId,
                ref: "Salary",
            },
        ],
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        note: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
salaryAdvanceSchema.index({ employee: 1, status: 1 });
salaryAdvanceSchema.index({ company: 1, status: 1 });
salaryAdvanceSchema.index({ deductionStartPeriod: 1 });

if (models.SalaryAdvance) delete models.SalaryAdvance;
const SalaryAdvance = model<ISalaryAdvance>("SalaryAdvance", salaryAdvanceSchema);

export default SalaryAdvance;
