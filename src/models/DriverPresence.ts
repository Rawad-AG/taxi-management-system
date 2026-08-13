import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const driverPresenceSchema = new Schema(
  {
    driver: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    online: { type: Boolean, default: false },
    city: { type: Schema.Types.ObjectId, ref: 'City' },
    areas: [{ type: Schema.Types.ObjectId, ref: 'Area' }],
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export type DriverPresenceDoc = InferSchemaType<typeof driverPresenceSchema>;
export const DriverPresence = mongoose.model('DriverPresence', driverPresenceSchema);
