import { User } from '../models/User.js';
import { Ride } from '../models/Ride.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { estimateFare } from '../services/fare.service.js';
import { broadcastRideRequest, clearRideRequestTimer } from '../services/matching.service.js';
import { assertTransition, DRIVER_POPULATE_PATH, refId, toRideDTO } from '../services/rideFlow.service.js';
import { createNotification } from '../services/notification.service.js';
import { assertCanUsePayLater, assertBucketCovers } from '../services/payment.service.js';
import { io } from '../socket/setup.js';
import { SOCKET_EVENTS, userRoom } from '../socket/events.js';
import type { AuthedRequest } from '../middleware/auth.js';

const userId = (req: unknown) => (req as AuthedRequest).userId;

export const estimate = asyncHandler(async (req, res) => {
  const { pickup, dropoff, category } = req.body;
  const fare = estimateFare({ pickup, dropoff, category });
  res.json({ fare });
});

export const createRide = asyncHandler(async (req, res) => {
  const { city, category, pickup, dropoff, paymentMethod } = req.body;
  const customer = await User.findById(userId(req));
  if (!customer || customer.role !== 'customer') throw ApiError.forbidden('Customers only');
  if (customer.status !== 'active') throw ApiError.forbidden('Your account is not active');

  const fare = estimateFare({ pickup, dropoff, category });

  if (paymentMethod === 'bucket') {
    await assertBucketCovers(String(customer._id), fare.total);
  } else if (paymentMethod === 'pay_later') {
    await assertCanUsePayLater(String(customer._id));
  }

  const ride = await Ride.create({
    customer: customer._id,
    status: 'requested',
    type: 'ride',
    category,
    city,
    pickup,
    dropoff,
    fare,
    payment: { method: paymentMethod ?? 'cash', collected: false },
    timeline: { requestedAt: new Date() },
  });

  const { targetedDrivers } = await broadcastRideRequest(String(ride._id));

  res.status(201).json({ ride: await toRideDTO(ride), targetedDrivers });
});

export const cancelRide = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const me = userId(req);
  const ride = await Ride.findById(id);
  if (!ride) throw ApiError.notFound('Ride not found');

  const isCustomer = refId(ride.customer) === me;
  const isDriver = ride.driver && refId(ride.driver) === me;
  if (!isCustomer && !isDriver) throw ApiError.forbidden('Not your ride');

  if (isDriver && ride.status !== 'requested') {
    throw ApiError.badRequest('Driver can only cancel before accepting');
  }
  if (ride.status === 'completed' || ride.status === 'cancelled') {
    throw ApiError.badRequest('Ride already finished');
  }

  assertTransition(ride.status, 'cancelled');
  clearRideRequestTimer(id);

  ride.status = 'cancelled';
  ride.cancellation = { reason, cancelledBy: isDriver ? 'driver' : 'customer', at: new Date() };
  await ride.save();

  const dto = await toRideDTO(ride);
  io.to(userRoom(refId(ride.customer))).emit(SOCKET_EVENTS.rideStatus, dto);
  if (ride.driver) io.to(userRoom(refId(ride.driver))).emit(SOCKET_EVENTS.rideStatus, dto);
  await createNotification(refId(ride.customer), {
    type: 'ride',
    title: 'Ride cancelled',
    body: reason || 'The ride was cancelled.',
    data: { rideId: String(ride._id) },
  });
  if (ride.driver) {
    await createNotification(refId(ride.driver), {
      type: 'ride',
      title: 'Ride cancelled',
      body: 'The customer cancelled the ride.',
      data: { rideId: String(ride._id) },
    });
  }

  res.json({ ride: dto });
});

export const history = asyncHandler(async (req, res) => {
  const me = userId(req);
  const user = await User.findById(me);
  if (!user) throw ApiError.notFound('User not found');

  const query = user.role === 'driver' ? { driver: me } : { customer: me };
  const rides = await Ride.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate(DRIVER_POPULATE_PATH)
    .populate({ path: 'customer', select: 'firstName lastName phone' });
  res.json({ rides: await Promise.all(rides.map((r) => toRideDTO(r))) });
});

export const getRideLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const me = userId(req);
  const ride = await Ride.findById(id).select('customer driver live');
  if (!ride) throw ApiError.notFound('Ride not found');

  const isCustomer = refId(ride.customer) === me;
  const isDriver = ride.driver && refId(ride.driver) === me;
  if (!isCustomer && !isDriver) throw ApiError.forbidden('Not your ride');

  res.json({
    rideId: id,
    driverLoc: ride.live?.driverLoc ?? null,
    customerLoc: ride.live?.customerLoc ?? null,
    updatedAt: ride.live?.updatedAt ?? null,
  });
});

export const getRide = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const me = userId(req);
  const ride = await Ride.findById(id)
    .populate(DRIVER_POPULATE_PATH)
    .populate({ path: 'customer', select: 'firstName lastName phone' });
  if (!ride) throw ApiError.notFound('Ride not found');

  const isCustomer = refId(ride.customer) === me;
  const isDriver = ride.driver && refId(ride.driver) === me;
  if (!isCustomer && !isDriver) throw ApiError.forbidden('Not your ride');

  res.json({ ride: await toRideDTO(ride) });
});

export const rateRide = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const me = userId(req);

  const ride = await Ride.findById(id)
    .populate(DRIVER_POPULATE_PATH)
    .populate({ path: 'customer', select: 'firstName lastName phone' });
  if (!ride) throw ApiError.notFound('Ride not found');

  const isCustomer = refId(ride.customer) === me;
  const isDriver = ride.driver && refId(ride.driver) === me;
  if (!isCustomer && !isDriver) throw ApiError.forbidden('Not your ride');
  if (ride.status !== 'completed') throw ApiError.conflict('Only completed rides can be rated');

  const set: Record<string, unknown> = {};
  let side: 'customerRating' | 'driverRating';
  let counterparty: unknown;
  if (isCustomer) {
    side = 'customerRating';
    counterparty = ride.driver;
  } else {
    side = 'driverRating';
    counterparty = ride.customer;
  }
  if (ride.ratings?.[side]) throw ApiError.conflict('You already rated this ride');

  set[`ratings.${side}`] = rating;
  const commentField = side === 'customerRating' ? 'customerComment' : 'driverComment';
  set[`ratings.${commentField}`] = typeof comment === 'string' && comment.length > 0 ? comment : undefined;

  await Ride.updateOne({ _id: ride._id }, { $set: set });

  if (counterparty) {
    void createNotification(String(counterparty), {
      type: 'ride',
      title: 'You received a new rating',
      body: `${rating} ★ from ${isCustomer ? 'your rider' : 'your driver'}`,
      data: { rideId: String(ride._id) },
    });
  }

  const updated = await Ride.findById(ride._id);
  res.json({ ride: updated ? await toRideDTO(updated) : null });
});
