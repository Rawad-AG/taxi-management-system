export const SOCKET_EVENTS = {
  rideRequest: 'ride:request',
  rideRequestExpired: 'ride:request_expired',
  rideAccepted: 'ride:accepted',
  rideStatus: 'ride:status',
  rideCompleted: 'ride:completed',
  presenceChanged: 'presence:changed',
  notificationNew: 'notification:new',
  locationUpdate: 'location:update',
  sosNew: 'sos:new',
  sosResolved: 'sos:resolved',
} as const;

export const userRoom = (userId: string) => `room:user:${userId}`;
