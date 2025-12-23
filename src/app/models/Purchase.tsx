import { Schema, model, models, Document } from "mongoose";

// Define an interface for the Purchases document
interface IPurchase extends Document {
  periods: string[];
  company: Schema.Types.ObjectId;
  price: number;
  totalPrice: number;
  request: string | null;
  requestDay: string;
  remark: string;
  approvedStatus: "approved" | "pending" | "rejected";
  attachmentKey?: string; // S3/R2 key of the proof document
}

// Define the schema for the Purchases model
const purchaseSchema = new Schema<IPurchase>(
  {
    periods: {
      type: [String],
      required: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    request: {
      type: String,
    },
    requestDay: {
      type: String,
      required: true,
    },
    remark: {
      type: String,
    },
    approvedStatus: {
      type: String,
      default: "pending",
      enum: ["approved", "pending", "rejected"],
      required: true,
    },
    attachmentKey: {
      type: String,
      required: false
    }
  },
  {
    timestamps: true, // Optionally add timestamps for createdAt and updatedAt
  }
);

// Check if the model already exists
const Purchase =
  models.Purchase || model<IPurchase>("Purchase", purchaseSchema);

export default Purchase;
