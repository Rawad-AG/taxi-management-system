import mongoose, { Schema } from 'mongoose';

const payLaterDebtSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ride: { type: Schema.Types.ObjectId, ref: 'Ride', required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['outstanding', 'paid', 'overdue', 'waived'],
      default: 'outstanding',
      index: true,
    },
    paidAt: { type: Date },
    paidFromBucket: { type: Boolean, default: false },
    settledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    settledNote: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true },
);

payLaterDebtSchema.index({ customer: 1, status: 1 });
payLaterDebtSchema.index({ status: 1, dueDate: 1 });

export type PayLaterDebtDoc = mongoose.InferSchemaType<typeof payLaterDebtSchema>;
export const PayLaterDebt = mongoose.model('PayLaterDebt', payLaterDebtSchema);
