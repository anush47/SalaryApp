import { Schema, model, models, Document, Types } from "mongoose";

export interface IEtfPayment extends Document {
    company: Types.ObjectId;
    period: string;

    // ETF Details
    employerContribution: number;
    totalAmount: number;

    // Payment Details (no reference number for ETF)
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

const etfPaymentSchema = new Schema<IEtfPayment>(
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
        totalAmount: {
            type: Number,
            required: true,
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
etfPaymentSchema.index({ company: 1, period: -1 });
etfPaymentSchema.index({ period: 1 });

if (models.EtfPayment) delete models.EtfPayment;
const EtfPayment = model<IEtfPayment>("EtfPayment", etfPaymentSchema);

export default EtfPayment;
