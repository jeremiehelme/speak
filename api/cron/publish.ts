import type { IncomingMessage, ServerResponse } from 'node:http';
import { initDatabase } from '../../server/src/db/database.js';
import { createPublishingEngine } from '../../server/src/services/publishing-engine.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Verify cron secret (Vercel sends Authorization header for cron jobs)
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env['CRON_SECRET'];

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } }));
    return;
  }

  try {
    const db = await initDatabase();
    const engine = createPublishingEngine(db);
    const published = await engine.processDuePublications();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: { published, timestamp: new Date().toISOString() } }));
  } catch (err) {
    console.error('[Cron] Publishing failed:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          code: 'CRON_FAILED',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
      }),
    );
  }
}
