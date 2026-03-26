import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createDatabase, migrateDatabase } from '../db/database.js';
import type { Database } from '../db/types.js';
import type { Kysely } from 'kysely';
import { AnalysisService } from './analysis-service.js';
import { SettingsService } from './settings-service.js';
import type { LlmProvider, LlmRequest, LlmResponse } from '../llm/llm-provider.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

class MockLlmProvider implements LlmProvider {
  lastRequest: LlmRequest | null = null;

  async complete(request: LlmRequest): Promise<LlmResponse> {
    this.lastRequest = request;
    return {
      content: JSON.stringify({
        summary: 'Test summary about AI agents.',
        themes: ['AI', 'agents', 'automation'],
        takeaways: ['Agents are useful', 'Keep it simple', 'Ship fast'],
        relevance: 'Important for tech professionals building AI products.',
        category: 'AI',
      }),
    };
  }
}

class FailingLlmProvider implements LlmProvider {
  async complete(): Promise<LlmResponse> {
    throw new Error('LLM rate limit exceeded');
  }
}

describe('AnalysisService', () => {
  let db: Kysely<Database>;
  let dbPath: string;
  let service: AnalysisService;
  let settingsService: SettingsService;

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `speak-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    db = createDatabase(dbPath);
    await migrateDatabase(db);
    settingsService = new SettingsService(db);
    service = new AnalysisService(db, settingsService);
  });

  afterEach(async () => {
    await db.destroy();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should analyze a source and update fields', async () => {
    const result = await db.insertInto('sources').values({
      extracted_content: 'This article is about AI agents in production.',
      analysis_status: 'pending',
    }).executeTakeFirstOrThrow();
    const sourceId = Number(result.insertId);

    const provider = new MockLlmProvider();
    await service.analyzeSource(sourceId, provider);

    const source = await db.selectFrom('sources').selectAll().where('id', '=', sourceId).executeTakeFirstOrThrow();
    expect(source.analysis_status).toBe('complete');
    expect(source.analysis_summary).toBe('Test summary about AI agents.');
    expect(source.category).toBe('AI');
    expect(JSON.parse(source.themes!)).toEqual(['AI', 'agents', 'automation']);
    expect(JSON.parse(source.takeaways!)).toEqual(['Agents are useful', 'Keep it simple', 'Ship fast']);
    expect(source.relevance).toBe('Important for tech professionals building AI products.');
  });

  it('should mark source as failed on LLM error', async () => {
    const result = await db.insertInto('sources').values({
      extracted_content: 'Some content',
      analysis_status: 'pending',
    }).executeTakeFirstOrThrow();
    const sourceId = Number(result.insertId);

    const provider = new FailingLlmProvider();
    await service.analyzeSource(sourceId, provider);

    const source = await db.selectFrom('sources').selectAll().where('id', '=', sourceId).executeTakeFirstOrThrow();
    expect(source.analysis_status).toBe('failed');
  });

  it('should mark source as failed if no content', async () => {
    const result = await db.insertInto('sources').values({
      analysis_status: 'pending',
    }).executeTakeFirstOrThrow();
    const sourceId = Number(result.insertId);

    const provider = new MockLlmProvider();
    await service.analyzeSource(sourceId, provider);

    const source = await db.selectFrom('sources').selectAll().where('id', '=', sourceId).executeTakeFirstOrThrow();
    expect(source.analysis_status).toBe('failed');
  });
});
