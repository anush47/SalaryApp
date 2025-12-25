import { Schema, model, models, Document } from "mongoose";

export interface IShiftAssignment extends Document {
    company: Schema.Types.ObjectId;
    employee: Schema.Types.ObjectId;
    shiftId: string; // The ID of the shift definition (from Company or Employee settings)
    date: string; // Format: YYYY-MM-DD
    isOffDay: boolean; // Option to explicitly mark a day as off
    assignedBy: Schema.Types.ObjectId; // User who assigned this
}

const shiftAssignmentSchema = new Schema<IShiftAssignment>(
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
        shiftId: {
            type: String,
            // Not a ref, but an ID from the shifts array in Company/Employee config
        },
        date: {
            type: String,
            required: true,
            index: true, // Important for querying by date
        },
        isOffDay: {
            type: Boolean,
            default: false,
        },
        assignedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure one assignment per employee per day
shiftAssignmentSchema.index({ employee: 1, date: 1 }, { unique: true });
shiftAssignmentSchema.index({ company: 1, date: 1 });

const ShiftAssignment =
    models.ShiftAssignment ||
    model<IShiftAssignment>("ShiftAssignment", shiftAssignmentSchema);

export default ShiftAssignment;
