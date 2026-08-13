import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import type { UserRole } from '../utils/auth.types.js';

export interface AuthedRequest extends Request {
  userId: string;
  userRole: UserRole;
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized();
  }
  const payload = verifyAccessToken(header.slice(7));
  (req as AuthedRequest).userId = payload.sub;
  (req as AuthedRequest).userRole = payload.role;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { userRole } = req as AuthedRequest;
    if (!roles.includes(userRole)) {
      throw ApiError.forbidden('You do not have permission for this action');
    }
    next();
  };
}
