import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../routes/auth-route.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-session-id'] as string;
  const result = token ? verifyToken(token) : null;

  if (!result) {
    res.status(401).json({ error: { message: 'Not authenticated' } });
    return;
  }

  next();
}
