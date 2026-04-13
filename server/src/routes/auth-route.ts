import { Router } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

interface User {
  username: string;
  password: string;
}

function loadUsers(): User[] {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const usersPath = join(__dirname, '..', '..', '..', 'data', 'users.json');
  const raw = readFileSync(usersPath, 'utf-8');
  return JSON.parse(raw) as User[];
}

// Simple in-memory session store
const sessions = new Map<string, { username: string; expiresAt: number }>();

function generateSessionId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createAuthRouter() {
  const router = Router();

  router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: { message: 'Username and password required' } });
      return;
    }

    const users = loadUsers();
    const user = users.find((u) => u.username === username && u.password === password);

    if (!user) {
      res.status(401).json({ error: { message: 'Invalid credentials' } });
      return;
    }

    const sessionId = generateSessionId();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    sessions.set(sessionId, { username: user.username, expiresAt });

    res.json({ data: { sessionId, username: user.username } });
  });

  router.post('/logout', (req, res) => {
    const sessionId = req.headers['x-session-id'] as string;
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.json({ data: { ok: true } });
  });

  router.get('/me', (req, res) => {
    const sessionId = req.headers['x-session-id'] as string;
    const session = sessionId ? sessions.get(sessionId) : undefined;

    if (!session || session.expiresAt < Date.now()) {
      if (session) sessions.delete(sessionId);
      res.status(401).json({ error: { message: 'Not authenticated' } });
      return;
    }

    res.json({ data: { username: session.username } });
  });

  return router;
}

export { sessions };
