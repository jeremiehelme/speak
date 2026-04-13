import type { Request, Response, NextFunction } from 'express';
import { sessions } from '../routes/auth-route.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.headers['x-session-id'] as string;
  const session = sessionId ? sessions.get(sessionId) : undefined;

  if (!session || session.expiresAt < Date.now()) {
    if (session) sessions.delete(sessionId);
    res.status(401).json({ error: { message: 'Not authenticated' } });
    return;
  }

  next();
}
