import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import type { Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import { env } from '../config/env.js';
import { User, type UserDoc } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { verifyRefreshToken } from '../utils/jwt.js';
import { issueTokens, revokeRefreshToken } from '../utils/token.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateVerificationCode, messageService } from '../services/message.service.js';
import { createOtpChallenge, OTP_TTL_MS, verifyOtpCode } from '../services/otp.service.js';
import { formatSyrianPhone } from '../utils/phone.js';
import type { UserRole } from '../utils/auth.types.js';

const PASSWORD_ROUNDS = 10;
const RESET_CODE_TTL_MS = 15 * 60 * 1000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

async function issueTokensRes(res: Response, userId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.unauthorized();
  return issueTokens(res, userId, user.role as UserRole);
}

export function toUserResponse(user: HydratedDocument<UserDoc>) {
  const doc = user.toObject();
  return {
    id: String(doc._id),
    role: doc.role,
    phone: doc.phone,
    status: doc.status,
    firstName: doc.firstName,
    lastName: doc.lastName,
    avatar: doc.avatar ?? null,
    twoFactorEnabled: doc.twoFactorEnabled ?? false,
    savedPlaces: doc.savedPlaces ?? [],
    savedRoutes: doc.savedRoutes ?? [],
    bucketBalance: doc.bucketBalance ?? 0,
    driverProfile: doc.driverProfile ?? null,
    createdAt: doc.createdAt,
  };
}

export const registerCustomer = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, password } = req.body;

  const existing = await User.findOne({ phone });
  if (existing) throw new ApiError(409, 'PHONE_ALREADY_REGISTERED', 'This phone number is already registered');

  const user = await User.create({
    role: 'customer',
    firstName,
    lastName,
    phone,
    password: await bcrypt.hash(password, PASSWORD_ROUNDS),
    status: 'active',
  });

  const { channel, code } = await createOtpChallenge(user);
  res.status(201).json({
    requiresOtp: true,
    otpChannel: channel,
    phone: user.phone,
    expiresIn: OTP_TTL_MS / 1000,
    ...(env.isProd ? {} : { devOtp: code }),
  });
});

export const registerDriver = asyncHandler(async (req, res) => {
  const { fullName, fatherName, phone, password, nationalId, licenseNumber, licenseExpiry, workingCity, workingAreas, car } = req.body;

  const existing = await User.findOne({ phone });
  if (existing) throw new ApiError(409, 'PHONE_ALREADY_REGISTERED', 'This phone number is already registered');

  const user = await User.create({
    role: 'driver',
    phone,
    password: await bcrypt.hash(password, PASSWORD_ROUNDS),
    status: 'pending',
    driverProfile: {
      fullName,
      fatherName,
      nationalId,
      licenseNumber,
      licenseExpiry,
      workingCity,
      workingAreas,
      car,
    },
  });

  const accessToken = await issueTokensRes(res, String(user._id));

  res.status(201).json({
    user: toUserResponse(user),
    accessToken,
    message: 'Driver account created and waiting for admin approval',
  });
});

export const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  const user = await User.findOne({ phone }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid phone or password');
  }
  if (user.status === 'suspended') {
    throw ApiError.forbidden('Your account is suspended. Contact support.');
  }
  if (user.status === 'pending') {
    throw ApiError.forbidden('Your driver account is waiting for admin approval');
  }

  if (user.twoFactorEnabled) {
    const { channel, code } = await createOtpChallenge(user);
    res.json({
      requiresOtp: true,
      otpChannel: channel,
      phone: user.phone,
      expiresIn: OTP_TTL_MS / 1000,
      ...(env.isProd ? {} : { devOtp: code }),
    });
    return;
  }

  const accessToken = await issueTokensRes(res, String(user._id));
  res.json({ user: toUserResponse(user), accessToken });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, code } = req.body;

  const user = await User.findOne({ phone }).select('+otpCodeHash +otpExpires +otpAttempts');
  if (!user) throw new ApiError(401, 'INVALID_OTP', 'Invalid phone or code');

  verifyOtpCode(user, 'login', code);
  await user.save();

  const accessToken = await issueTokensRes(res, String(user._id));
  res.json({ user: toUserResponse(user), accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.cookieName];
  if (!token) throw ApiError.unauthorized('No refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const stored = await RefreshToken.findOne({ tokenHash: hashToken(token), revokedAt: null });
  if (!stored || stored.user.toString() !== payload.sub) {
    throw ApiError.unauthorized('Refresh token has been revoked');
  }

  await revokeRefreshToken(token);
  const accessToken = await issueTokensRes(res, payload.sub);
  res.json({ accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.cookieName];
  if (token) await revokeRefreshToken(token);
  res.clearCookie(env.cookieName, { path: '/api/auth' });
  res.status(204).end();
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone });
  if (!user) {
    res.json({ message: 'If this phone is registered, a reset code has been sent' });
    return;
  }

  const code = generateVerificationCode();
  user.passwordResetCode = createHash('sha256').update(code).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + RESET_CODE_TTL_MS);
  await user.save();

  messageService.sendVerificationCode(formatSyrianPhone(phone), code);
  res.json({ message: 'If this phone is registered, a reset code has been sent' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { phone, code, newPassword } = req.body;

  const user = await User.findOne({ phone }).select('+passwordResetCode +passwordResetExpires');
  if (!user || !user.passwordResetCode || !user.passwordResetExpires) {
    throw ApiError.badRequest('No reset request found for this phone');
  }

  const codeHash = createHash('sha256').update(code).digest('hex');
  const match = user.passwordResetCode === codeHash;
  const expired = user.passwordResetExpires.getTime() < Date.now();
  if (!match || expired) {
    throw ApiError.badRequest('Invalid or expired reset code');
  }

  user.password = await bcrypt.hash(newPassword, PASSWORD_ROUNDS);
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
  res.json({ message: 'Password reset successfully. You can now log in.' });
});

import type { AuthedRequest } from '../middleware/auth.js';

export const me = asyncHandler(async (req, res) => {
  const { userId } = req as AuthedRequest;
  const user = await User.findById(userId).populate([
    { path: 'driverProfile.workingCity' },
    { path: 'driverProfile.workingAreas' },
    { path: 'driverProfile.car.make' },
    { path: 'driverProfile.car.model' },
  ]);
  if (!user) throw ApiError.notFound('User not found');
  res.json({ user: toUserResponse(user) });
});
