import { Router } from 'express';
import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';
import { SettingsService } from '../services/settings-service.js';
import { BookmarkletService } from '../services/bookmarklet-service.js';

export function createSettingsRouter(db: Kysely<Database>): Router {
  const router = Router();
  const settings = new SettingsService(db);
  const bookmarklet = new BookmarkletService(settings);

  // GET /api/settings — public settings (no API key)
  router.get('/', async (_req, res, next) => {
    try {
      const data = await settings.getPublicSettings();
      // Include whether API key is configured (but not the value)
      const hasApiKey = !!(await settings.getAnthropicApiKey());
      res.json({ data: { ...data, hasApiKey } });
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

  return router;
}
