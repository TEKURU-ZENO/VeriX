import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'verix-super-secret-key';

export interface AuthenticatedRequest extends Request {
  user?: {
    email: string;
    role: 'admin' | 'user';
  };
}

export function authGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    logger.warn(`Auth failure: Missing Authorization header on ${req.originalUrl}`);
    return res.status(401).json({ success: false, message: 'Authorization header required.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    logger.warn(`Auth failure: Malformed Bearer token on ${req.originalUrl}`);
    return res.status(401).json({ success: false, message: 'Invalid token format.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string; role: 'admin' | 'user' };
    req.user = decoded;
    next();
  } catch (error: any) {
    logger.warn(`Auth failure: JWT verification failed: ${error.message}`);
    return res.status(401).json({ success: false, message: 'Session expired or invalid token.' });
  }
}

export function adminOnly(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    logger.warn(`Permission denied: User ${req.user?.email || 'unknown'} attempted accessing admin endpoint ${req.originalUrl}`);
    return res.status(403).json({ success: false, message: 'Access denied. Administrator privileges required.' });
  }
  next();
}
