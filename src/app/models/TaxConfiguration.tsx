import { Schema, model, models, Document } from "mongoose";

// Define an interface for the TaxConfiguration document
interface ITaxConfiguration extends Document {
  year: number;
  country: string;
  taxSlabs: {
    min: number;
    max: number;
    rate: number;
    fixedAmount: number;
  }[];
  personalAllowance: {
    monthly: number;
    annual: number;
  };
  qualifyingPaymentRelief: {
    epfRate: number;
    maxMonthly: number;
  };
  stampDuty: {
    threshold: number;
    amount: number;
  };
  otherDeductions: {
    name: string;
    threshold: number;
    rate: number;
    maxAmount: number;
  }[];
  overrides: {
    companyId: Schema.Types.ObjectId;
    taxSlabs?: {
      min: number;
      max: number;
      rate: number;
      fixedAmount: number;
    }[];
    personalAllowance?: {
      monthly: number;
      annual: number;
    };
  }[];
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema for the TaxConfiguration model
const taxConfigurationSchema = new Schema<ITaxConfiguration>(
  {
    year: {
      type: Number,
      required: true,
    },
    country: {
      type: String,
      required: true,
      default: "LK",
    },
    taxSlabs: [
      {
        min: { type: Number, required: true },
        max: { type: Number, required: true },
        rate: { type: Number, required: true },
        fixedAmount: { type: Number, default: 0 },
      },
    ],
    personalAllowance: {
      monthly: { type: Number, required: true },
      annual: { type: Number, required: true },
    },
    qualifyingPaymentRelief: {
      epfRate: { type: Number, default: 0.08 },
      maxMonthly: { type: Number },
    },
    stampDuty: {
      threshold: { type: Number, default: 50000 },
      amount: { type: Number, default: 25 },
    },
    otherDeductions: [
      {
        name: String,
        threshold: Number,
        rate: Number,
        maxAmount: Number,
      },
    ],
    overrides: [
      {
        companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
        taxSlabs: [{ min: Number, max: Number, rate: Number, fixedAmount: Number }],
        personalAllowance: { monthly: Number, annual: Number },
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    effectiveFrom: {
      type: Date,
      required: true,
    },
    effectiveTo: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
taxConfigurationSchema.index({ year: 1, country: 1 }, { unique: true });
taxConfigurationSchema.index({ "overrides.companyId": 1 });
taxConfigurationSchema.index({ isActive: 1, effectiveFrom: 1 });

// Check if the model already exists
const TaxConfiguration =
  models.TaxConfiguration ||
  model<ITaxConfiguration>("TaxConfiguration", taxConfigurationSchema);

export default TaxConfiguration;
