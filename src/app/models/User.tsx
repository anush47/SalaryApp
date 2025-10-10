import { Schema, model, models, Document } from "mongoose";

interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin" | "employer" | "employee";
  employee: Schema.Types.ObjectId;
  isActive: boolean;
  lastLogin: Date;
  passwordChangedAt: Date;
  forcePasswordChange: boolean;
  profilePhoto: string;
  phoneNumber: string;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["admin", "employer", "employee"],
      default: "employer",
    },
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
    forcePasswordChange: {
      type: Boolean,
      default: false,
    },
    profilePhoto: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
  },
  {
    timestamps: true, // Optionally add timestamps for createdAt and updatedAt
  }
);

// Indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ employee: 1 });

// Check if the model already exists
const User = models.User || model<IUser>("User", userSchema);

export default User;
