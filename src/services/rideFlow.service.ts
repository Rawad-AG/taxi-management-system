import mongoose from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import type { RideDoc } from '../models/Ride.js';

export function refId(ref: unknown): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  if (ref instanceof mongoose.Types.ObjectId) return ref.toString();
  if (typeof ref === 'object' && '_id' in ref) return String((ref as { _id: unknown })._id);
  return String(ref);
}

export const RIDE_STATUS_FLOW: Record<string, string[]> = {
  requested: ['accepted', 'cancelled'],
  accepted: ['arrived', 'cancelled'],
  arrived: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function assertTransition(current: string, next: string) {
  if (!RIDE_STATUS_FLOW[current]?.includes(next)) {
    const err = new Error(`Cannot move ride from ${current} to ${next}`) as Error & {
      status: number;
      code: string;
    };
    err.status = 409;
    err.code = 'INVALID_STATE';
    throw err;
  }
}

const carName = (ref: unknown) => {
  if (ref && typeof ref === 'object' && 'name' in ref) return String((ref as { name: unknown }).name);
  return null;
};

export const DRIVER_POPULATE_PATH = {
  path: 'driver',
  select: 'phone driverProfile',
  populate: [{ path: 'driverProfile.car.make' }, { path: 'driverProfile.car.model' }],
};

export async function toRideDTO(ride: HydratedDocument<RideDoc> & { driver?: unknown; customer?: unknown }) {
  const driverRef = ride.driver as
    | {
        _id: unknown;
        phone?: string | null;
        driverProfile?: {
          fullName?: string;
          car?: {
            make?: unknown;
            model?: unknown;
            color?: string;
            plateNumber?: string;
            category?: string;
          } | null;
        } | null;
      }
    | string
    | null
    | undefined;

  let driver: Record<string, unknown> | null = null;
  if (driverRef && typeof driverRef === 'object') {
    const dp = driverRef.driverProfile;
    driver = {
      id: String(driverRef._id),
      name: dp?.fullName ?? 'Driver',
      phone: driverRef.phone ?? null,
      car: dp?.car
        ? {
            make: carName(dp.car.make),
            model: carName(dp.car.model),
            color: dp.car.color,
            plateNumber: dp.car.plateNumber,
            category: dp.car.category,
          }
        : null,
    };
  }

  const customerRef = ride.customer as
    | { _id: unknown; firstName?: string; lastName?: string; phone?: string }
    | string
    | null
    | undefined;
  let customer: Record<string, unknown> | null = null;
  if (customerRef && typeof customerRef === 'object') {
    customer = {
      id: String(customerRef._id),
      name: `${customerRef.firstName ?? ''} ${customerRef.lastName ?? ''}`.trim() || 'Passenger',
      phone: customerRef.phone ?? null,
    };
  }

  return {
    id: String(ride._id),
    status: ride.status,
    type: ride.type,
    category: ride.category,
    city: ride.city,
    pickup: ride.pickup,
    dropoff: ride.dropoff,
    fare: ride.fare,
    timeline: ride.timeline,
    cancellation: ride.cancellation,
    ratings: ride.ratings,
    payment: ride.payment,
    live: ride.live ?? null,
    driver,
    customer,
    createdAt: ride.createdAt,
  };
}
