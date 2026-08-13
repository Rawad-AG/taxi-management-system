import mongoose, { Schema } from 'mongoose';

const sosLocSchema = new Schema(
  {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
    accuracy: { type: Number, min: 0 },
    ts: { type: Number },
  },
  { _id: false },
);

const sosIncidentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['customer', 'driver', 'admin'], required: true },
    ride: { type: Schema.Types.ObjectId, ref: 'Ride' },
    location: { type: sosLocSchema },
    reason: {
      type: String,
      enum: ['safety', 'accident', 'medical', 'harassment', 'other'],
      required: true,
    },
    note: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedNote: { type: String, trim: true, maxlength: 300 },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

sosIncidentSchema.index({ status: 1, createdAt: -1 });
sosIncidentSchema.index({ user: 1, status: 1 });

export const SOSIncident = mongoose.model('SOSIncident', sosIncidentSchema);
