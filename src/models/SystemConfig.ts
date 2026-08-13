import mongoose, { Schema } from 'mongoose';

const pricingSchema = new Schema(
  { base: { type: Number, required: true, min: 0 }, perKm: { type: Number, required: true, min: 0 } },
  { _id: false },
);

export interface CategoryPricing {
  base: number;
  perKm: number;
}

export interface SystemConfigData {
  fare: {
    roadFactor: number;
    roundTo: number;
    categories: Record<'economy' | 'comfort' | 'luxury' | 'van', CategoryPricing>;
  };
  matching: {
    requestTtlMs: number;
    maxTargets: number;
  };
  tracking: {
    pingIntervalMs: number;
    staleAfterMs: number;
  };
  sos: {
    emergencyPhone: string;
  };
  notifications: {
    pushEnabled: boolean;
  };
  payLater: {
    minCompletedRides: number;
    maxOutstandingBalance: number;
    maxOutstandingRides: number;
    dueDays: number;
    blockRidesWhenOverdue: boolean;
  };
  business: {
    commissionRate: number;
    currency: string;
    supportPhone: string;
  };
}

const systemConfigSchema = new Schema(
  {
    key: { type: String, default: 'default', unique: true },
    fare: {
      roadFactor: { type: Number, default: 1.25, min: 1, max: 3 },
      roundTo: { type: Number, default: 500, min: 1, max: 100000 },
      categories: {
        economy: { type: pricingSchema, default: () => ({ base: 5000, perKm: 2500 }) },
        comfort: { type: pricingSchema, default: () => ({ base: 7000, perKm: 3000 }) },
        luxury: { type: pricingSchema, default: () => ({ base: 10000, perKm: 4000 }) },
        van: { type: pricingSchema, default: () => ({ base: 8000, perKm: 3000 }) },
      },
    },
    matching: {
      requestTtlMs: { type: Number, default: 60000, min: 5000, max: 600000 },
      maxTargets: { type: Number, default: 10, min: 1, max: 50 },
    },
    tracking: {
      pingIntervalMs: { type: Number, default: 5000, min: 1000, max: 60000 },
      staleAfterMs: { type: Number, default: 30000, min: 5000, max: 600000 },
    },
    sos: {
      emergencyPhone: { type: String, default: '+963944444444', trim: true },
    },
    notifications: {
      pushEnabled: { type: Boolean, default: true },
    },
    payLater: {
      minCompletedRides: { type: Number, default: 3, min: 0, max: 100 },
      maxOutstandingBalance: { type: Number, default: 100000, min: 0 },
      maxOutstandingRides: { type: Number, default: 3, min: 1, max: 50 },
      dueDays: { type: Number, default: 7, min: 1, max: 365 },
      blockRidesWhenOverdue: { type: Boolean, default: true },
    },
    business: {
      commissionRate: { type: Number, default: 0.15, min: 0, max: 1 },
      currency: { type: String, default: 'SYP', trim: true, uppercase: true },
      supportPhone: { type: String, default: '+963944444444', trim: true },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);
