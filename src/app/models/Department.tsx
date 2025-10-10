import { Schema, model, models, Document } from "mongoose";

// Define an interface for the Department document
interface IDepartment extends Document {
  name: string;
  company: Schema.Types.ObjectId;
  manager: Schema.Types.ObjectId;
  parentDepartment: Schema.Types.ObjectId;
  description: string;
  costCenter: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema for the Department model
const departmentSchema = new Schema<IDepartment>(
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
    manager: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },
    parentDepartment: {
      type: Schema.Types.ObjectId,
      ref: "Department",
    },
    description: {
      type: String,
    },
    costCenter: {
      type: String,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
departmentSchema.index({ company: 1, name: 1 }, { unique: true });
departmentSchema.index({ manager: 1 });
departmentSchema.index({ parentDepartment: 1 });

// Check if the model already exists
const Department =
  models.Department || model<IDepartment>("Department", departmentSchema);

export default Department;
