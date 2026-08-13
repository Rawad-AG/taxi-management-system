import { z } from 'zod';
import mongoose from 'mongoose';
import { normalizePhone, SYRIAN_PHONE_REGEX } from '../utils/phone.js';

export const phoneSchema = z
  .string({ required_error: 'Phone is required' })
  .transform((v) => normalizePhone(v))
  .refine((v) => SYRIAN_PHONE_REGEX.test(v), {
    message: 'Phone must be a valid Syrian number: +963 9xx xxx xxx',
  });

export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(6, 'Password must be at least 6 characters');

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');

export const registerCustomerSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(50),
    lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').max(50),
    phone: phoneSchema,
    password: passwordSchema,
  }),
});

export const registerDriverSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(3, 'Full name must be at least 3 characters').max(100),
    fatherName: z.string().trim().min(2, 'Father name must be at least 2 characters').max(50),
    phone: phoneSchema,
    password: passwordSchema,
    nationalId: z
      .string()
      .trim()
      .regex(/^\d{8,11}$/, 'National id must be 8-11 digits'),
    licenseNumber: z.string().trim().min(4, 'License number is required').max(30),
    licenseExpiry: z.coerce.date().refine((d) => d > new Date(), 'License must not be expired'),
    workingCity: objectId,
    workingAreas: z.array(objectId).min(1, 'Choose at least one working area'),
    car: z.object({
      make: objectId,
      model: objectId,
      year: z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1),
      color: z.string().trim().min(2).max(30),
      plateNumber: z.string().trim().min(3).max(10).transform((v) => v.toUpperCase()),
      seats: z.coerce.number().int().min(2).max(30).default(4),
      category: z.enum(['economy', 'comfort', 'luxury', 'van']).default('economy'),
    }),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    password: z.string().min(1, 'Password is required'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({ phone: phoneSchema }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
    newPassword: passwordSchema,
  }),
});
