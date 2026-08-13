import { Ride, type RideDoc } from '../models/Ride.js';
import { DriverPresence } from '../models/DriverPresence.js';
import { io } from '../socket/setup.js';
import { SOCKET_EVENTS, userRoom } from '../socket/events.js';
import { toRideDTO } from './rideFlow.service.js';
import { ApiError } from '../utils/ApiError.js';
import { getConfig } from './config.service.js';
import { createNotification } from './notification.service.js';

const expiryTimers = new Map<string, NodeJS.Timeout>();

export async function broadcastRideRequest(rideId: string): Promise<{ targetedDrivers: number }> {
  const cfg = getConfig().matching;
  const ride = await Ride.findById(rideId).populate<{ driver: never }>('driver');
  if (!ride) throw ApiError.notFound('Ride not found');
  if (ride.status !== 'requested') return { targetedDrivers: 0 };

  const candidates = await DriverPresence.find({
    online: true,
    city: ride.city,
  })
    .sort({ lastSeenAt: 1 })
    .limit(cfg.maxTargets);

  const payload = await toRideDTO(ride);

  for (const presence of candidates) {
    io.to(userRoom(String(presence.driver))).emit(SOCKET_EVENTS.rideRequest, payload);
  }

  if (candidates.length > 0) {
    const timer = setTimeout(async () => {
      expiryTimers.delete(rideId);
      const current = await Ride.findById(rideId);
      if (!current || current.status !== 'requested') return;

      current.status = 'cancelled';
      current.cancellation = { cancelledBy: 'system', reason: 'No driver accepted in time', at: new Date() };
      await current.save();

      io.to(userRoom(String(current.customer))).emit(SOCKET_EVENTS.rideRequestExpired, {
        rideId,
        reason: 'No driver accepted in time',
      });
      await createNotification(String(current.customer), {
        type: 'ride',
        title: 'No driver accepted in time',
        body: 'Your ride request expired. Try again in a moment.',
        data: { rideId },
      });
      for (const presence of candidates) {
        io.to(userRoom(String(presence.driver))).emit(SOCKET_EVENTS.rideRequestExpired, { rideId });
      }
    }, cfg.requestTtlMs);
    expiryTimers.set(rideId, timer);
  } else {
    ride.status = 'cancelled';
    ride.cancellation = { cancelledBy: 'system', reason: 'No drivers available', at: new Date() };
    await ride.save();
    io.to(userRoom(String(ride.customer))).emit(SOCKET_EVENTS.rideRequestExpired, {
      rideId,
      reason: 'No drivers available right now',
    });
    await createNotification(String(ride.customer), {
      type: 'ride',
      title: 'No drivers available',
      body: 'No drivers are online in your area right now.',
      data: { rideId },
    });
  }

  return { targetedDrivers: candidates.length };
}

export function clearRideRequestTimer(rideId: string) {
  const timer = expiryTimers.get(rideId);
  if (timer) {
    clearTimeout(timer);
    expiryTimers.delete(rideId);
  }
}
