import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createDatabase, migrateDatabase } from '../db/database.js';
import type { Database } from '../db/types.js';
import type { Kysely } from 'kysely';
import { SettingsService } from './settings-service.js';
import { BookmarkletService } from './bookmarklet-service.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('BookmarkletService', () => {
  let db: Kysely<Database>;
  let dbPath: string;
  let bookmarkletService: BookmarkletService;
  let settingsService: SettingsService;

  beforeEach(async () => {
    dbPath = path.join(
      os.tmpdir(),
      `speak-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
    );
    db = createDatabase(dbPath);
    await migrateDatabase(db);
    settingsService = new SettingsService(db);
    bookmarkletService = new BookmarkletService(settingsService);
  });

  afterEach(async () => {
    await db.destroy();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should generate an API token on first call', async () => {
    const token = await bookmarkletService.ensureApiToken();
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(10);
  });

  it('should return the same token on subsequent calls', async () => {
    const token1 = await bookmarkletService.ensureApiToken();
    const token2 = await bookmarkletService.ensureApiToken();
    expect(token1).toBe(token2);
  });

  it('should generate bookmarklet code with token and URL', async () => {
    await settingsService.set('app_url', 'https://myspeak.local');
    const code = await bookmarkletService.generateBookmarkletCode();
    expect(code).toContain('javascript:');
    expect(code).toContain('https://myspeak.local');
    expect(code).toContain('/api/capture');
  });

  it('should include the generated token in bookmarklet code', async () => {
    const token = await bookmarkletService.ensureApiToken();
    const code = await bookmarkletService.generateBookmarkletCode();
    expect(code).toContain(token);
  });
});
