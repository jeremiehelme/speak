import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  createTestDatabase as createDatabase,
  migrateTestDatabase as migrateDatabase,
} from '../db/test-database.js';
import type { Database } from '../db/types.js';
import type { Kysely } from 'kysely';
import { SettingsService } from './settings-service.js';
import { XPublishingService } from './x-publishing-service.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('XPublishingService', () => {
  let db: Kysely<Database>;
  let dbPath: string;
  let settings: SettingsService;
  let xService: XPublishingService;

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `speak-test-x-${Date.now()}.db`);
    db = createDatabase(dbPath);
    await migrateDatabase(db);
    settings = new SettingsService(db);
    xService = new XPublishingService(settings);
  });

  afterEach(async () => {
    await db.destroy();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should return null credentials when none configured', async () => {
    const creds = await xService.getCredentials();
    expect(creds).toBeNull();
  });

  it('should return false for hasCredentials when none configured', async () => {
    const has = await xService.hasCredentials();
    expect(has).toBe(false);
  });

  it('should save and retrieve credentials', async () => {
    await xService.saveCredentials({
      apiKey: 'key1',
      apiSecret: 'secret1',
      accessToken: 'token1',
      accessTokenSecret: 'tokensecret1',
    });

    const creds = await xService.getCredentials();
    expect(creds).toEqual({
      apiKey: 'key1',
      apiSecret: 'secret1',
      accessToken: 'token1',
      accessTokenSecret: 'tokensecret1',
    });
  });

  it('should return true for hasCredentials after saving', async () => {
    await xService.saveCredentials({
      apiKey: 'key1',
      apiSecret: 'secret1',
      accessToken: 'token1',
      accessTokenSecret: 'tokensecret1',
    });

    const has = await xService.hasCredentials();
    expect(has).toBe(true);
  });

  it('should return partial credentials as null', async () => {
    await settings.set('x_api_key', 'key1');
    await settings.set('x_api_secret', 'secret1');
    // Missing access token and access token secret
    const creds = await xService.getCredentials();
    expect(creds).toBeNull();
  });

  it('should not expose X credentials in public settings', async () => {
    await xService.saveCredentials({
      apiKey: 'key1',
      apiSecret: 'secret1',
      accessToken: 'token1',
      accessTokenSecret: 'tokensecret1',
    });

    const pub = await settings.getPublicSettings();
    expect(pub['x_api_key']).toBeUndefined();
    expect(pub['x_api_secret']).toBeUndefined();
    expect(pub['x_access_token']).toBeUndefined();
    expect(pub['x_access_token_secret']).toBeUndefined();
  });

  it('should return invalid when validating with no credentials', async () => {
    const result = await xService.validateCredentials();
    expect(result.valid).toBe(false);
    expect(result.message).toBe('No X API credentials configured');
  });

  it('should build a valid OAuth header', () => {
    const header = xService.buildOAuthHeader('GET', 'https://api.twitter.com/2/users/me', {
      apiKey: 'testkey',
      apiSecret: 'testsecret',
      accessToken: 'testtoken',
      accessTokenSecret: 'testtokensecret',
    });

    expect(header).toMatch(/^OAuth /);
    expect(header).toContain('oauth_consumer_key="testkey"');
    expect(header).toContain('oauth_token="testtoken"');
    expect(header).toContain('oauth_signature_method="HMAC-SHA1"');
    expect(header).toContain('oauth_signature=');
  });
});
