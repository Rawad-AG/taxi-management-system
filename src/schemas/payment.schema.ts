import { z } from 'zod';
import mongoose from 'mongoose';

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');

export const depositSchema = z.object({
  body: z.object({
    amount: z.coerce.number().positive().max(10_000_000),
  }),
});

export const payDebtSchema = z.object({
  params: z.object({ id: objectId }),
});

export const adjustBucketSchema = z.object({
  body: z.object({
    userId: objectId,
    amount: z.coerce.number().min(-10_000_000).max(10_000_000).refine((v) => v !== 0, 'Amount must not be zero'),
    note: z.string().trim().max(300).optional(),
  }),
});

export const settleDebtSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    note: z.string().trim().max(300).optional(),
  }),
});
