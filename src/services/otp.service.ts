import { createHash } from 'node:crypto';
import type { HydratedDocument } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { messageService, generateVerificationCode } from './message.service.js';
import { formatSyrianPhone } from '../utils/phone.js';
import type { UserDoc } from '../models/User.js';

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export type OtpKind = 'login' | 'pendingPhone';

export type OtpDoc = HydratedDocument<UserDoc> & {
  otpCodeHash?: string | null;
  otpExpires?: Date | null;
  otpAttempts?: number | null;
  pendingPhoneCodeHash?: string | null;
  pendingPhoneExpires?: Date | null;
  pendingPhoneAttempts?: number | null;
};

const OTP_FIELDS: Record<OtpKind, { hash: keyof OtpDoc; expires: keyof OtpDoc; attempts: keyof OtpDoc }> = {
  login: { hash: 'otpCodeHash', expires: 'otpExpires', attempts: 'otpAttempts' },
  pendingPhone: { hash: 'pendingPhoneCodeHash', expires: 'pendingPhoneExpires', attempts: 'pendingPhoneAttempts' },
};

export async function createOtpChallenge(user: OtpDoc, kind: OtpKind = 'login') {
  const code = generateVerificationCode();
  const fields = OTP_FIELDS[kind];
  const doc = user as unknown as Record<string, unknown>;
  doc[fields.hash] = createHash('sha256').update(code).digest('hex');
  doc[fields.expires] = new Date(Date.now() + OTP_TTL_MS);
  doc[fields.attempts] = 0;
  await user.save();

  const channel = user.role === 'driver' ? 'sms' : 'whatsapp';
  messageService.sendOtp(formatSyrianPhone(user.phone), code, channel);
  return { channel, code };
}

export function verifyOtpCode(user: OtpDoc, kind: OtpKind, code: string) {
  const fields = OTP_FIELDS[kind];
  const doc = user as unknown as Record<string, unknown>;
  const hash = doc[fields.hash] as string | undefined;
  const expires = doc[fields.expires] as Date | undefined;
  const attempts = (doc[fields.attempts] as number | undefined) ?? 0;

  if (!hash || !expires) {
    throw ApiError.badRequest('No verification code was requested');
  }
  if (expires.getTime() < Date.now()) {
    doc[fields.hash] = undefined;
    doc[fields.expires] = undefined;
    doc[fields.attempts] = 0;
    void user.save();
    throw ApiError.badRequest('The verification code has expired. Please request a new one.');
  }
  if (attempts >= OTP_MAX_ATTEMPTS) {
    throw ApiError.tooManyRequests('Too many failed attempts. Please request a new code.');
  }

  const codeHash = createHash('sha256').update(code).digest('hex');
  if (hash !== codeHash) {
    doc[fields.attempts] = attempts + 1;
    void user.save();
    throw ApiError.badRequest(`Invalid code. ${OTP_MAX_ATTEMPTS - attempts - 1} attempts remaining.`);
  }

  doc[fields.hash] = undefined;
  doc[fields.expires] = undefined;
  doc[fields.attempts] = 0;
}
