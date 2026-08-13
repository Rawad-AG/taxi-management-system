import mongoose, { Schema } from 'mongoose';

const bucketTransactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['deposit', 'ride_payment', 'debt_payment', 'adjustment'],
      required: true,
    },
    amount: { type: Number, required: true }, // negative = debit
    ride: { type: Schema.Types.ObjectId, ref: 'Ride' },
    debt: { type: Schema.Types.ObjectId, ref: 'PayLaterDebt' },
    note: { type: String, trim: true, maxlength: 300 },
    balanceAfter: { type: Number },
  },
  { timestamps: true },
);

bucketTransactionSchema.index({ user: 1, createdAt: -1 });

export const BucketTransaction = mongoose.model('BucketTransaction', bucketTransactionSchema);
