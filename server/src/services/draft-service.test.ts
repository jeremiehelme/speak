import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createDatabase, migrateDatabase } from '../db/database.js';
import type { Database } from '../db/types.js';
import type { Kysely } from 'kysely';
import { DraftService } from './draft-service.js';
import { SettingsService } from './settings-service.js';
import type { LlmProvider, LlmRequest, LlmResponse } from '../llm/llm-provider.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

class MockDraftProvider implements LlmProvider {
  lastRequest: LlmRequest | null = null;

  async complete(request: LlmRequest): Promise<LlmResponse> {
    this.lastRequest = request;
    return { content: 'AI agents are overhyped. Ship simple things first.' };
  }
}

describe('DraftService', () => {
  let db: Kysely<Database>;
  let dbPath: string;
  let service: DraftService;

  beforeEach(async () => {
    dbPath = path.join(
      os.tmpdir(),
      `speak-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
    );
    db = createDatabase(dbPath);
    await migrateDatabase(db);
    const settingsService = new SettingsService(db);
    service = new DraftService(db, settingsService);

    // Create a voice profile
    await db
      .insertInto('voice_profiles')
      .values({
        voice_description: 'Direct, technical',
        example_posts: 'Ship fast, iterate.',
        general_opinions: 'Simplicity wins.',
      })
      .execute();
  });

  afterEach(async () => {
    await db.destroy();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should generate a draft for a source with angle', async () => {
    const sourceResult = await db
      .insertInto('sources')
      .values({
        analysis_status: 'complete',
        analysis_summary: 'About AI agents.',
        themes: JSON.stringify(['AI']),
        opinion: 'I think agents are overhyped.',
      })
      .executeTakeFirstOrThrow();
    const sourceId = Number(sourceResult.insertId);

    const provider = new MockDraftProvider();
    const draft = await service.generateDraft(sourceId, 'The contrarian take', provider);

    expect(draft.content).toBe('AI agents are overhyped. Ship simple things first.');
    expect(draft.angle).toBe('The contrarian take');
    expect(draft.source_id).toBe(sourceId);
    expect(draft.status).toBe('draft');

    // Verify voice context was used in the prompt
    expect(provider.lastRequest!.system).toContain('Direct, technical');
    expect(provider.lastRequest!.messages[0]!.content).toContain('Ship fast, iterate.');
  });

  it('should update draft content', async () => {
    const sourceResult = await db
      .insertInto('sources')
      .values({
        analysis_status: 'complete',
      })
      .executeTakeFirstOrThrow();
    const draftResult = await db
      .insertInto('drafts')
      .values({
        source_id: Number(sourceResult.insertId),
        content: 'Original draft',
        status: 'draft',
      })
      .executeTakeFirstOrThrow();

    const updated = await service.updateDraft(Number(draftResult.insertId), 'Edited draft');
    expect(updated.content).toBe('Edited draft');
  });

  it('should regenerate a draft with feedback', async () => {
    const sourceResult = await db
      .insertInto('sources')
      .values({
        analysis_status: 'complete',
        analysis_summary: 'About AI.',
        themes: JSON.stringify(['AI']),
      })
      .executeTakeFirstOrThrow();
    const sourceId = Number(sourceResult.insertId);

    const draftResult = await db
      .insertInto('drafts')
      .values({
        source_id: sourceId,
        angle: 'Original angle',
        content: 'Too generic draft',
        status: 'draft',
      })
      .executeTakeFirstOrThrow();

    const provider = new MockDraftProvider();
    const regenerated = await service.regenerateDraft(
      Number(draftResult.insertId),
      'Make it more technical',
      null,
      provider,
    );

    expect(regenerated.content).toBe('AI agents are overhyped. Ship simple things first.');
    expect(regenerated.feedback).toBe('Make it more technical');
  });
});
