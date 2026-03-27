import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  createTestDatabase as createDatabase,
  migrateTestDatabase as migrateDatabase,
} from '../db/test-database.js';
import type { Database } from '../db/types.js';
import type { Kysely } from 'kysely';
import { CaptureService } from './capture-service.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('CaptureService', () => {
  let db: Kysely<Database>;
  let dbPath: string;
  let service: CaptureService;

  beforeEach(async () => {
    dbPath = path.join(
      os.tmpdir(),
      `speak-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
    );
    db = createDatabase(dbPath);
    await migrateDatabase(db);
    service = new CaptureService(db);
  });

  afterEach(async () => {
    await db.destroy();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should capture a source with text input', async () => {
    const source = await service.capture({
      text: 'This is a test article about AI agents.',
      opinion: 'I think agents are overhyped.',
    });

    expect(source.id).toBeDefined();
    expect(source.raw_text).toBe('This is a test article about AI agents.');
    expect(source.extracted_content).toBe('This is a test article about AI agents.');
    expect(source.opinion).toBe('I think agents are overhyped.');
    expect(source.analysis_status).toBe('pending');
  });

  it('should capture without opinion', async () => {
    const source = await service.capture({
      text: 'Just an article.',
    });

    expect(source.opinion).toBeNull();
    expect(source.analysis_status).toBe('pending');
  });

  it('should handle extraction failure gracefully for bad URLs', async () => {
    const source = await service.capture({
      url: 'https://this-definitely-does-not-exist-12345.invalid',
    });

    expect(source.analysis_status).toBe('extraction_failed');
  });
});
