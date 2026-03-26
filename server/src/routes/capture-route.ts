import { Router } from 'express';
import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';
import { CaptureService } from '../services/capture-service.js';
import { AnalysisService } from '../services/analysis-service.js';
import { SettingsService } from '../services/settings-service.js';
import { createLlmProvider } from '../llm/index.js';

export function createCaptureRouter(db: Kysely<Database>): Router {
  const router = Router();
  const captureService = new CaptureService(db);
  const settingsService = new SettingsService(db);
  const analysisService = new AnalysisService(db, settingsService);

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

      // Respond immediately, then trigger analysis in background
      res.json({ data: source });

      // Fire-and-forget analysis
      if (source.analysis_status === 'pending' && source.extracted_content) {
        const apiKey = await settingsService.getAnthropicApiKey();
        if (apiKey) {
          const provider = createLlmProvider(apiKey);
          analysisService.analyzeSource(source.id, provider).catch((err) => {
            console.error('Background analysis error:', (err as Error).message);
          });
        }
      }
    } catch (err) {
      next(err);
    }
  });

  return router;
}
