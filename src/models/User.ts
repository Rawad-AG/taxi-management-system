import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const carSchema = new Schema(
  {
    make: { type: Schema.Types.ObjectId, ref: 'CarMake', required: true },
    model: { type: Schema.Types.ObjectId, ref: 'CarModel', required: true },
    year: { type: Number, required: true, min: 1990, max: new Date().getFullYear() + 1 },
    color: { type: String, required: true, trim: true },
    plateNumber: { type: String, required: true, trim: true, uppercase: true },
    seats: { type: Number, default: 4, min: 2, max: 30 },
    category: { type: String, enum: ['economy', 'comfort', 'luxury', 'van'], default: 'economy' },
  },
  { _id: false },
);

const savedPlaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    label: { type: String, trim: true, maxlength: 120 },
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: true },
);

const savedRoutePointSchema = new Schema(
  {
    label: { type: String, trim: true, maxlength: 120 },
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);

const savedRouteSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    pickup: { type: savedRoutePointSchema, required: true },
    dropoff: { type: savedRoutePointSchema, required: true },
  },
  { _id: true },
);

const userSchema = new Schema(
  {
    role: { type: String, enum: ['customer', 'driver', 'admin'], required: true, index: true },

    // --- customer fields ---
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },

    // --- shared ---
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      match: [/^\+9639\d{8}$/, 'Phone must be a valid Syrian number (+963 9xx xxx xxx)'],
    },
    password: { type: String, required: true, select: false },
    avatar: { type: String, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
    savedPlaces: { type: [savedPlaceSchema], default: [] },
    savedRoutes: { type: [savedRouteSchema], default: [] },
    bucketBalance: { type: Number, default: 0, min: 0 },
    deviceTokens: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['active', 'pending', 'suspended'],
      default: 'active',
      index: true,
    },

    // --- driver fields ---
    driverProfile: {
      fullName: { type: String, trim: true },
      fatherName: { type: String, trim: true },
      nationalId: { type: String, trim: true },
      licenseNumber: { type: String, trim: true },
      licenseExpiry: { type: Date },
      workingCity: { type: Schema.Types.ObjectId, ref: 'City' },
      workingAreas: [{ type: Schema.Types.ObjectId, ref: 'Area' }],
      car: carSchema,
    },

    // --- password reset ---
    passwordResetCode: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // --- login otp challenge ---
    otpCodeHash: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },

    // --- change phone flow ---
    pendingPhone: { type: String, trim: true, select: false },
    pendingPhoneCodeHash: { type: String, select: false },
    pendingPhoneExpires: { type: Date, select: false },
    pendingPhoneAttempts: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User = mongoose.model('User', userSchema);
