import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { AuthedRequest } from '../middleware/auth.js';

const userId = (req: unknown) => (req as AuthedRequest).userId;

function dto(n: Record<string, any>) {
  return {
    id: String(n._id),
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    data: n.data ?? null,
    read: n.read,
    createdAt: n.createdAt,
  };
}

export const listNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const skip = Math.max(Number(req.query.skip) || 0, 0);
  const unreadOnly = req.query.unread === 'true';

  const filter: Record<string, unknown> = { user: userId(req) };
  if (unreadOnly) filter.read = false;

  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId(req), read: false }),
  ]);

  res.json({ notifications: items.map(dto), total, unread });
});

export const unreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ user: userId(req), read: false });
  res.json({ unread: count });
});

export const markRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await Notification.updateOne({ _id: id, user: userId(req) }, { $set: { read: true } });
  res.json({ ok: true });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: userId(req), read: false }, { $set: { read: true } });
  res.json({ ok: true });
});

const MAX_DEVICE_TOKENS = 5;

export const registerDeviceToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string' || token.length < 20 || token.length > 512) {
    res.status(400).json({ error: 'Invalid push token' });
    return;
  }
  const id = userId(req);
  await User.updateOne({ _id: id }, { $addToSet: { deviceTokens: token } });
  await User.updateOne({ _id: id }, { $push: { deviceTokens: { $each: [], $slice: -MAX_DEVICE_TOKENS } } });
  const user = await User.findById(id).select('deviceTokens');
  res.json({ registered: true, count: user?.deviceTokens?.length ?? 0 });
});

export const removeDeviceToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Invalid push token' });
    return;
  }
  await User.updateOne({ _id: userId(req) }, { $pull: { deviceTokens: token } });
  res.json({ ok: true });
});
