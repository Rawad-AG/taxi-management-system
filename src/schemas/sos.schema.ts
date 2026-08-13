import { z } from 'zod';
import mongoose from 'mongoose';

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');

export const createSosSchema = z.object({
  body: z.object({
    rideId: objectId.optional(),
    reason: z.enum(['safety', 'accident', 'medical', 'harassment', 'other']),
    note: z.string().trim().max(300).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    accuracy: z.coerce.number().min(0).optional(),
  }),
});

export const resolveSosSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    note: z.string().trim().max(300).optional(),
  }),
});
