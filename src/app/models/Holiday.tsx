import { Schema, model, models, Document } from "mongoose";

interface IHoliday extends Document {
  date: string;
  calendar: "default" | "other";
  categories: {
    public: boolean;
    mercantile: boolean;
    bank: boolean;
  };
  summary: string;
}

const holidaySchema = new Schema<IHoliday>({
  date: {
    type: String,
    required: true,
  },
  calendar: {
    type: String,
    enum: ["default", "other"],
    required: true,
  },
  categories: {
    type: {
      public: {
        type: Boolean,
        required: true,
      },
      mercantile: {
        type: Boolean,
        required: true,
      },
      bank: {
        type: Boolean,
        required: true,
      },
    },
    required: true,
  },
  summary: {
    type: String,
  },
});

// Compound unique index on date + calendar
holidaySchema.index({ date: 1, calendar: 1 }, { unique: true });

// Check if the model already exists
const Holiday = models.Holiday || model<IHoliday>("Holiday", holidaySchema);

export default Holiday;
