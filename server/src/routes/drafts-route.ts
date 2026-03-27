import { Router } from 'express';
import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';
import { DraftService } from '../services/draft-service.js';
import { SettingsService } from '../services/settings-service.js';
import { XPublishingService } from '../services/x-publishing-service.js';
import { createLlmProvider } from '../llm/index.js';

export function createDraftsRouter(db: Kysely<Database>): Router {
  const router = Router();
  const settingsService = new SettingsService(db);
  const draftService = new DraftService(db, settingsService);
  const xPublishing = new XPublishingService(settingsService);

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

  // POST /api/drafts/:id/publish — publish a draft to X
  router.post('/drafts/:id/publish', async (req, res, next) => {
    try {
      const draftId = parseInt(req.params['id']!, 10);

      const draft = await db
        .selectFrom('drafts')
        .selectAll()
        .where('id', '=', draftId)
        .executeTakeFirst();

      if (!draft) {
        res.status(404).json({
          error: { code: 'DRAFT_NOT_FOUND', message: 'Draft not found' },
        });
        return;
      }

      if (!draft.content) {
        res.status(400).json({
          error: { code: 'EMPTY_DRAFT', message: 'Draft has no content to publish' },
        });
        return;
      }

      if (draft.content.length > 280) {
        res.status(400).json({
          error: {
            code: 'EXCEEDS_CHAR_LIMIT',
            message: `Draft exceeds X's 280 character limit (${draft.content.length} characters)`,
          },
        });
        return;
      }

      if (draft.published_status === 'published') {
        res.status(400).json({
          error: { code: 'ALREADY_PUBLISHED', message: 'This draft has already been published' },
        });
        return;
      }

      const hasXCreds = await xPublishing.hasCredentials();
      if (!hasXCreds) {
        res.status(400).json({
          error: {
            code: 'NO_X_CREDENTIALS',
            message: 'X API credentials not configured — go to Settings',
          },
        });
        return;
      }

      const result = await xPublishing.publishTweet(draft.content);

      await db
        .updateTable('drafts')
        .set({
          published_status: 'published',
          published_url: result.url,
          published_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000),
        })
        .where('id', '=', draftId)
        .execute();

      const updated = await db
        .selectFrom('drafts')
        .selectAll()
        .where('id', '=', draftId)
        .executeTakeFirstOrThrow();

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
