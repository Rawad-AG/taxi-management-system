import { createHash } from 'node:crypto';
import type { Response } from 'express';
import { env } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { signAccessToken, signRefreshToken } from './jwt.js';
import { ApiError } from '../utils/ApiError.js';
import type { UserRole } from '../utils/auth.types.js';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

function setRefreshCookie(res: Response, token: string) {
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    path: '/api/auth',
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
}

export async function issueTokens(res: Response, userId: string, role: UserRole) {
  const { token, jti } = signRefreshToken(userId);
  await RefreshToken.create({
    user: userId,
    tokenHash: hashToken(token),
    jti,
    expiresAt: new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
  });
  setRefreshCookie(res, token);
  return signAccessToken(userId, role);
}

export function revokeRefreshToken(token: string) {
  return RefreshToken.findOneAndUpdate(
    { tokenHash: hashToken(token), revokedAt: null },
    { revokedAt: new Date() },
  );
}
