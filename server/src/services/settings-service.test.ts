import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createDatabase, migrateDatabase } from '../db/database.js';
import type { Database } from '../db/types.js';
import type { Kysely } from 'kysely';
import { SettingsService } from './settings-service.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('SettingsService', () => {
  let db: Kysely<Database>;
  let dbPath: string;
  let service: SettingsService;

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `speak-test-${Date.now()}.db`);
    db = createDatabase(dbPath);
    await migrateDatabase(db);
    service = new SettingsService(db);
  });

  afterEach(async () => {
    await db.destroy();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should set and get a setting', async () => {
    await service.set('test_key', 'test_value');
    const value = await service.get('test_key');
    expect(value).toBe('test_value');
  });

  it('should return null for missing setting', async () => {
    const value = await service.get('nonexistent');
    expect(value).toBeNull();
  });

  it('should update existing setting', async () => {
    await service.set('key', 'value1');
    await service.set('key', 'value2');
    const value = await service.get('key');
    expect(value).toBe('value2');
  });

  it('should get all settings', async () => {
    await service.set('a', '1');
    await service.set('b', '2');
    const all = await service.getAll();
    expect(all).toEqual({ a: '1', b: '2' });
  });

  it('should not expose API key in public settings', async () => {
    await service.set('anthropic_api_key', 'sk-secret');
    await service.set('app_url', 'http://localhost:3000');
    const pub = await service.getPublicSettings();
    expect(pub['anthropic_api_key']).toBeUndefined();
    expect(pub['app_url']).toBe('http://localhost:3000');
  });

  it('should prefer env variable for API key', async () => {
    process.env['ANTHROPIC_API_KEY'] = 'env-key';
    await service.set('anthropic_api_key', 'db-key');
    const key = await service.getAnthropicApiKey();
    expect(key).toBe('env-key');
    delete process.env['ANTHROPIC_API_KEY'];
  });

  it('should fall back to DB for API key when no env', async () => {
    delete process.env['ANTHROPIC_API_KEY'];
    await service.set('anthropic_api_key', 'db-key');
    const key = await service.getAnthropicApiKey();
    expect(key).toBe('db-key');
  });
});
