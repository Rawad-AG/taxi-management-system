import { SOSIncident } from '../models/SOSIncident.js';
import { User } from '../models/User.js';
import { Ride } from '../models/Ride.js';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { refId } from '../services/rideFlow.service.js';
import { createNotification } from '../services/notification.service.js';
import { io } from '../socket/setup.js';
import { SOCKET_EVENTS, userRoom } from '../socket/events.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { getConfig } from '../services/config.service.js';

const SOS_DEDUPE_MS = 30 * 1000;
const dedupe = new Map<string, number>();

const userId = (req: unknown) => (req as AuthedRequest).userId;

async function notifyAdmins(incident: Record<string, unknown>, eventName: string) {
  const admins = await User.find({ role: 'admin' }).select('_id').lean();
  for (const admin of admins) {
    io.to(userRoom(String(admin._id))).emit(eventName, incident);
  }
}

export async function toSOSDTO(inc: {
  _id: unknown;
  user: unknown;
  role: string;
  ride?: unknown;
  location?: unknown;
  reason: string;
  note?: string | null;
  status: string;
  resolvedBy?: unknown;
  resolvedNote?: string | null;
  resolvedAt?: unknown;
  createdAt?: unknown;
}) {
  const userRef = inc.user as unknown as
    | { _id: unknown; firstName?: string; lastName?: string; phone?: string; driverProfile?: { fullName?: string } }
    | string
    | null
    | undefined;
  const populated = typeof userRef === 'object' && userRef !== null;
  const profile = populated ? (userRef as { driverProfile?: { fullName?: string } }).driverProfile : undefined;
  return {
    id: String(inc._id),
    userId: refId(populated ? (userRef as { _id: unknown })._id : inc.user),
    role: inc.role,
    rideId: inc.ride ? refId(inc.ride) : null,
    location: inc.location ?? null,
    reason: inc.reason,
    note: inc.note ?? null,
    status: inc.status,
    resolvedBy: inc.resolvedBy ? refId(inc.resolvedBy) : null,
    resolvedNote: inc.resolvedNote ?? null,
    resolvedAt: inc.resolvedAt ?? null,
    createdAt: inc.createdAt,
    user: populated
      ? {
          name:
            (userRef as { firstName?: string }).firstName && (userRef as { lastName?: string }).lastName
              ? `${(userRef as { firstName?: string }).firstName} ${(userRef as { lastName?: string }).lastName}`
              : profile?.fullName ?? 'User',
          phone: (userRef as { phone?: string }).phone ?? null,
        }
      : null,
  };
}

export const createSOS = asyncHandler(async (req, res) => {
  const me = userId(req);
  const { rideId, reason, note, lat, lng, accuracy } = req.body;

  const last = dedupe.get(me) ?? 0;
  if (Date.now() - last < SOS_DEDUPE_MS) {
    throw ApiError.tooManyRequests('An SOS was just sent. Please wait a moment.');
  }

  const user = await User.findById(me);
  if (!user) throw ApiError.notFound('User not found');
  if (user.status !== 'active') throw ApiError.forbidden('Your account is not active');

  let location: { lat: number; lng: number; accuracy?: number; ts: number } | undefined;
  let rideIdRef: string | undefined;

  if (rideId) {
    const ride = await Ride.findById(rideId).select('customer driver status live');
    if (!ride) throw ApiError.notFound('Ride not found');
    const isCustomer = refId(ride.customer) === me;
    const isDriver = ride.driver && refId(ride.driver) === me;
    if (!isCustomer && !isDriver) throw ApiError.forbidden('Not your ride');
    rideIdRef = rideId;
    const side = isDriver ? ride.live?.driverLoc : ride.live?.customerLoc;
    if (side && typeof side.lat === 'number' && typeof side.lng === 'number') {
      location = { lat: side.lat, lng: side.lng, accuracy: side.accuracy ?? 0, ts: side.ts ?? Date.now() };
    }
  } else if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
    location = { lat, lng, accuracy: typeof accuracy === 'number' ? accuracy : 0, ts: Date.now() };
  }

  const incident = await SOSIncident.create({
    user: me,
    role: user.role,
    ride: rideIdRef,
    location,
    reason,
    note: note || undefined,
    status: 'open',
  });

  dedupe.set(me, Date.now());

  const dto = await toSOSDTO(incident);
  void notifyAdmins(dto, SOCKET_EVENTS.sosNew);

  await createNotification(me, {
    type: 'sos',
    title: 'SOS sent',
    body: 'Support has been notified. Help is on the way.',
    data: { incidentId: String(incident._id) },
  });

  res.status(201).json({ incident: dto, emergencyPhone: getConfig().sos.emergencyPhone });
});

export const mySOS = asyncHandler(async (req, res) => {
  const me = userId(req);
  const incidents = await SOSIncident.find({ user: me })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate<{ user: { _id: unknown; firstName?: string; lastName?: string; phone?: string; driverProfile?: { fullName?: string } } | null }>(
      'user',
      'firstName lastName phone driverProfile.fullName',
    );
  res.json({ incidents: await Promise.all(incidents.map((i) => toSOSDTO(i))) });
});

export const listSOS = asyncHandler(async (req, res) => {
  const { status } = req.query as { status?: string };
  const query = status === 'resolved' ? { status: 'resolved' } : { status: 'open' };
  const incidents = await SOSIncident.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate<{ user: { _id: unknown; firstName?: string; lastName?: string; phone?: string; driverProfile?: { fullName?: string } } | null }>(
      'user',
      'firstName lastName phone driverProfile.fullName',
    );
  res.json({ incidents: await Promise.all(incidents.map((i) => toSOSDTO(i))) });
});

export const resolveSOS = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const me = userId(req);

  const incident = await SOSIncident.findById(id);
  if (!incident) throw ApiError.notFound('SOS incident not found');
  if (incident.status === 'resolved') throw ApiError.badRequest('Incident is already resolved');

  incident.status = 'resolved';
  incident.resolvedBy = new mongoose.Types.ObjectId(me);
  incident.resolvedNote = note || undefined;
  incident.resolvedAt = new Date();
  await incident.save();

  const dto = await toSOSDTO(incident);
  void notifyAdmins(dto, SOCKET_EVENTS.sosResolved);

  await createNotification(refId(incident.user), {
    type: 'sos',
    title: 'SOS resolved',
    body: note ? `Support resolved your SOS: ${note}` : 'Support resolved your SOS. Stay safe.',
    data: { incidentId: String(incident._id) },
  });

  res.json({ incident: dto });
});
