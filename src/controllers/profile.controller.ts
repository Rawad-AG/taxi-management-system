import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createOtpChallenge, verifyOtpCode } from '../services/otp.service.js';
import { toUserResponse } from './auth.controller.js';
import { issueTokens } from '../utils/token.service.js';
import { formatSyrianPhone } from '../utils/phone.js';
import type { AuthedRequest } from '../middleware/auth.js';
import type { UserRole } from '../utils/auth.types.js';

const userId = (req: unknown) => (req as AuthedRequest).userId;

const loadUser = (req: unknown) =>
  User.findById(userId(req)).select('+pendingPhone +pendingPhoneCodeHash +pendingPhoneExpires +pendingPhoneAttempts +otpCodeHash +otpExpires +otpAttempts');

export const getProfile = asyncHandler(async (req, res) => {
  const user = await loadUser(req);
  if (!user) throw ApiError.unauthorized();
  res.json({ user: toUserResponse(user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, avatar } = req.body;
  const user = await loadUser(req);
  if (!user) throw ApiError.unauthorized();

  if (firstName !== undefined) {
    if (user.role === 'driver' && user.driverProfile) user.driverProfile.fullName = firstName;
    else user.firstName = firstName;
  }
  if (lastName !== undefined && user.role !== 'driver') user.lastName = lastName;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();
  res.json({ user: toUserResponse(user) });
});

export const requestChangePhone = asyncHandler(async (req, res) => {
  const { newPhone } = req.body;
  const user = await loadUser(req);
  if (!user) throw ApiError.unauthorized();

  const normalized = formatSyrianPhone(newPhone);
  if (normalized === user.phone) throw ApiError.badRequest('The new number is the same as your current number');

  const taken = await User.findOne({ phone: normalized });
  if (taken) throw ApiError.conflict('This phone number is already registered');

  user.pendingPhone = normalized;
  user.pendingPhoneCodeHash = undefined;
  user.pendingPhoneExpires = undefined;
  user.pendingPhoneAttempts = 0;
  await user.save();

  const { channel, code } = await createOtpChallenge(user, 'pendingPhone');
  res.json({ requiresOtp: true, otpChannel: channel, phone: normalized, expiresIn: 300, ...(process.env.NODE_ENV === 'production' ? {} : { devOtp: code }) });
});

export const verifyChangePhone = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const user = await loadUser(req);
  if (!user) throw ApiError.unauthorized();
  if (!user.pendingPhone) throw ApiError.badRequest('Request a number change first');

  verifyOtpCode(user, 'pendingPhone', code);

  user.phone = user.pendingPhone;
  user.pendingPhone = undefined;
  await user.save();

  const accessToken = await issueTokens(res, String(user._id), user.role as UserRole);
  res.json({ user: toUserResponse(user), accessToken });
});

export const addPlace = asyncHandler(async (req, res) => {
  const { name, label, lat, lng } = req.body;
  const user = await loadUser(req);
  if (!user) throw ApiError.unauthorized();

  user.savedPlaces.push({ name, label, lat, lng });
  await user.save();
  res.status(201).json({ user: toUserResponse(user) });
});

export const updatePlace = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, label, lat, lng } = req.body;
  const user = await loadUser(req);
  if (!user) throw ApiError.unauthorized();

  const place = user.savedPlaces.id(id);
  if (!place) throw ApiError.notFound('Saved place not found');

  if (name !== undefined) place.name = name;
  if (label !== undefined) place.label = label;
  if (lat !== undefined) place.lat = lat;
  if (lng !== undefined) place.lng = lng;
  await user.save();
  res.json({ user: toUserResponse(user) });
});

export const deletePlace = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await loadUser(req);
  if (!user) throw ApiError.unauthorized();

  const place = user.savedPlaces.id(id);
  if (!place) throw ApiError.notFound('Saved place not found');

  place.deleteOne();
  await user.save();
  res.json({ user: toUserResponse(user) });
});

export const addRoute = asyncHandler(async (req, res) => {
  const { name, pickup, dropoff } = req.body;
  const user = await loadUser(req);
  if (!user) throw ApiError.unauthorized();

  user.savedRoutes.push({ name, pickup, dropoff });
  await user.save();
  res.status(201).json({ user: toUserResponse(user) });
});

export const updateRoute = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, pickup, dropoff } = req.body;
  const user = await loadUser(req);
  if (!user) throw ApiError.unauthorized();

  const route = user.savedRoutes.id(id);
  if (!route) throw ApiError.notFound('Saved route not found');

  if (name !== undefined) route.name = name;
  if (pickup !== undefined) route.pickup = pickup;
  if (dropoff !== undefined) route.dropoff = dropoff;
  await user.save();
  res.json({ user: toUserResponse(user) });
});

export const deleteRoute = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await loadUser(req);
  if (!user) throw ApiError.unauthorized();

  const route = user.savedRoutes.id(id);
  if (!route) throw ApiError.notFound('Saved route not found');

  route.deleteOne();
  await user.save();
  res.json({ user: toUserResponse(user) });
});

export const requestTwoFactor = asyncHandler(async (req, res) => {
  const user = await loadUser(req);
  if (!user) throw ApiError.unauthorized();

  const { channel, code } = await createOtpChallenge(user, 'login');
  res.json({ requiresOtp: true, otpChannel: channel, phone: user.phone, expiresIn: 300, ...(process.env.NODE_ENV === 'production' ? {} : { devOtp: code }) });
});

export const confirmTwoFactor = asyncHandler(async (req, res) => {
  const { enabled, code } = req.body;
  const user = await loadUser(req);
  if (!user) throw ApiError.unauthorized();

  verifyOtpCode(user, 'login', code);
  user.twoFactorEnabled = enabled;
  await user.save();

  res.json({ user: toUserResponse(user) });
});
