import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createPublishingEngine } from './services/publishing-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

async function start(): Promise<void> {
  const { app, db } = await createApp();

  // Serve static frontend in production (local dev only — Vercel handles this)
  const clientDist = path.resolve(__dirname, '../../client/dist');
  const express = await import('express');
  app.use(express.default.static(clientDist));

  // SPA fallback for production
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  // Start the automatic publishing engine (local dev only — Vercel uses cron)
  const publishingEngine = createPublishingEngine(db);
  publishingEngine.start();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
