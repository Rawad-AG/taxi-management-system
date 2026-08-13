import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as sos from '../controllers/sos.controller.js';
import { createSosSchema, resolveSosSchema } from '../schemas/sos.schema.js';

const router = Router();

router.post('/', authenticate, validate(createSosSchema), sos.createSOS);
router.get('/mine', authenticate, sos.mySOS);
router.get('/admin', authenticate, requireRole('admin'), sos.listSOS);
router.post('/admin/:id/resolve', authenticate, requireRole('admin'), validate(resolveSosSchema), sos.resolveSOS);

export default router;
