import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as driver from '../controllers/driver.controller.js';
import { togglePresenceSchema } from '../schemas/presence.schema.js';
import { driverActionSchema } from '../schemas/driverRide.schema.js';

const router = Router();

router.use(authenticate, requireRole('driver'));

router.post('/presence', validate(togglePresenceSchema), driver.togglePresence);
router.get('/presence', driver.getPresence);
router.get('/stats', driver.driverStats);
router.get('/rides/current', driver.currentRide);
router.post('/rides/:id/:action', validate(driverActionSchema), driver.driverRideAction);

export default router;
