import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ride from '../controllers/ride.controller.js';
import { cancelRideSchema, createRideSchema, estimateSchema, rateRideSchema } from '../schemas/ride.schema.js';

const router = Router();

router.post('/estimate', authenticate, requireRole('customer'), validate(estimateSchema), ride.estimate);
router.post('/', authenticate, requireRole('customer'), validate(createRideSchema), ride.createRide);
router.get('/history', authenticate, ride.history);
router.get('/:id/location', authenticate, ride.getRideLocation);
router.get('/:id', authenticate, ride.getRide);
router.post('/:id/rate', authenticate, validate(rateRideSchema), ride.rateRide);
router.post('/:id/cancel', authenticate, validate(cancelRideSchema), ride.cancelRide);

export default router;
