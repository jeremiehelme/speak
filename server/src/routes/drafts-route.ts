import { Router } from 'express';
import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';
import { DraftService } from '../services/draft-service.js';
import { SettingsService } from '../services/settings-service.js';
import { createLlmProvider } from '../llm/index.js';

export function createDraftsRouter(db: Kysely<Database>): Router {
  const router = Router();
  const settingsService = new SettingsService(db);
  const draftService = new DraftService(db, settingsService);

  // POST /api/sources/:id/drafts — generate a draft for a source
  router.post('/sources/:id/drafts', async (req, res, next) => {
    try {
      const sourceId = parseInt(req.params['id']!, 10);
      const { angle } = req.body as { angle: string };

      if (!angle) {
        res.status(400).json({
          error: { code: 'MISSING_ANGLE', message: 'An angle is required to generate a draft' },
        });
        return;
      }

      const apiKey = await settingsService.getAnthropicApiKey();
      if (!apiKey) {
        res.status(400).json({
          error: { code: 'NO_API_KEY', message: 'API key not configured' },
        });
        return;
      }

      const provider = createLlmProvider(apiKey);
      const draft = await draftService.generateDraft(sourceId, angle, provider);

      res.json({ data: draft });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/drafts/:id — edit a draft
  router.put('/drafts/:id', async (req, res, next) => {
    try {
      const draftId = parseInt(req.params['id']!, 10);
      const { content } = req.body as { content: string };

      const draft = await draftService.updateDraft(draftId, content);
      res.json({ data: draft });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/drafts/:id/regenerate — regenerate a draft with feedback
  router.post('/drafts/:id/regenerate', async (req, res, next) => {
    try {
      const draftId = parseInt(req.params['id']!, 10);
      const { feedback, angle } = req.body as { feedback?: string; angle?: string };

      const apiKey = await settingsService.getAnthropicApiKey();
      if (!apiKey) {
        res.status(400).json({
          error: { code: 'NO_API_KEY', message: 'API key not configured' },
        });
        return;
      }

      const provider = createLlmProvider(apiKey);
      const draft = await draftService.regenerateDraft(
        draftId,
        feedback ?? null,
        angle ?? null,
        provider,
      );

      res.json({ data: draft });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
