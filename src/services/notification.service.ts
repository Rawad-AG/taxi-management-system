import { Notification } from '../models/Notification.js';
import { io } from '../socket/setup.js';
import { SOCKET_EVENTS, userRoom } from '../socket/events.js';
import { sendPush } from './push.service.js';

const DEDUPE_WINDOW_MS = 60_000;
const dedupeKeys = new Map<string, number>();

export interface NotificationInput {
  type?: 'ride' | 'sos' | 'payment' | 'payLater' | 'account' | 'admin' | 'system';
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

export async function createNotification(userId: string, input: NotificationInput) {
  const key = `${userId}:${input.type ?? 'system'}:${input.title}`;
  const now = Date.now();
  const last = dedupeKeys.get(key);
  if (last && now - last < DEDUPE_WINDOW_MS) return null;
  dedupeKeys.set(key, now);
  if (dedupeKeys.size > 1000) dedupeKeys.clear();

  try {
    const doc = await Notification.create({ user: userId, ...input });
    io.to(userRoom(userId)).emit(SOCKET_EVENTS.notificationNew, {
      id: String(doc._id),
      type: doc.type,
      title: doc.title,
      body: doc.body,
      data: doc.data ?? null,
      read: false,
      createdAt: doc.createdAt,
    });
    void sendPush(userId, {
      title: doc.title,
      body: doc.body ?? undefined,
      data: doc.data ?? undefined,
    }).catch((err) => console.error('[notifications] push failed', err));
    return doc;
  } catch (err) {
    console.error('[notifications] failed to persist', err);
    return null;
  }
}
