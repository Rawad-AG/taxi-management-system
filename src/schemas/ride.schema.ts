import { z } from 'zod';
import mongoose from 'mongoose';

export const pointSchema = z.object({
  label: z.string().trim().max(120).optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const categorySchema = z.enum(['economy', 'comfort', 'luxury', 'van']);

export const estimateSchema = z.object({
  body: z.object({
    pickup: pointSchema,
    dropoff: pointSchema,
    category: categorySchema.default('economy'),
  }),
});

export const createRideSchema = z.object({
  body: z.object({
    city: z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid city'),
    category: categorySchema.default('economy'),
    paymentMethod: z.enum(['cash', 'bucket', 'pay_later']).default('cash'),
    pickup: pointSchema,
    dropoff: pointSchema,
  }),
});

export const cancelRideSchema = z.object({
  body: z.object({
    reason: z.string().trim().max(200).optional(),
  }),
});

export const rateRideSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(300).optional(),
  }),
});
