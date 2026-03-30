import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import {
  createTestDatabase as createDatabase,
  migrateTestDatabase as migrateDatabase,
} from '../db/test-database.js';
import type { Database } from '../db/types.js';
import type { Kysely } from 'kysely';
import { SettingsService } from './settings-service.js';
import { XPublishingService } from './x-publishing-service.js';
import { ThreadsPublishingService } from './threads-publishing-service.js';
import { PublishingEngine } from './publishing-engine.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('PublishingEngine', () => {
  let db: Kysely<Database>;
  let dbPath: string;
  let settings: SettingsService;
  let xPublishing: XPublishingService;
  let threadsPublishing: ThreadsPublishingService;
  let engine: PublishingEngine;

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `speak-test-engine-${Date.now()}.db`);
    db = createDatabase(dbPath);
    await migrateDatabase(db);
    settings = new SettingsService(db);
    xPublishing = new XPublishingService(settings);
    threadsPublishing = new ThreadsPublishingService(settings);
    engine = new PublishingEngine(db, xPublishing, threadsPublishing);
  });

  afterEach(async () => {
    engine.stop();
    await db.destroy();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  async function createQueuedDraft(content: string, scheduledAt: number): Promise<number> {
    const source = await db
      .insertInto('sources')
      .values({ analysis_status: 'complete' })
      .executeTakeFirstOrThrow();
    const draft = await db
      .insertInto('drafts')
      .values({
        source_id: Number(source.insertId),
        content,
        status: 'draft',
        published_status: 'queued',
        scheduled_at: scheduledAt,
      })
      .executeTakeFirstOrThrow();
    return Number(draft.insertId);
  }

  it('should process no drafts when none are due', async () => {
    const count = await engine.processDuePublications();
    expect(count).toBe(0);
  });

  it('should mark draft as failed when X credentials are missing', async () => {
    const futureTime = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
    const draftId = await createQueuedDraft('Test tweet', futureTime);

    const count = await engine.processDuePublications();
    expect(count).toBe(0);

    const draft = await db
      .selectFrom('drafts')
      .selectAll()
      .where('id', '=', draftId)
      .executeTakeFirstOrThrow();
    expect(draft.published_status).toBe('failed');
  });

  it('should not process drafts scheduled in the future', async () => {
    const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    await createQueuedDraft('Future tweet', futureTime);

    const count = await engine.processDuePublications();
    expect(count).toBe(0);
  });

  it('should not process drafts without content', async () => {
    const source = await db
      .insertInto('sources')
      .values({ analysis_status: 'complete' })
      .executeTakeFirstOrThrow();
    const draft = await db
      .insertInto('drafts')
      .values({
        source_id: Number(source.insertId),
        content: null,
        status: 'draft',
        published_status: 'queued',
        scheduled_at: Math.floor(Date.now() / 1000) - 60,
      })
      .executeTakeFirstOrThrow();

    const count = await engine.processDuePublications();
    expect(count).toBe(0);

    const updated = await db
      .selectFrom('drafts')
      .selectAll()
      .where('id', '=', Number(draft.insertId))
      .executeTakeFirstOrThrow();
    expect(updated.published_status).toBe('failed');
  });

  it('should handle rate limit errors by rescheduling', async () => {
    // Mock publishTweet to throw rate limit error
    vi.spyOn(xPublishing, 'publishTweet').mockRejectedValueOnce(
      new Error('X API rate limit reached — try again later'),
    );

    const pastTime = Math.floor(Date.now() / 1000) - 60;
    const draftId = await createQueuedDraft('Rate limited tweet', pastTime);

    // Set up credentials so we get past the hasCredentials check
    await xPublishing.saveCredentials({
      apiKey: 'k',
      apiSecret: 's',
      accessToken: 't',
      accessTokenSecret: 'ts',
    });

    const count = await engine.processDuePublications();
    expect(count).toBe(0);

    const draft = await db
      .selectFrom('drafts')
      .selectAll()
      .where('id', '=', draftId)
      .executeTakeFirstOrThrow();
    // Should still be queued (rescheduled, not failed)
    expect(draft.published_status).toBe('queued');
    expect(draft.scheduled_at!).toBeGreaterThan(pastTime);
  });
});
