import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createDatabase, migrateDatabase } from '../db/database.js';
import type { Database } from '../db/types.js';
import type { Kysely } from 'kysely';
import { SettingsService } from './settings-service.js';
import { ScheduleService } from './schedule-service.js';
import { QueueService } from './queue-service.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('QueueService', () => {
  let db: Kysely<Database>;
  let dbPath: string;
  let settings: SettingsService;
  let scheduleService: ScheduleService;
  let queueService: QueueService;

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `speak-test-queue-${Date.now()}.db`);
    db = createDatabase(dbPath);
    await migrateDatabase(db);
    settings = new SettingsService(db);
    scheduleService = new ScheduleService(settings);
    queueService = new QueueService(db, scheduleService);
  });

  afterEach(async () => {
    await db.destroy();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  async function createTestDraft(content: string = 'Test tweet'): Promise<number> {
    // Create a source first
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
      })
      .executeTakeFirstOrThrow();
    return Number(draft.insertId);
  }

  it('should return null for next slot when no schedule configured', async () => {
    const slot = await queueService.getNextAvailableSlot();
    expect(slot).toBeNull();
  });

  it('should return a slot when schedule is configured', async () => {
    await scheduleService.saveSchedule({
      slots: [
        { day: 'monday', time: '09:00' },
        { day: 'wednesday', time: '12:00' },
        { day: 'friday', time: '09:00' },
      ],
    });
    const slot = await queueService.getNextAvailableSlot();
    expect(slot).toBeInstanceOf(Date);
    expect(slot!.getTime()).toBeGreaterThan(Date.now());
  });

  it('should queue a draft successfully', async () => {
    await scheduleService.saveSchedule({
      slots: [
        { day: 'monday', time: '09:00' },
        { day: 'friday', time: '14:00' },
      ],
    });
    const draftId = await createTestDraft();
    const queued = await queueService.queueDraft(draftId);
    expect(queued.published_status).toBe('queued');
    expect(queued.scheduled_at).toBeTruthy();
  });

  it('should reject queueing a draft with no content', async () => {
    await scheduleService.saveSchedule({ slots: [{ day: 'monday', time: '09:00' }] });
    const source = await db
      .insertInto('sources')
      .values({ analysis_status: 'complete' })
      .executeTakeFirstOrThrow();
    const draft = await db
      .insertInto('drafts')
      .values({ source_id: Number(source.insertId), content: null, status: 'draft' })
      .executeTakeFirstOrThrow();
    await expect(queueService.queueDraft(Number(draft.insertId))).rejects.toThrow(
      'Draft has no content',
    );
  });

  it('should reject queueing a draft over 280 chars', async () => {
    await scheduleService.saveSchedule({ slots: [{ day: 'monday', time: '09:00' }] });
    const draftId = await createTestDraft('x'.repeat(281));
    await expect(queueService.queueDraft(draftId)).rejects.toThrow('280 character limit');
  });

  it('should unqueue a draft', async () => {
    await scheduleService.saveSchedule({ slots: [{ day: 'monday', time: '09:00' }] });
    const draftId = await createTestDraft();
    await queueService.queueDraft(draftId);
    const unqueued = await queueService.unqueueDraft(draftId);
    expect(unqueued.published_status).toBeNull();
    expect(unqueued.scheduled_at).toBeNull();
  });

  it('should list queued drafts in order', async () => {
    await scheduleService.saveSchedule({
      slots: [
        { day: 'monday', time: '09:00' },
        { day: 'tuesday', time: '09:00' },
        { day: 'wednesday', time: '09:00' },
        { day: 'thursday', time: '09:00' },
        { day: 'friday', time: '09:00' },
      ],
    });
    const id1 = await createTestDraft('First');
    const id2 = await createTestDraft('Second');
    await queueService.queueDraft(id1);
    await queueService.queueDraft(id2);
    const queued = await queueService.getQueuedDrafts();
    expect(queued).toHaveLength(2);
    expect(queued[0]!.scheduled_at! <= queued[1]!.scheduled_at!).toBe(true);
  });

  it('should throw when no schedule configured', async () => {
    const draftId = await createTestDraft();
    await expect(queueService.queueDraft(draftId)).rejects.toThrow('No publishing schedule');
  });
});
