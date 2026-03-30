import { Router } from 'express';
import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';
import { SettingsService } from '../services/settings-service.js';
import { BookmarkletService } from '../services/bookmarklet-service.js';
import { XPublishingService } from '../services/x-publishing-service.js';
import { ThreadsPublishingService } from '../services/threads-publishing-service.js';
import { ScheduleService } from '../services/schedule-service.js';

export function createSettingsRouter(db: Kysely<Database>): Router {
  const router = Router();
  const settings = new SettingsService(db);
  const bookmarklet = new BookmarkletService(settings);
  const xPublishing = new XPublishingService(settings);
  const threadsPublishing = new ThreadsPublishingService(settings);
  const scheduleService = new ScheduleService(settings);

  // GET /api/settings — public settings (no secrets)
  router.get('/', async (_req, res, next) => {
    try {
      const data = await settings.getPublicSettings();
      const hasApiKey = !!(await settings.getAnthropicApiKey());
      const hasXCredentials = await xPublishing.hasCredentials();
      const hasThreadsCredentials = await threadsPublishing.hasCredentials();
      const limits: number[] = [];
      if (hasXCredentials) limits.push(280);
      if (hasThreadsCredentials) limits.push(500);
      const maxCharLimit = limits.length > 0 ? Math.max(...limits) : 280;
      res.json({
        data: { ...data, hasApiKey, hasXCredentials, hasThreadsCredentials, maxCharLimit },
      });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/settings — update settings
  router.put('/', async (req, res, next) => {
    try {
      const updates = req.body as Record<string, string>;
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value === 'string') {
          await settings.set(key, value);
        }
      }
      const data = await settings.getPublicSettings();
      const hasApiKey = !!(await settings.getAnthropicApiKey());
      res.json({ data: { ...data, hasApiKey } });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/settings/validate-key — validate Anthropic API key
  router.post('/validate-key', async (req, res, next) => {
    try {
      const { apiKey } = req.body as { apiKey?: string };
      const keyToValidate = apiKey || (await settings.getAnthropicApiKey());

      if (!keyToValidate) {
        res.status(400).json({
          error: { code: 'NO_API_KEY', message: 'No API key provided or configured' },
        });
        return;
      }

      // Test the key by making a minimal API call
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': keyToValidate,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });

      if (response.ok) {
        res.json({ data: { valid: true } });
      } else {
        const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const errorMsg =
          typeof body?.error === 'object' && body.error !== null
            ? ((body.error as Record<string, unknown>)?.message ?? 'Invalid API key')
            : 'Invalid API key';
        res.json({ data: { valid: false, message: errorMsg } });
      }
    } catch (err) {
      next(err);
    }
  });

  // GET /api/settings/bookmarklet — get bookmarklet code
  router.get('/bookmarklet', async (_req, res, next) => {
    try {
      const code = await bookmarklet.generateBookmarkletCode();
      res.json({ data: { code } });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/settings/x-credentials — save X API credentials
  router.put('/x-credentials', async (req, res, next) => {
    try {
      const { apiKey, apiSecret, accessToken, accessTokenSecret } = req.body as {
        apiKey?: string;
        apiSecret?: string;
        accessToken?: string;
        accessTokenSecret?: string;
      };

      if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
        res.status(400).json({
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'All four X API credentials are required',
          },
        });
        return;
      }

      await xPublishing.saveCredentials({ apiKey, apiSecret, accessToken, accessTokenSecret });
      const hasXCredentials = await xPublishing.hasCredentials();
      res.json({ data: { hasXCredentials } });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/settings/validate-x — validate X API credentials
  router.post('/validate-x', async (req, res, next) => {
    try {
      const { apiKey, apiSecret, accessToken, accessTokenSecret } = req.body as {
        apiKey?: string;
        apiSecret?: string;
        accessToken?: string;
        accessTokenSecret?: string;
      };

      const creds =
        apiKey && apiSecret && accessToken && accessTokenSecret
          ? { apiKey, apiSecret, accessToken, accessTokenSecret }
          : undefined;

      const result = await xPublishing.validateCredentials(creds);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/settings/threads-credentials — save Threads API credentials
  router.put('/threads-credentials', async (req, res, next) => {
    try {
      const { accessToken, userId } = req.body as {
        accessToken?: string;
        userId?: string;
      };

      if (!accessToken || !userId) {
        res.status(400).json({
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Both access token and user ID are required',
          },
        });
        return;
      }

      await threadsPublishing.saveCredentials({ accessToken, userId });
      const hasThreadsCredentials = await threadsPublishing.hasCredentials();
      res.json({ data: { hasThreadsCredentials } });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/settings/validate-threads — validate Threads API credentials
  router.post('/validate-threads', async (req, res, next) => {
    try {
      const { accessToken, userId } = req.body as {
        accessToken?: string;
        userId?: string;
      };

      const creds = accessToken && userId ? { accessToken, userId } : undefined;

      const result = await threadsPublishing.validateCredentials(creds);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/settings/schedule — get publishing schedule
  router.get('/schedule', async (_req, res, next) => {
    try {
      const schedule = await scheduleService.getSchedule();
      const defaults = scheduleService.getOptimalDefaults();
      res.json({ data: { schedule, defaults } });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/settings/schedule — save publishing schedule
  router.put('/schedule', async (req, res, next) => {
    try {
      const { slots } = req.body as { slots: { day: string; time: string }[] };
      if (!Array.isArray(slots)) {
        res.status(400).json({
          error: { code: 'INVALID_SCHEDULE', message: 'slots must be an array' },
        });
        return;
      }
      await scheduleService.saveSchedule({ slots });
      const schedule = await scheduleService.getSchedule();
      res.json({ data: { schedule } });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/settings/time-restrictions — get publishing time restrictions
  router.get('/time-restrictions', async (_req, res, next) => {
    try {
      const restrictions = await scheduleService.getTimeRestrictions();
      res.json({ data: restrictions });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/settings/time-restrictions — save publishing time restrictions
  router.put('/time-restrictions', async (req, res, next) => {
    try {
      const { start, end, timezone } = req.body as {
        start?: string | null;
        end?: string | null;
        timezone?: string;
      };
      await scheduleService.saveTimeRestrictions({
        start: start ?? null,
        end: end ?? null,
        timezone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const restrictions = await scheduleService.getTimeRestrictions();
      res.json({ data: restrictions });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
