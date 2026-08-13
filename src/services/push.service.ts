import { env } from '../config/env.js';
import { getConfig } from './config.service.js';
import { User } from '../models/User.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const RETRYABLE = new Set(['InternalServerError', 'DeviceNotRegistered', 'MessageTooBig', 'MessageRateExceeded']);

interface PushMessage {
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

async function expoSend(messages: { to: string; title: string; body?: string; data?: Record<string, unknown> }[]): Promise<void> {
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    console.error(`[push] Expo API HTTP ${res.status}: ${await res.text()}`);
    return;
  }
  const results = (await res.json()) as { status: string; message?: string; details?: string; receiptId?: string }[];
  const retry: typeof messages = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'ok') continue;
    if (r.details === 'DeviceNotRegistered') {
      await User.updateOne(
        { deviceTokens: messages[i].to },
        { $pull: { deviceTokens: messages[i].to } },
      ).catch(() => undefined);
      console.warn(`[push] removed unregistered device token`);
      continue;
    }
    if (RETRYABLE.has(r.details ?? '') && r.receiptId) retry.push(messages[i]);
    console.error(`[push] send failed for token ${messages[i].to.slice(0, 20)}…: ${r.message ?? r.details ?? 'unknown'}`);
  }
  if (retry.length) {
    try {
      await expoSend(retry);
    } catch (err) {
      console.error('[push] retry failed', err);
    }
  }
}

export async function sendPush(userId: string, msg: PushMessage): Promise<void> {
  try {
    const cfg = getConfig();
    if (cfg.notifications && cfg.notifications.pushEnabled === false) return;
    const user = await User.findById(userId).select('deviceTokens');
    const tokens = (user?.deviceTokens ?? []).slice(0, 5);
    if (!tokens.length) return;
    const messages = tokens.map((to) => ({ to, title: msg.title, body: msg.body, data: msg.data }));
    if (env.nodeEnv === 'production') {
      await expoSend(messages);
      return;
    }
    console.log(`\n--- [dev-push] user=${userId} tokens=${tokens.length} ---`);
    for (const m of messages) {
      console.log(`to: ${m.to}`);
      console.log(`title: ${m.title}`);
      if (m.body) console.log(`body: ${m.body}`);
      if (m.data) console.log(`data: ${JSON.stringify(m.data)}`);
    }
    console.log('----------------------------------------\n');
  } catch (err) {
    console.error('[push] failed', err);
  }
}
