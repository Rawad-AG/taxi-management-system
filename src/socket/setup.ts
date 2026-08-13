import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { DriverPresence } from '../models/DriverPresence.js';
import { userRoom } from './events.js';
import { registerLocationHandler } from './locationHandler.js';

export let io: Server;

const socketCounts = new Map<string, Set<string>>();

export function setupSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('unauthorized'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, role } = socket.data as { userId: string; role: string };
    socket.join(userRoom(userId));

    const sockets = socketCounts.get(userId) ?? new Set<string>();
    sockets.add(socket.id);
    socketCounts.set(userId, sockets);

    socket.on('disconnect', () => {
      const set = socketCounts.get(userId);
      set?.delete(socket.id);
      if (set && set.size === 0) {
        socketCounts.delete(userId);
        if (role === 'driver') {
          DriverPresence.updateOne({ driver: userId }, { online: false, lastSeenAt: new Date() }).exec();
        }
      }
    });
  });

  registerLocationHandler(io);

  console.log('[socket] ready');
}

export function getOnlineSocketsForUser(userId: string) {
  return socketCounts.get(userId)?.size ?? 0;
}
