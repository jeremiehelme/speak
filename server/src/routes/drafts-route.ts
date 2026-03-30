import { Router } from 'express';
import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';
import { DraftService } from '../services/draft-service.js';
import { SettingsService } from '../services/settings-service.js';
import { XPublishingService } from '../services/x-publishing-service.js';
import { ThreadsPublishingService } from '../services/threads-publishing-service.js';
import { QueueService } from '../services/queue-service.js';
import { ScheduleService } from '../services/schedule-service.js';
import { createLlmProvider } from '../llm/index.js';

function getMaxCharLimit(hasX: boolean, hasThreads: boolean): number {
  const limits: number[] = [];
  if (hasX) limits.push(280);
  if (hasThreads) limits.push(500);
  return limits.length > 0 ? Math.max(...limits) : 280;
}

export function createDraftsRouter(db: Kysely<Database>): Router {
  const router = Router();
  const settingsService = new SettingsService(db);
  const draftService = new DraftService(db, settingsService);
  const xPublishing = new XPublishingService(settingsService);
  const threadsPublishing = new ThreadsPublishingService(settingsService);
  const scheduleService = new ScheduleService(settingsService);
  const queueService = new QueueService(db, scheduleService);

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
      const hasX = await xPublishing.hasCredentials();
      const hasThreads = await threadsPublishing.hasCredentials();
      const maxLength = getMaxCharLimit(hasX, hasThreads);
      const draft = await draftService.generateDraft(sourceId, angle, provider, maxLength);

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
      const hasX = await xPublishing.hasCredentials();
      const hasThreads = await threadsPublishing.hasCredentials();
      const maxLength = getMaxCharLimit(hasX, hasThreads);
      const draft = await draftService.regenerateDraft(
        draftId,
        feedback ?? null,
        angle ?? null,
        provider,
        maxLength,
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

  // POST /api/drafts/:id/publish-threads — publish a draft to Threads
  router.post('/drafts/:id/publish-threads', async (req, res, next) => {
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

      if (draft.content.length > 500) {
        res.status(400).json({
          error: {
            code: 'EXCEEDS_CHAR_LIMIT',
            message: `Draft exceeds Threads' 500 character limit (${draft.content.length} characters)`,
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

      const hasThreadsCreds = await threadsPublishing.hasCredentials();
      if (!hasThreadsCreds) {
        res.status(400).json({
          error: {
            code: 'NO_THREADS_CREDENTIALS',
            message: 'Threads API credentials not configured — go to Settings',
          },
        });
        return;
      }

      const result = await threadsPublishing.publishPost(draft.content);

      await db
        .updateTable('drafts')
        .set({
          published_status: 'published',
          published_url: result.url,
          published_at: Math.floor(Date.now() / 1000),
          platform: 'threads',
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

  // POST /api/drafts/:id/schedule — queue a draft for scheduled publishing
  router.post('/drafts/:id/schedule', async (req, res, next) => {
    try {
      const draftId = parseInt(req.params['id']!, 10);
      const draft = await queueService.queueDraft(draftId);
      res.json({ data: draft });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/drafts/:id/unschedule — remove draft from queue
  router.post('/drafts/:id/unschedule', async (req, res, next) => {
    try {
      const draftId = parseInt(req.params['id']!, 10);
      const draft = await queueService.unqueueDraft(draftId);
      res.json({ data: draft });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/queue — get all queued, published, and failed drafts
  router.get('/queue', async (_req, res, next) => {
    try {
      const drafts = await db
        .selectFrom('drafts')
        .selectAll()
        .where('published_status', 'is not', null)
        .orderBy('scheduled_at', 'asc')
        .execute();
      res.json({ data: drafts });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/drafts/:id/reschedule — change scheduled time
  router.put('/drafts/:id/reschedule', async (req, res, next) => {
    try {
      const draftId = parseInt(req.params['id']!, 10);
      const { scheduledAt } = req.body as { scheduledAt: number };

      if (!scheduledAt || typeof scheduledAt !== 'number') {
        res.status(400).json({
          error: { code: 'INVALID_TIME', message: 'scheduledAt (unix timestamp) is required' },
        });
        return;
      }

      await db
        .updateTable('drafts')
        .set({
          scheduled_at: scheduledAt,
          published_status: 'queued',
          updated_at: Math.floor(Date.now() / 1000),
        })
        .where('id', '=', draftId)
        .execute();

      const draft = await db
        .selectFrom('drafts')
        .selectAll()
        .where('id', '=', draftId)
        .executeTakeFirstOrThrow();

      res.json({ data: draft });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/drafts/:id/adapt — adapt draft to another platform
  router.post('/drafts/:id/adapt', async (req, res, next) => {
    try {
      const draftId = parseInt(req.params['id']!, 10);
      const { targetPlatform } = req.body as { targetPlatform?: string };

      if (!targetPlatform) {
        res.status(400).json({
          error: { code: 'MISSING_PLATFORM', message: 'targetPlatform is required' },
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
      const adapted = await draftService.adaptDraft(draftId, targetPlatform, provider);

      res.json({ data: adapted });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/drafts/:id/translate — translate draft content to another language
  router.post('/drafts/:id/translate', async (req, res, next) => {
    try {
      const draftId = parseInt(req.params['id']!, 10);
      const { language } = req.body as { language?: string };

      if (!language) {
        res.status(400).json({
          error: { code: 'MISSING_LANGUAGE', message: 'language is required' },
        });
        return;
      }

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
          error: { code: 'EMPTY_DRAFT', message: 'Draft has no content to translate' },
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
      const draftingModel = (await settingsService.get('drafting_model')) || 'claude-sonnet-4-6';

      const response = await provider.complete({
        model: draftingModel,
        system:
          'You are a professional translator. Translate the given social media post to the target language. Preserve the tone, style, and formatting. Keep it concise for social media. Return ONLY the translated text, nothing else.',
        messages: [
          {
            role: 'user',
            content: `Translate the following post to ${language}:\n\n${draft.content}`,
          },
        ],
        maxTokens: 512,
      });

      const translated = response.content.trim();
      res.json({ data: { translated } });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
