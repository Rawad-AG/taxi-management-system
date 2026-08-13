import type { Request } from 'express';
import { User } from '../models/User.js';
import { Ride } from '../models/Ride.js';
import { DriverPresence } from '../models/DriverPresence.js';
import { PayLaterDebt } from '../models/PayLaterDebt.js';
import { SystemConfig } from '../models/SystemConfig.js';
import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { configDto, getConfig, updateSystemConfig } from '../services/config.service.js';
import { clearRideRequestTimer } from '../services/matching.service.js';
import { refId, toRideDTO } from '../services/rideFlow.service.js';
import { createNotification } from '../services/notification.service.js';
import { io } from '../socket/setup.js';
import { SOCKET_EVENTS, userRoom } from '../socket/events.js';
import type { AuthedRequest } from '../middleware/auth.js';

const userId = (req: unknown) => (req as AuthedRequest).userId;

const startOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

function userSummary(u: Record<string, any>) {
  return {
    id: String(u._id),
    role: u.role,
    status: u.status,
    phone: u.phone,
    name: u.role === 'driver' ? u.driverProfile?.fullName : `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
    createdAt: u.createdAt,
    workingCity: typeof u.driverProfile?.workingCity === 'object' && u.driverProfile.workingCity ? u.driverProfile.workingCity.name : null,
    car: u.driverProfile?.car
      ? {
          make: u.driverProfile.car.make?.name ?? null,
          model: u.driverProfile.car.model?.name ?? null,
          color: u.driverProfile.car.color ?? null,
          plateNumber: u.driverProfile.car.plateNumber ?? null,
        }
      : null,
  };
}

export const overview = asyncHandler(async (_req, res) => {
  const dayStart = startOfDay();
  const [byRole, driversByStatus, onlineDrivers, ridesByStatus, todayAgg] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.aggregate([{ $match: { role: 'driver' } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    DriverPresence.countDocuments({ online: true }),
    Ride.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Ride.aggregate([
      { $match: { 'timeline.completedAt': { $gte: dayStart } } },
      { $group: { _id: null, trips: { $sum: 1 }, fares: { $sum: '$fare.total' } } },
    ]),
  ]);

  const roleCounts = Object.fromEntries(byRole.map((r) => [r._id, r.count]));
  const driverStatusCounts = Object.fromEntries(driversByStatus.map((s) => [s._id, s.count]));
  const rideStatusCounts = Object.fromEntries(ridesByStatus.map((s) => [s._id, s.count]));
  const activeRides = ['requested', 'accepted', 'arrived', 'in_progress'].reduce((sum, s) => sum + (rideStatusCounts[s] ?? 0), 0);
  const today = todayAgg[0];

  res.json({
    overview: {
      users: {
        total: byRole.reduce((s, r) => s + r.count, 0),
        customers: roleCounts.customer ?? 0,
        drivers: roleCounts.driver ?? 0,
        admins: roleCounts.admin ?? 0,
      },
      drivers: {
        pending: driverStatusCounts.pending ?? 0,
        active: driverStatusCounts.active ?? 0,
        suspended: driverStatusCounts.suspended ?? 0,
        online: onlineDrivers,
      },
      rides: {
        requested: rideStatusCounts.requested ?? 0,
        active: activeRides,
        completed: rideStatusCounts.completed ?? 0,
        cancelled: rideStatusCounts.cancelled ?? 0,
        total: ridesByStatus.reduce((s, r) => s + r.count, 0),
      },
      today: {
        tripsCompleted: today?.trips ?? 0,
        fares: today?.fares ?? 0,
      },
      commissionRate: getConfig().business.commissionRate,
      currency: getConfig().business.currency,
    },
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const { role, status, q, limit } = req.query;
  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (q) {
    const rx = new RegExp(String(q), 'i');
    filter.$or = [{ phone: rx }, { firstName: rx }, { lastName: rx }, { 'driverProfile.fullName': rx }];
  }

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 100, 200))
    .populate({ path: 'driverProfile.workingCity', select: 'name' })
    .populate({ path: 'driverProfile.car.make', select: 'name' })
    .populate({ path: 'driverProfile.car.model', select: 'name' });

  res.json({ users: users.map((u) => userSummary(u.toObject())) });
});

export const decideDriver = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approve } = req.body;
  const driver = await User.findById(id);
  if (!driver || driver.role !== 'driver') throw ApiError.notFound('Driver not found');

  driver.status = approve ? 'active' : 'suspended';
  await driver.save();
  if (!approve) {
    await DriverPresence.updateOne({ driver: driver._id }, { online: false });
  }
  await createNotification(String(driver._id), {
    type: 'account',
    title: approve ? 'Your driver account is approved' : 'Your driver account was rejected',
    body: approve ? 'You can now go online and start accepting rides.' : 'Contact support for more details.',
  });

  const fresh = await User.findById(id)
    .populate({ path: 'driverProfile.workingCity', select: 'name' })
    .populate({ path: 'driverProfile.car.make', select: 'name' })
    .populate({ path: 'driverProfile.car.model', select: 'name' });
  res.json({ user: userSummary(fresh!.toObject()) });
});

export const listRides = asyncHandler(async (req, res) => {
  const { status, from, to, q } = req.query;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt.$gte = new Date(from as string);
    if (to) createdAt.$lte = new Date(to as string);
    filter.createdAt = createdAt;
  }
  if (q) {
    const ids = await User.find({
      $or: [{ phone: new RegExp(String(q), 'i') }, { firstName: new RegExp(String(q), 'i') }, { lastName: new RegExp(String(q), 'i') }, { 'driverProfile.fullName': new RegExp(String(q), 'i') }],
    }).select('_id');
    const idsList = ids.map((u) => u._id);
    filter.$or = [{ customer: { $in: idsList } }, { driver: { $in: idsList } }];
  }

  const rides = await Ride.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('driver', 'phone driverProfile')
    .populate({ path: 'driver', populate: [{ path: 'driverProfile.car.make' }, { path: 'driverProfile.car.model' }] })
    .populate({ path: 'customer', select: 'firstName lastName phone' });

  res.json({ rides: await Promise.all(rides.map((r) => toRideDTO(r))) });
});

export const adminCancelRide = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const ride = await Ride.findById(id);
  if (!ride) throw ApiError.notFound('Ride not found');
  if (ride.status === 'completed' || ride.status === 'cancelled') throw ApiError.badRequest('Ride already finished');

  clearRideRequestTimer(id);
  ride.status = 'cancelled';
  ride.cancellation = { reason: reason || 'Cancelled by admin', cancelledBy: 'system', at: new Date() };
  await ride.save();

  const dto = await toRideDTO(ride);
  io.to(userRoom(refId(ride.customer))).emit(SOCKET_EVENTS.rideStatus, dto);
  if (ride.driver) io.to(userRoom(refId(ride.driver))).emit(SOCKET_EVENTS.rideStatus, dto);
  res.json({ ride: dto });
});

function rangeMatch(req: Request, field: string): Record<string, unknown> {
  const { from, to } = req.query as { from?: string; to?: string };
  if (!from && !to) return {};
  const cond: Record<string, unknown> = {};
  if (from) cond.$gte = new Date(from);
  if (to) cond.$lte = new Date(to);
  return { [field]: cond };
}

export const financialReport = asyncHandler(async (req, res) => {
  const completedMatch: Record<string, unknown> = { status: 'completed', ...rangeMatch(req, 'timeline.completedAt') };
  const cancelledMatch: Record<string, unknown> = { status: 'cancelled', ...rangeMatch(req, 'cancellation.at') };

  const [totals, byCategory, daily, topDrivers, cancelledCount] = await Promise.all([
    Ride.aggregate([
      { $match: completedMatch },
      { $group: { _id: null, trips: { $sum: 1 }, fares: { $sum: '$fare.total' } } },
    ]),
    Ride.aggregate([
      { $match: completedMatch },
      { $group: { _id: '$category', trips: { $sum: 1 }, fares: { $sum: '$fare.total' } } },
      { $sort: { fares: -1 } },
    ]),
    Ride.aggregate([
      { $match: completedMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timeline.completedAt' } },
          trips: { $sum: 1 },
          fares: { $sum: '$fare.total' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Ride.aggregate([
      { $match: completedMatch },
      { $group: { _id: '$driver', trips: { $sum: 1 }, earnings: { $sum: '$fare.total' } } },
      { $sort: { earnings: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'driver' } },
      { $unwind: '$driver' },
      {
        $project: {
          name: '$driver.driverProfile.fullName',
          phone: '$driver.phone',
          trips: 1,
          earnings: 1,
        },
      },
    ]),
    Ride.countDocuments(cancelledMatch),
  ]);

  const [byPaymentMethod] = await Promise.all([
    Ride.aggregate([
      { $match: completedMatch },
      { $group: { _id: '$payment.method', count: { $sum: 1 }, fares: { $sum: '$fare.total' } } },
    ]),
  ]);
  const methodStats = Object.fromEntries(byPaymentMethod.map((m) => [m._id ?? 'cash', m]));

  const t = totals[0];
  const trips = t?.trips ?? 0;
  const fares = t?.fares ?? 0;
  const commission = Math.round(fares * getConfig().business.commissionRate);
  const cancellationRate = trips + cancelledCount > 0 ? cancelledCount / (trips + cancelledCount) : 0;
  const payLaterShare = fares > 0 ? (methodStats.pay_later?.fares ?? 0) / fares : 0;

  res.json({
    report: {
      summary: {
        trips,
        fares,
        avgFare: trips > 0 ? Math.round(fares / trips) : 0,
        commission,
        driverNet: fares - commission,
        cancelled: cancelledCount,
        cancellationRate: Math.round(cancellationRate * 1000) / 1000,
        outstandingBalance: Math.round((await PayLaterDebt.aggregate([
          { $match: { status: { $in: ['outstanding', 'overdue'] } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]))[0]?.total ?? 0),
        overdueBalance: Math.round((await PayLaterDebt.aggregate([
          { $match: { status: 'overdue' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]))[0]?.total ?? 0),
        payLaterShare: Math.round(payLaterShare * 1000) / 1000,
        bucketRides: methodStats.bucket?.count ?? 0,
        payLaterRides: methodStats.pay_later?.count ?? 0,
        cashRides: methodStats.cash?.count ?? 0,
      },
      byCategory: byCategory.map((c) => ({ category: c._id, trips: c.trips, fares: c.fares })),
      daily: daily.map((d) => ({ date: d._id, trips: d.trips, fares: d.fares })),
      topDrivers: topDrivers.map((d) => ({
        name: d.name ?? 'Driver',
        phone: d.phone ?? null,
        trips: d.trips,
        earnings: d.earnings,
      })),
      commissionRate: getConfig().business.commissionRate,
      currency: getConfig().business.currency,
    },
  });
});

export const performanceReport = asyncHandler(async (req, res) => {
  const completedMatch: Record<string, unknown> = { status: 'completed', ...rangeMatch(req, 'timeline.completedAt') };

  const [drivers, customers, systemAgg, onlineDrivers, pendingDrivers] = await Promise.all([
    Ride.aggregate([
      { $match: completedMatch },
      {
        $group: {
          _id: '$driver',
          trips: { $sum: 1 },
          earnings: { $sum: '$fare.total' },
          ratingSum: { $sum: { $ifNull: ['$ratings.driverRating', 0] } },
          ratingCount: { $sum: { $cond: [{ $gt: ['$ratings.driverRating', 0] }, 1, 0] } },
          acceptMs: { $avg: { $subtract: ['$timeline.acceptedAt', '$timeline.requestedAt'] } },
        },
      },
      { $sort: { trips: -1, earnings: -1 } },
      { $limit: 20 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'driver' } },
      { $unwind: '$driver' },
      {
        $project: {
          name: '$driver.driverProfile.fullName',
          phone: '$driver.phone',
          status: '$driver.status',
          trips: 1,
          earnings: 1,
          rating: { $cond: [{ $gt: ['$ratingCount', 0] }, { $round: [{ $divide: ['$ratingSum', '$ratingCount'] }, 1] }, null] },
          avgAcceptMs: { $round: ['$acceptMs', 0] },
        },
      },
    ]),
    Ride.aggregate([
      { $match: completedMatch },
      { $group: { _id: '$customer', trips: { $sum: 1 }, spent: { $sum: '$fare.total' } } },
      { $sort: { trips: -1, spent: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'customer' } },
      { $unwind: '$customer' },
      {
        $project: {
          name: { $concat: ['$customer.firstName', ' ', '$customer.lastName'] },
          phone: '$customer.phone',
          trips: 1,
          spent: 1,
        },
      },
    ]),
    Ride.aggregate([
      { $match: { status: 'completed', 'timeline.acceptedAt': { $ne: null } } },
      {
        $group: {
          _id: null,
          acceptMs: { $avg: { $subtract: ['$timeline.acceptedAt', '$timeline.requestedAt'] } },
          ratingSum: { $sum: { $ifNull: ['$ratings.customerRating', 0] } },
          ratingCount: { $sum: { $cond: [{ $gt: ['$ratings.customerRating', 0] }, 1, 0] } },
        },
      },
    ]),
    DriverPresence.countDocuments({ online: true }),
    User.countDocuments({ role: 'driver', status: 'pending' }),
  ]);

  const sys = systemAgg[0];
  res.json({
    report: {
      system: {
        onlineDrivers,
        pendingDrivers,
        avgAcceptMs: sys?.acceptMs ? Math.round(sys.acceptMs) : null,
        avgCustomerRating: sys?.ratingCount ? Math.round((sys.ratingSum / sys.ratingCount) * 10) / 10 : null,
      },
      drivers: drivers.map((d) => ({
        name: d.name ?? 'Driver',
        phone: d.phone ?? null,
        status: d.status,
        trips: d.trips,
        earnings: d.earnings,
        avgRating: d.rating,
        avgAcceptMs: d.avgAcceptMs,
      })),
      customers: customers.map((c) => ({
        name: c.name?.trim() || 'Customer',
        phone: c.phone ?? null,
        trips: c.trips,
        spent: c.spent,
      })),
    },
  });
});

export const broadcastNotification = asyncHandler(async (req, res) => {
  const { title, body, audience } = req.body;
  const filter: Record<string, unknown> = { role: { $in: ['customer', 'driver'] } };
  if (audience === 'customers') filter.role = 'customer';
  if (audience === 'drivers') filter.role = 'driver';

  const users = await User.find(filter).select('_id').limit(5000);
  let sent = 0;
  for (const u of users) {
    const doc = await createNotification(String(u._id), { type: 'admin', title, body });
    if (doc) sent += 1;
  }
  res.json({ sent });
});

export const broadcastHistory = asyncHandler(async (_req, res) => {
  const docs = await Notification.aggregate([
    { $match: { type: 'admin' } },
    { $sort: { createdAt: -1 } },
    { $limit: 400 },
    {
      $group: {
        _id: { title: '$title', body: '$body' },
        title: { $first: '$title' },
        body: { $first: '$body' },
        sentAt: { $first: '$createdAt' },
        count: { $sum: 1 },
      },
    },
    { $sort: { sentAt: -1 } },
    { $limit: 20 },
  ]);
  res.json({ broadcasts: docs.map((d) => ({ title: d.title, body: d.body, sentAt: d.sentAt, count: d.count })) });
});

export const getSystemConfig = asyncHandler(async (_req, res) => {  const doc = await SystemConfig.findOne({ key: 'default' });
  res.json({ config: configDto(doc?.toObject() as unknown as ReturnType<typeof configDto>) });
});

export const saveSystemConfig = asyncHandler(async (req, res) => {
  const doc = await updateSystemConfig(req.body, userId(req));
  res.json({ config: configDto(doc), message: 'Configuration saved — changes are live' });
});
