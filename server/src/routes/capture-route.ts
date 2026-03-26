import { Router } from 'express';
import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';
import { CaptureService } from '../services/capture-service.js';

export function createCaptureRouter(db: Kysely<Database>): Router {
  const router = Router();
  const captureService = new CaptureService(db);

  // POST /api/capture — capture a source (from web app or bookmarklet)
  router.post('/', async (req, res, next) => {
    try {
      const { url, text, opinion } = req.body as {
        url?: string;
        text?: string;
        opinion?: string;
      };

      if (!url && !text) {
        res.status(400).json({
          error: { code: 'MISSING_INPUT', message: 'Provide either a URL or text content' },
        });
        return;
      }

      // Decode URL if it was encoded (from bookmarklet)
      const decodedUrl = url ? decodeURIComponent(url) : undefined;

      const source = await captureService.capture({
        url: decodedUrl,
        text,
        opinion,
      });

      res.json({ data: source });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
