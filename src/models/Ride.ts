import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export type RideStatus = 'requested' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
export type RideType = 'ride' | 'delivery' | 'send_item';
export type RideCategory = 'economy' | 'comfort' | 'luxury' | 'van';

const locationSchema = new Schema(
  {
    label: { type: String, trim: true, maxlength: 120 },
    area: { type: Schema.Types.ObjectId, ref: 'Area' },
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);

const fareSchema = new Schema(
  {
    base: { type: Number, required: true },
    perKm: { type: Number, required: true },
    distanceKm: { type: Number, required: true },
    roadDistanceKm: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false },
);

const timelineSchema = new Schema(
  {
    requestedAt: { type: Date },
    acceptedAt: { type: Date },
    arrivedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { _id: false },
);

const cancellationSchema = new Schema(
  {
    reason: { type: String, trim: true, maxlength: 200 },
    cancelledBy: { type: String, enum: ['customer', 'driver', 'system'], required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const liveLocSchema = new Schema(
  {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
    accuracy: { type: Number, min: 0 },
    ts: { type: Number },
  },
  { _id: false },
);

const liveSchema = new Schema(
  {
    driverLoc: { type: liveLocSchema },
    customerLoc: { type: liveLocSchema },
    updatedAt: { type: Date },
  },
  { _id: false },
);

const rideSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    driver: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    status: {
      type: String,
      enum: ['requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled'],
      default: 'requested',
      index: true,
    },
    type: { type: String, enum: ['ride', 'delivery', 'send_item'], default: 'ride' },
    category: { type: String, enum: ['economy', 'comfort', 'luxury', 'van'], default: 'economy' },
    city: { type: Schema.Types.ObjectId, ref: 'City', required: true, index: true },
    pickup: { type: locationSchema, required: true },
    dropoff: { type: locationSchema, required: true },
    fare: { type: fareSchema, required: true },
    timeline: { type: timelineSchema, default: {} },
    cancellation: { type: cancellationSchema },
    ratings: {
      customerRating: { type: Number, min: 1, max: 5 },
      driverRating: { type: Number, min: 1, max: 5 },
      customerComment: { type: String, trim: true, maxlength: 300 },
      driverComment: { type: String, trim: true, maxlength: 300 },
    },
    payment: {
      method: { type: String, enum: ['cash', 'bucket', 'pay_later'], default: 'cash' },
      collected: { type: Boolean, default: false },
    },
    live: { type: liveSchema },
  },
  { timestamps: true },
);

rideSchema.index({ status: 1, createdAt: -1 });
rideSchema.index({ customer: 1, createdAt: -1 });
rideSchema.index({ driver: 1, createdAt: -1 });

export type RideDoc = InferSchemaType<typeof rideSchema>;
export const Ride = mongoose.model('Ride', rideSchema);
