import { z } from 'zod';
import mongoose from 'mongoose';

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');

const pointSchema = z.object({
  label: z.string().trim().max(120).optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(2).max(50).optional(),
    lastName: z.string().trim().min(2).max(50).optional(),
    avatar: z.string().startsWith('data:image/').max(4_000_000).nullable().optional(),
  }),
});

export const changePhoneRequestSchema = z.object({
  body: z.object({
    newPhone: z.string().regex(/^\+9639\d{8}$/, 'Invalid phone number'),
  }),
});

export const changePhoneVerifySchema = z.object({
  body: z.object({
    code: z.string().regex(/^\d{6}$/, 'Invalid code'),
  }),
});

export const placeSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(60),
    label: z.string().trim().max(120).optional(),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  }),
});

export const placeParamsSchema = z.object({
  params: z.object({ id: objectId }),
});

export const savedRouteSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(60),
    pickup: pointSchema,
    dropoff: pointSchema,
  }),
});

export const savedRouteParamsSchema = z.object({
  params: z.object({ id: objectId }),
});

export const twoFactorRequestSchema = z.object({ body: z.object({}) });

export const twoFactorConfirmSchema = z.object({
  body: z.object({
    enabled: z.boolean(),
    code: z.string().regex(/^\d{6}$/, 'Invalid code'),
  }),
});
