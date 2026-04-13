import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database.js';
import { errorHandler } from './middleware/error-handler.js';
import { requireAuth } from './middleware/auth-session.js';
import { createAuthRouter } from './routes/auth-route.js';
import { createSettingsRouter } from './routes/settings-route.js';
import { createProfileRouter } from './routes/profile-route.js';
import { createCaptureRouter } from './routes/capture-route.js';
import { createAnglesRouter } from './routes/angles-route.js';
import { createDraftsRouter } from './routes/drafts-route.js';
import { createSourcesRouter } from './routes/sources-route.js';

export async function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok' } });
  });

  // Auth routes (public)
  app.use('/api/auth', createAuthRouter());

  const db = await initDatabase();

  // Protect all routes below with session auth
  app.use('/api', requireAuth);

  // Mount routes
  app.use('/api/settings', createSettingsRouter(db));
  app.use('/api/profile', createProfileRouter(db));
  app.use('/api/capture', createCaptureRouter(db));
  app.use('/api/sources', createSourcesRouter(db));
  app.use('/api/sources', createAnglesRouter(db));
  app.use('/api', createDraftsRouter(db));

  // Error handler
  app.use(errorHandler);

  return { app, db };
}
