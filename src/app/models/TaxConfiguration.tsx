import { Schema, model, models, Document } from "mongoose";

// Define an interface for the TaxConfiguration document
interface ITaxConfiguration extends Document {
  year: number;
  country: string;
  companyId?: Schema.Types.ObjectId; // Optional: for company-specific tax configs
  isDefault: boolean; // True for global default, false for company-specific
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
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    taxSlabs: [
      {
        min: {
          type: Number,
          required: true,
        },
        max: {
          type: Number,
          required: true,
        },
        rate: {
          type: Number,
          required: true,
        },
        fixedAmount: {
          type: Number,
          default: 0,
        },
      },
    ],
    personalAllowance: {
      monthly: {
        type: Number,
        required: true,
        default: 150000, // LKR 150,000 per month (Updated April 2025)
      },
      annual: {
        type: Number,
        required: true,
        default: 1800000, // LKR 1,800,000 per year (Updated April 2025)
      },
    },
    qualifyingPaymentRelief: {
      epfRate: {
        type: Number,
        default: 0.08, // 8% EPF contribution
      },
      maxMonthly: {
        type: Number,
      },
    },
    stampDuty: {
      threshold: {
        type: Number,
        default: 50000, // LKR 50,000
      },
      amount: {
        type: Number,
        default: 25, // LKR 25
      },
    },
    otherDeductions: [
      {
        name: String,
        threshold: Number,
        rate: Number,
        maxAmount: Number,
      },
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
taxConfigurationSchema.index({ year: 1, country: 1, companyId: 1 });
taxConfigurationSchema.index({ isActive: 1, effectiveFrom: 1 });
taxConfigurationSchema.index({ companyId: 1, isActive: 1 });
taxConfigurationSchema.index({ isDefault: 1, isActive: 1 });

// Check if the model already exists
const TaxConfiguration =
  models.TaxConfiguration ||
  model<ITaxConfiguration>("TaxConfiguration", taxConfigurationSchema);

export default TaxConfiguration;
