import { z } from 'zod';
import mongoose from 'mongoose';

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');

const categorySchema = z.enum(['economy', 'comfort', 'luxury', 'van']);

const pricingSchema = z.object({
  base: z.coerce.number().min(0),
  perKm: z.coerce.number().min(0),
});

export const systemConfigUpdateSchema = z.object({
  body: z.object({
    fare: z.object({
      roadFactor: z.coerce.number().min(1).max(3),
      roundTo: z.coerce.number().int().min(1).max(100000),
      categories: z.object({
        economy: pricingSchema,
        comfort: pricingSchema,
        luxury: pricingSchema,
        van: pricingSchema,
      }),
    }),
    matching: z.object({
      requestTtlMs: z.coerce.number().int().min(5000).max(600000),
      maxTargets: z.coerce.number().int().min(1).max(50),
    }),
    tracking: z.object({
      pingIntervalMs: z.coerce.number().int().min(1000).max(60000),
      staleAfterMs: z.coerce.number().int().min(5000).max(600000),
    }),
    sos: z.object({
      emergencyPhone: z.string().trim().min(3).max(30),
    }),
    notifications: z.object({
      pushEnabled: z.coerce.boolean(),
    }),
    payLater: z.object({
      minCompletedRides: z.coerce.number().int().min(0).max(100),
      maxOutstandingBalance: z.coerce.number().min(0),
      maxOutstandingRides: z.coerce.number().int().min(1).max(50),
      dueDays: z.coerce.number().int().min(1).max(365),
      blockRidesWhenOverdue: z.coerce.boolean(),
    }),
    business: z.object({
      commissionRate: z.coerce.number().min(0).max(1),
      currency: z.string().trim().min(1).max(10),
      supportPhone: z.string().trim().min(3).max(30),
    }),
  }),
});

export const driverDecisionSchema = z.object({
  body: z.object({
    approve: z.boolean(),
    note: z.string().trim().max(200).optional(),
  }),
  params: z.object({
    id: objectId,
  }),
});

export const adminCancelRideSchema = z.object({
  body: z.object({
    reason: z.string().trim().max(200).optional(),
  }),
  params: z.object({
    id: objectId,
  }),
});

export const listQuerySchema = z.object({
  query: z.object({
    role: z.enum(['customer', 'driver', 'admin']).optional(),
    status: z.enum(['active', 'pending', 'suspended']).optional(),
    q: z.string().trim().max(60).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  }),
});

export const ridesQuerySchema = z.object({
  query: z.object({
    status: z.enum(['requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled']).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    q: z.string().trim().max(60).optional(),
  }),
});

export const reportQuerySchema = z.object({
  query: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
});

export const broadcastSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().max(500).optional(),
    audience: z.enum(['all', 'customers', 'drivers']).default('all'),
  }),
});

export { categorySchema };
