import { Router } from 'express';
import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';
import { AngleService } from '../services/angle-service.js';
import { SettingsService } from '../services/settings-service.js';
import { createLlmProvider } from '../llm/index.js';

export function createAnglesRouter(db: Kysely<Database>): Router {
  const router = Router();
  const settingsService = new SettingsService(db);
  const angleService = new AngleService(db, settingsService);

  // POST /api/sources/:id/angles — generate angles for a source
  router.post('/:id/angles', async (req, res, next) => {
    try {
      const sourceId = parseInt(req.params['id']!, 10);
      const { count } = req.body as { count?: number };

      const apiKey = await settingsService.getAnthropicApiKey();
      if (!apiKey) {
        res.status(400).json({
          error: { code: 'NO_API_KEY', message: 'API key not configured' },
        });
        return;
      }

      const provider = createLlmProvider(apiKey);
      const angles = await angleService.generateAngles(sourceId, provider, count || 1);

      res.json({ data: angles });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
