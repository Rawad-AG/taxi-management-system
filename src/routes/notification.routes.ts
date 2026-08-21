import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as notification from '../controllers/notification.controller.js';

const router = Router();

router.use(authenticate);
router.post('/device-token', notification.registerDeviceToken);
router.post('/device-token/remove', notification.removeDeviceToken);
router.get('/', notification.listNotifications);
router.get('/unread-count', notification.unreadCount);
router.post('/:id/read', notification.markRead);
router.post('/read-all', notification.markAllRead);

export default router;
