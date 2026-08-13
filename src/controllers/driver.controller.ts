import { User } from '../models/User.js';
import { DriverPresence } from '../models/DriverPresence.js';
import { Ride, type RideStatus } from '../models/Ride.js';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { io } from '../socket/setup.js';
import { SOCKET_EVENTS, userRoom } from '../socket/events.js';
import { toRideDTO, refId } from '../services/rideFlow.service.js';
import { settleRidePayment } from '../services/payment.service.js';
import { clearRideRequestTimer } from '../services/matching.service.js';
import { createNotification } from '../services/notification.service.js';
import type { AuthedRequest } from '../middleware/auth.js';

const DRIVER_POPULATE_PATH = {
  path: 'driver',
  select: 'phone driverProfile',
  populate: [
    { path: 'driverProfile.car.make' },
    { path: 'driverProfile.car.model' },
  ],
};

async function requireActiveDriver(userId: string) {
  const user = await User.findById(userId);
  if (!user || user.role !== 'driver') throw ApiError.forbidden('Drivers only');
  if (user.status !== 'active') throw ApiError.forbidden('Your account is not active yet');
  if (!user.driverProfile?.workingCity) throw ApiError.badRequest('Complete your driver profile first');
  return user;
}

export const togglePresence = asyncHandler(async (req, res) => {
  const { online } = req.body;
  const user = await requireActiveDriver((req as AuthedRequest).userId);
  const profile = user.driverProfile!;

  const presence = await DriverPresence.findOneAndUpdate(
    { driver: user._id },
    {
      online,
      city: profile.workingCity,
      areas: profile.workingAreas ?? [],
      lastSeenAt: new Date(),
    },
    { upsert: true, new: true },
  );

  io.emit(SOCKET_EVENTS.presenceChanged, { driverId: String(user._id), online });
  res.json({ presence: { online: presence.online, city: presence.city, areas: presence.areas } });
});

export const getPresence = asyncHandler(async (req, res) => {
  const presence = await DriverPresence.findOne({ driver: (req as AuthedRequest).userId }).lean();
  res.json({ presence: presence ? { online: presence.online, city: presence.city, areas: presence.areas } : { online: false, city: null, areas: [] } });
});

export const driverStats = asyncHandler(async (req, res) => {
  const driverId = new mongoose.Types.ObjectId((req as AuthedRequest).userId);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [overall, today] = await Promise.all([
    Ride.aggregate([
      { $match: { driver: driverId, status: 'completed' } },
      {
        $group: {
          _id: null,
          trips: { $sum: 1 },
          earnings: { $sum: '$fare.total' },
          ratingSum: { $sum: { $ifNull: ['$ratings.driverRating', 0] } },
          ratingCount: { $sum: { $cond: [{ $gt: ['$ratings.driverRating', 0] }, 1, 0] } },
        },
      },
    ]),
    Ride.aggregate([
      { $match: { driver: driverId, status: 'completed', 'timeline.completedAt': { $gte: startOfDay } } },
      { $group: { _id: null, trips: { $sum: 1 }, earnings: { $sum: '$fare.total' } } },
    ]),
  ]);

  const o = overall[0];
  const t = today[0];
  res.json({
    stats: {
      tripsCompleted: o?.trips ?? 0,
      earningsTotal: o?.earnings ?? 0,
      tripsToday: t?.trips ?? 0,
      earningsToday: t?.earnings ?? 0,
      avgRating: o?.ratingCount ? Math.round((o.ratingSum / o.ratingCount) * 10) / 10 : null,
    },
  });
});

const RIDE_ACTIONS: Record<string, { from: string; to: string; field: string; payload?: Record<string, unknown> }> = {
  arrive: { from: 'accepted', to: 'arrived', field: 'arrivedAt' },
  start: { from: 'arrived', to: 'in_progress', field: 'startedAt' },
  complete: { from: 'in_progress', to: 'completed', field: 'completedAt', payload: { 'payment.collected': true } },
};

