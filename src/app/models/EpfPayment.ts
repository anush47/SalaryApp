import { Schema, model, models, Document, Types } from "mongoose";

export interface IEpfPayment extends Document {
    company: Types.ObjectId;
    period: string;

    // EPF Details
    employerContribution: number;
    employeeContribution: number;
    totalAmount: number;

    // Payment Details
    referenceNo?: string;
    paymentDate?: Date;
    paymentMethod?: string;
    surcharges?: number;

    // Receipt Upload
    receiptFile?: string;
    receiptFilename?: string;

    // Audit
    createdBy: Types.ObjectId;
    remark?: string;
}

const epfPaymentSchema = new Schema<IEpfPayment>(
    {
        company: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },
        period: {
            type: String,
            required: true,
            validate: {
                validator: function (v: string) {
                    // Validate YYYY-MM format
                    return /^\d{4}-\d{2}$/.test(v);
                },
                message: "Period must be in YYYY-MM format (monthly only)",
            },
        },
        employerContribution: {
            type: Number,
            required: true,
        },
        employeeContribution: {
            type: Number,
            required: true,
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        referenceNo: {
            type: String,
        },
        paymentDate: {
            type: Date,
        },
        paymentMethod: {
            type: String,
        },
        surcharges: {
            type: Number,
            default: 0,
        },
        receiptFile: {
            type: String,
        },
        receiptFilename: {
            type: String,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        remark: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
epfPaymentSchema.index({ company: 1, period: -1 });
epfPaymentSchema.index({ period: 1 });

if (models.EpfPayment) delete models.EpfPayment;
const EpfPayment = model<IEpfPayment>("EpfPayment", epfPaymentSchema);

export default EpfPayment;
