import jwt, { type SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';
import type { AccessTokenPayload, RefreshTokenPayload, UserRole } from './auth.types.js';

export function signAccessToken(userId: string, role: UserRole) {
  return jwt.sign({ sub: userId, role } satisfies AccessTokenPayload, env.accessTokenSecret, {
    expiresIn: env.accessTokenTtl as SignOptions['expiresIn'],
  });
}

export function signRefreshToken(userId: string) {
  const jti = randomUUID();
  const token = jwt.sign({ sub: userId, jti } satisfies RefreshTokenPayload, env.refreshTokenSecret, {
    expiresIn: `${env.refreshTokenTtlDays}d` as SignOptions['expiresIn'],
  });
  return { token, jti };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.accessTokenSecret) as AccessTokenPayload;
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.refreshTokenSecret) as RefreshTokenPayload;
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
}