export const currentRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findOne({
    driver: (req as AuthedRequest).userId,
    status: { $in: ['accepted', 'arrived', 'in_progress'] },
  })
    .sort({ createdAt: -1 })
    .populate(DRIVER_POPULATE_PATH)
    .populate({ path: 'customer', select: 'firstName lastName phone' });
  res.json({ ride: ride ? await toRideDTO(ride) : null });
});

export const driverRideAction = asyncHandler(async (req, res) => {
  const { id, action } = req.params;
  const driverId = (req as AuthedRequest).userId;
  const user = await requireActiveDriver(driverId);

  let ride;
  let newlyAccepted = false;

  if (action === 'accept') {
    ride = await Ride.findOneAndUpdate(
      { _id: id, status: 'requested' },
      { status: 'accepted', driver: user._id, 'timeline.acceptedAt': new Date() },
      { new: true },
    ).populate(DRIVER_POPULATE_PATH);
    if (!ride) throw ApiError.conflict('This ride is no longer available');
    newlyAccepted = true;
    clearRideRequestTimer(id);
  } else {
    const config = RIDE_ACTIONS[action];
    if (!config) throw ApiError.badRequest('Unknown action');

    ride = await Ride.findById(id).populate(DRIVER_POPULATE_PATH);
    if (!ride) throw ApiError.notFound('Ride not found');
    if (refId(ride.driver) !== driverId) throw ApiError.forbidden('Not your ride');
    if (ride.status !== config.from) {
      throw new ApiError(409, 'INVALID_STATE', `Cannot ${action} a ride in ${ride.status} state`);
    }

    ride.status = config.to as RideStatus;
    if (config.field) ride.timeline[config.field as keyof typeof ride.timeline] = new Date();
    if (config.payload) ride.set(config.payload);
    await ride.save();
  }

  const dto = await toRideDTO(ride);

  if (newlyAccepted) {
    io.to(userRoom(refId(ride.customer))).emit(SOCKET_EVENTS.rideAccepted, dto);
    const carObj = (ride.driver as { driverProfile?: { car?: { make?: { name?: string }; model?: { name?: string }; color?: string; plateNumber?: string } } } | null)
      ?.driverProfile?.car;
    const carLabel = [carObj?.make?.name, carObj?.model?.name, carObj?.color, carObj?.plateNumber].filter(Boolean).join(' · ');
    await createNotification(refId(ride.customer), {
      type: 'ride',
      title: `${dto.driver?.name} accepted your ride`,
      body: carLabel || undefined,
      data: { rideId: String(ride._id) },
    });
  }
  io.to(userRoom(refId(ride.customer))).emit(SOCKET_EVENTS.rideStatus, dto);
  io.to(userRoom(refId(ride.driver))).emit(SOCKET_EVENTS.rideStatus, dto);
  if (action === 'complete') {
    await settleRidePayment(ride);
    io.to(userRoom(refId(ride.customer))).emit(SOCKET_EVENTS.rideCompleted, dto);
    const method = ride.payment?.method ?? 'cash';
    const payNote =
      method === 'bucket'
        ? `Paid from your bucket: ${dto.fare.total.toLocaleString()} SYP.`
        : method === 'pay_later'
          ? `${dto.fare.total.toLocaleString()} SYP added to your pay-later account.`
          : `Please pay ${dto.fare.total.toLocaleString()} SYP in cash to your driver.`;
    await createNotification(refId(ride.customer), {
      type: 'ride',
      title: 'Trip completed',
      body: payNote,
      data: { rideId: String(ride._id) },
    });
    await createNotification(refId(ride.driver), {
      type: 'ride',
      title: 'Trip completed',
      body:
        method === 'bucket'
          ? `Fare ${dto.fare.total.toLocaleString()} SYP was paid from the rider's bucket.`
          : `Fare ${dto.fare.total.toLocaleString()} SYP — ask the rider to pay.`,
      data: { rideId: String(ride._id) },
    });
  }

  res.json({ ride: dto });
});
