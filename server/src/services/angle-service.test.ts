import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  createTestDatabase as createDatabase,
  migrateTestDatabase as migrateDatabase,
} from '../db/test-database.js';
import type { Database } from '../db/types.js';
import type { Kysely } from 'kysely';
import { AngleService } from './angle-service.js';
import { SettingsService } from './settings-service.js';
import type { LlmProvider, LlmRequest, LlmResponse } from '../llm/llm-provider.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

class MockAngleProvider implements LlmProvider {
  async complete(_request: LlmRequest): Promise<LlmResponse> {
    return {
      content: JSON.stringify([
        { title: 'The contrarian take', description: 'Challenge the mainstream narrative.' },
        { title: 'The practical angle', description: 'Focus on real-world applications.' },
      ]),
    };
  }
}

describe('AngleService', () => {
  let db: Kysely<Database>;
  let dbPath: string;
  let service: AngleService;

  beforeEach(async () => {
    dbPath = path.join(
      os.tmpdir(),
      `speak-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
    );
    db = createDatabase(dbPath);
    await migrateDatabase(db);
    const settingsService = new SettingsService(db);
    service = new AngleService(db, settingsService);
  });

  afterEach(async () => {
    await db.destroy();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should generate angles for an analyzed source', async () => {
    const result = await db
      .insertInto('sources')
      .values({
        analysis_status: 'complete',
        analysis_summary: 'An article about AI agents.',
        themes: JSON.stringify(['AI', 'agents']),
        takeaways: JSON.stringify(['Agents are useful']),
      })
      .executeTakeFirstOrThrow();
    const sourceId = Number(result.insertId);

    const provider = new MockAngleProvider();
    const angles = await service.generateAngles(sourceId, provider, 2);

    expect(angles).toHaveLength(2);
    expect(angles[0]!.title).toBe('The contrarian take');
    expect(angles[1]!.title).toBe('The practical angle');
  });

  it('should throw if source is not analyzed', async () => {
    const result = await db
      .insertInto('sources')
      .values({
        analysis_status: 'pending',
      })
      .executeTakeFirstOrThrow();
    const sourceId = Number(result.insertId);

    const provider = new MockAngleProvider();
    await expect(service.generateAngles(sourceId, provider)).rejects.toThrow(
      'Source analysis not complete',
    );
  });
});
