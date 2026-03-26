import { Router } from 'express';
import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';

export function createProfileRouter(db: Kysely<Database>): Router {
  const router = Router();

  // GET /api/profile
  router.get('/', async (_req, res, next) => {
    try {
      const profile = await db
        .selectFrom('voice_profiles')
        .selectAll()
        .executeTakeFirst();

      res.json({ data: profile ?? null });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/profile
  router.put('/', async (req, res, next) => {
    try {
      const { voiceDescription, examplePosts, generalOpinions } = req.body as {
        voiceDescription?: string;
        examplePosts?: string;
        generalOpinions?: string;
      };

      const existing = await db
        .selectFrom('voice_profiles')
        .select('id')
        .executeTakeFirst();

      if (existing) {
        await db
          .updateTable('voice_profiles')
          .set({
            voice_description: voiceDescription ?? null,
            example_posts: examplePosts ?? null,
            general_opinions: generalOpinions ?? null,
            updated_at: Math.floor(Date.now() / 1000),
          })
          .where('id', '=', existing.id)
          .execute();
      } else {
        await db
          .insertInto('voice_profiles')
          .values({
            voice_description: voiceDescription ?? null,
            example_posts: examplePosts ?? null,
            general_opinions: generalOpinions ?? null,
          })
          .execute();
      }

      const profile = await db
        .selectFrom('voice_profiles')
        .selectAll()
        .executeTakeFirst();

      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
