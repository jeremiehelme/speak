import { Router } from 'express';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../db/types.js';

export function createSourcesRouter(db: Kysely<Database>): Router {
  const router = Router();

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
