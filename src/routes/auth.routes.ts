import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import * as auth from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import {
  registerCustomerSchema,
  registerDriverSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/auth.schema.js';

const router = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: env.isProd ? 30 : 600, standardHeaders: true });
const forgotLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true });

router.post('/register/customer', validate(registerCustomerSchema), auth.registerCustomer);
router.post('/register/driver', validate(registerDriverSchema), auth.registerDriver);
router.post('/login', loginLimiter, validate(loginSchema), auth.login);
router.post('/verify-otp', loginLimiter, validate(verifyOtpSchema), auth.verifyOtp);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.post('/forgot-password', forgotLimiter, validate(forgotPasswordSchema), auth.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), auth.resetPassword);
router.get('/me', authenticate, auth.me);

export default router;
