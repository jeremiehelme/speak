import { Router } from 'express';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../db/types.js';
import { AnalysisService } from '../services/analysis-service.js';
import { SettingsService } from '../services/settings-service.js';
import { createLlmProvider } from '../llm/index.js';

export function createSourcesRouter(db: Kysely<Database>): Router {
  const router = Router();
  const settingsService = new SettingsService(db);
  const analysisService = new AnalysisService(db, settingsService);

  // GET /api/sources — list all sources, newest first
  router.get('/', async (req, res, next) => {
    try {
      const search = req.query['search'] as string | undefined;

      let query = db.selectFrom('sources').selectAll().orderBy('id', 'desc');

      if (search) {
        const term = `%${search}%`;
        query = query.where((eb) =>
          eb.or([
            eb('title', 'like', term),
            eb('url', 'like', term),
            eb('analysis_summary', 'like', term),
            eb('category', 'like', term),
          ]),
        );
      }

      const sources = await query.execute();
      res.json({ data: sources });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/sources/:id — source detail with drafts
  router.get('/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params['id']!, 10);
      const source = await db
        .selectFrom('sources')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      if (!source) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Source not found' },
        });
        return;
      }

      const drafts = await db
        .selectFrom('drafts')
        .selectAll()
        .where('source_id', '=', id)
        .orderBy('created_at', 'desc')
        .execute();

      res.json({ data: { ...source, drafts } });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/sources/:id/retry-analysis — retry failed analysis
  router.post('/:id/retry-analysis', async (req, res, next) => {
    try {
      const id = parseInt(req.params['id']!, 10);
      const source = await db
        .selectFrom('sources')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      if (!source) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Source not found' } });
        return;
      }

      const apiKey = await settingsService.getAnthropicApiKey();
      if (!apiKey) {
        res.status(400).json({ error: { code: 'NO_API_KEY', message: 'No API key configured' } });
        return;
      }

      // Reset status to pending
      await db
        .updateTable('sources')
        .set({ analysis_status: 'pending', updated_at: Math.floor(Date.now() / 1000) })
        .where('id', '=', id)
        .execute();

      res.json({ data: { ...source, analysis_status: 'pending' } });

      // Fire-and-forget analysis
      const provider = createLlmProvider(apiKey);
      analysisService.analyzeSource(id, provider).catch((err) => {
        console.error('Retry analysis error:', (err as Error).message);
      });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/sources/:id — delete source and drafts
  router.delete('/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params['id']!, 10);

      await sql`PRAGMA foreign_keys = ON`.execute(db);

      const result = await db
        .deleteFrom('sources')
        .where('id', '=', id)
        .executeTakeFirst();

      if (result.numDeletedRows === 0n) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Source not found' },
        });
        return;
      }

      res.json({ data: { success: true } });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
