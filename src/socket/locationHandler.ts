import type { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { Ride } from '../models/Ride.js';
import { SOCKET_EVENTS, userRoom } from './events.js';
import { getConfig } from '../services/config.service.js';

const ACTIVE_STATUSES = new Set(['accepted', 'arrived', 'in_progress']);

const lastPingByRide = new Map<string, number>();
const MIN_PING_INTERVAL_MS = 500;

const clamp = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

export function registerLocationHandler(io: Server) {
  io.on('connection', (socket: Socket) => {
    socket.on(SOCKET_EVENTS.locationUpdate, async (payload) => {
      try {
        const { rideId, lat, lng, accuracy, ts } = (payload ?? {}) as {
          rideId?: unknown;
          lat?: unknown;
          lng?: unknown;
          accuracy?: unknown;
          ts?: unknown;
        };

        if (typeof rideId !== 'string' || !mongoose.isValidObjectId(rideId)) return;
        const pLat = clamp(lat, -90, 90, NaN);
        const pLng = clamp(lng, -180, 180, NaN);
        if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) return;

        const now = Date.now();
        const last = lastPingByRide.get(rideId) ?? 0;
        if (now - last < MIN_PING_INTERVAL_MS) return;
        lastPingByRide.set(rideId, now);

        const ride = await Ride.findById(rideId).select('customer driver status live');
        if (!ride) return;

        const { userId } = socket.data as { userId: string };
        const isCustomer = String(ride.customer) === userId;
        const isDriver = ride.driver && String(ride.driver) === userId;
        if (!isCustomer && !isDriver) return;
        if (!ACTIVE_STATUSES.has(ride.status)) return;

        const side = isDriver ? 'driverLoc' : 'customerLoc';
        const point = { lat: pLat, lng: pLng, accuracy: clamp(accuracy, 0, 10000, 0), ts: clamp(ts, 0, now, now) };
        const update = { [`live.${side}`]: point, 'live.updatedAt': new Date() } as Record<string, unknown>;
        await Ride.updateOne({ _id: rideId }, { $set: update });

        const otherSide = isDriver ? String(ride.customer) : String(ride.driver);
        if (otherSide && otherSide !== userId) {
          io.to(userRoom(otherSide)).emit(SOCKET_EVENTS.locationUpdate, {
            rideId,
            by: isDriver ? 'driver' : 'customer',
            ...point,
          });
        }
      } catch (err) {
        console.error('[location] handler error:', err);
      }
    });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [rideId, ts] of lastPingByRide) {
      if (now - ts > 5 * 60 * 1000) lastPingByRide.delete(rideId);
    }
  }, 60 * 1000).unref();
}

export function isLocationStale(ts?: number | null) {
  if (!ts) return true;
  return Date.now() - ts > getConfig().tracking.staleAfterMs;
}
