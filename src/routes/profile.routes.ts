import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as profile from '../controllers/profile.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import {
  changePhoneRequestSchema,
  changePhoneVerifySchema,
  placeParamsSchema,
  placeSchema,
  savedRouteParamsSchema,
  savedRouteSchema,
  twoFactorConfirmSchema,
  updateProfileSchema,
} from '../schemas/profile.schema.js';

const router = Router();

const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true });

router.use(authenticate);

router.get('/', profile.getProfile);
router.put('/', validate(updateProfileSchema), profile.updateProfile);

router.post('/change-phone', otpLimiter, validate(changePhoneRequestSchema), profile.requestChangePhone);
router.post('/change-phone/verify', otpLimiter, validate(changePhoneVerifySchema), profile.verifyChangePhone);

router.post('/places', validate(placeSchema), profile.addPlace);
router.put('/places/:id', validate(placeSchema.merge(placeParamsSchema)), profile.updatePlace);
router.delete('/places/:id', validate(placeParamsSchema), profile.deletePlace);

router.post('/routes', validate(savedRouteSchema), profile.addRoute);
router.put('/routes/:id', validate(savedRouteSchema.merge(savedRouteParamsSchema)), profile.updateRoute);
router.delete('/routes/:id', validate(savedRouteParamsSchema), profile.deleteRoute);

router.post('/two-factor/request', otpLimiter, profile.requestTwoFactor);
router.post('/two-factor/confirm', validate(twoFactorConfirmSchema), profile.confirmTwoFactor);

export default router;
