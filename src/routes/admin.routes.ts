import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as admin from '../controllers/admin.controller.js';
import * as adminPayments from '../controllers/adminPayments.controller.js';
import { adjustBucketSchema, settleDebtSchema } from '../schemas/payment.schema.js';
import {
  adminCancelRideSchema,
  broadcastSchema,
  driverDecisionSchema,
  listQuerySchema,
  reportQuerySchema,
  ridesQuerySchema,
  systemConfigUpdateSchema,
} from '../schemas/admin.schema.js';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/overview', admin.overview);
router.get('/users', validate(listQuerySchema), admin.listUsers);
router.post('/users/:id/driver-decision', validate(driverDecisionSchema), admin.decideDriver);
router.get('/rides', validate(ridesQuerySchema), admin.listRides);
router.post('/rides/:id/cancel', validate(adminCancelRideSchema), admin.adminCancelRide);
router.get('/reports/financial', validate(reportQuerySchema), admin.financialReport);
router.get('/reports/performance', validate(reportQuerySchema), admin.performanceReport);
router.get('/config', admin.getSystemConfig);
router.put('/config', validate(systemConfigUpdateSchema), admin.saveSystemConfig);
router.post('/notifications', validate(broadcastSchema), admin.broadcastNotification);
router.get('/notifications/history', admin.broadcastHistory);
router.get('/debts', adminPayments.listDebts);
router.post('/debts/:id/settle', validate(settleDebtSchema), adminPayments.settleDebt);
router.post('/debts/:id/waive', validate(settleDebtSchema), adminPayments.waiveDebt);
router.post('/bucket/adjust', validate(adjustBucketSchema), adminPayments.adjustBucket);
router.get('/bucket/transactions', adminPayments.bucketOverview);

export default router;
