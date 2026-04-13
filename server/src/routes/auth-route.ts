import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHmac } from 'crypto';

interface User {
  username: string;
  password: string;
}

function loadUsers(): User[] {
  // Prefer AUTH_USERS env var (required on Vercel, optional locally)
  const envUsers = process.env.AUTH_USERS;
  if (envUsers) {
    return JSON.parse(envUsers) as User[];
  }

  // Fall back to local file for dev
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const usersPath = join(__dirname, '..', '..', '..', 'data', 'users.json');
  if (existsSync(usersPath)) {
    const raw = readFileSync(usersPath, 'utf-8');
    return JSON.parse(raw) as User[];
  }

  return [];
}

function getSecret(): string {
  return process.env.AUTH_SECRET || 'speak-dev-secret';
}

function createToken(username: string): string {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = `${username}:${expiresAt}`;
  const sig = createHmac('sha256', getSecret()).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64');
}

export function verifyToken(token: string): { username: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;

    const [username, expiresAtStr, sig] = parts;
    const expiresAt = Number(expiresAtStr);

    if (Date.now() > expiresAt) return null;

    const expectedSig = createHmac('sha256', getSecret())
      .update(`${username}:${expiresAtStr}`)
      .digest('hex');

    if (sig !== expectedSig) return null;

    return { username };
  } catch {
    return null;
  }
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

    const sessionId = createToken(user.username);
    res.json({ data: { sessionId, username: user.username } });
  });

  router.post('/logout', (_req, res) => {
    res.json({ data: { ok: true } });
  });

  router.get('/me', (req, res) => {
    const token = req.headers['x-session-id'] as string;
    const result = token ? verifyToken(token) : null;

    if (!result) {
      res.status(401).json({ error: { message: 'Not authenticated' } });
      return;
    }

    res.json({ data: { username: result.username } });
  });

  return router;
}
