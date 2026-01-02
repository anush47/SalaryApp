import { Schema, model, models, Document, Types } from "mongoose";

export interface ISalaryPayment extends Document {
    salary: Types.ObjectId;
    employee: Types.ObjectId;
    company: Types.ObjectId;
    period: string;
    salaryPeriod: "daily" | "weekly" | "bi-weekly" | "monthly" | "custom";

    // Payment Details
    paymentDate: Date;
    amount: number;
    paymentMethod: "cash" | "bank_transfer" | "cheque";
    referenceNo?: string;

    // Employee Acknowledgment
    acknowledgedBy?: Types.ObjectId;
    acknowledgedAt?: Date;
    signature?: string;
    employeeNote?: string;

    // Admin Details
    madeBy: Types.ObjectId;
    adminNote?: string;

    status: "pending" | "acknowledged" | "disputed";
}

const salaryPaymentSchema = new Schema<ISalaryPayment>(
    {
        salary: {
            type: Schema.Types.ObjectId,
            ref: "Salary",
            required: true,
        },
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
        period: {
            type: String,
            required: true,
        },
        salaryPeriod: {
            type: String,
            enum: ["daily", "weekly", "bi-weekly", "monthly", "custom"],
            required: true,
        },
        paymentDate: {
            type: Date,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        paymentMethod: {
            type: String,
            enum: ["cash", "bank_transfer", "cheque"],
            required: true,
        },
        referenceNo: {
            type: String,
        },
        acknowledgedBy: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
        },
        acknowledgedAt: {
            type: Date,
        },
        signature: {
            type: String,
        },
        employeeNote: {
            type: String,
        },
        madeBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        adminNote: {
            type: String,
        },
        status: {
            type: String,
            enum: ["pending", "acknowledged", "disputed"],
            default: "pending",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
salaryPaymentSchema.index({ salary: 1 });
salaryPaymentSchema.index({ employee: 1, period: -1 });
salaryPaymentSchema.index({ company: 1, period: -1 });
salaryPaymentSchema.index({ status: 1 });

if (models.SalaryPayment) delete models.SalaryPayment;
const SalaryPayment = model<ISalaryPayment>("SalaryPayment", salaryPaymentSchema);

export default SalaryPayment;
