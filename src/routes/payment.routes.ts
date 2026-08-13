import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as payment from '../controllers/payment.controller.js';
import { depositSchema, payDebtSchema } from '../schemas/payment.schema.js';

const router = Router();

router.get('/status', authenticate, requireRole('customer'), payment.status);
router.get('/debts', authenticate, requireRole('customer'), payment.debts);
router.post('/debts/:id/pay', authenticate, requireRole('customer'), validate(payDebtSchema), payment.payDebt);
router.post('/bucket/deposit', authenticate, requireRole('customer'), validate(depositSchema), payment.deposit);
router.get('/bucket/history', authenticate, requireRole('customer'), payment.bucketHistory);

export default router;
