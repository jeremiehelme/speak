import type { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings-service.js';
import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';

export function createTokenAuth(db: Kysely<Database>) {
  const settings = new SettingsService(db);

  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.query['token'] as string | undefined;
    if (!token) {
      res.status(401).json({ error: { code: 'MISSING_TOKEN', message: 'API token required' } });
      return;
    }

    const storedToken = await settings.get('api_token');
    if (!storedToken || token !== storedToken) {
      res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
      return;
    }

    next();
  };
}
