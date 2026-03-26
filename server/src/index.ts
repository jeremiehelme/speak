import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDatabase } from './db/database.js';
import { errorHandler } from './middleware/error-handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

app.use(cors());
app.use(express.json());

// Serve static frontend in production
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok' } });
});

// SPA fallback for production
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Error handler
app.use(errorHandler);

async function start(): Promise<void> {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { app };
