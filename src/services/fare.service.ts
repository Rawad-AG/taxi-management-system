import type { RideCategory } from '../models/Ride.js';
import { haversineKm, round2 } from '../utils/geo.js';
import { getConfig } from './config.service.js';

export interface FareInput {
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  category: RideCategory;
}

export function estimateFare(input: FareInput) {
  const cfg = getConfig().fare;
  const straight = haversineKm(input.pickup.lat, input.pickup.lng, input.dropoff.lat, input.dropoff.lng);
  const road = straight * cfg.roadFactor;
  const pricing = cfg.categories[input.category];
  const total = Math.max(Math.round((pricing.base + pricing.perKm * road) / cfg.roundTo) * cfg.roundTo, pricing.base);

  return {
    base: pricing.base,
    perKm: pricing.perKm,
    distanceKm: round2(straight),
    roadDistanceKm: round2(road),
    total,
    category: input.category,
  };
}
