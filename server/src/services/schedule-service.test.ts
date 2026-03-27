import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createDatabase, migrateDatabase } from '../db/database.js';
import type { Database } from '../db/types.js';
import type { Kysely } from 'kysely';
import { SettingsService } from './settings-service.js';
import { ScheduleService } from './schedule-service.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('ScheduleService', () => {
  let db: Kysely<Database>;
  let dbPath: string;
  let settings: SettingsService;
  let scheduleService: ScheduleService;

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `speak-test-sched-${Date.now()}.db`);
    db = createDatabase(dbPath);
    await migrateDatabase(db);
    settings = new SettingsService(db);
    scheduleService = new ScheduleService(settings);
  });

  afterEach(async () => {
    await db.destroy();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should return empty schedule when none configured', async () => {
    const schedule = await scheduleService.getSchedule();
    expect(schedule.slots).toEqual([]);
  });

  it('should save and retrieve a schedule', async () => {
    await scheduleService.saveSchedule({
      slots: [
        { day: 'monday', time: '09:00' },
        { day: 'friday', time: '14:00' },
      ],
    });

    const schedule = await scheduleService.getSchedule();
    expect(schedule.slots).toHaveLength(2);
    expect(schedule.slots[0]).toEqual({ day: 'monday', time: '09:00' });
    expect(schedule.slots[1]).toEqual({ day: 'friday', time: '14:00' });
  });

  it('should sort slots by day order', async () => {
    await scheduleService.saveSchedule({
      slots: [
        { day: 'friday', time: '09:00' },
        { day: 'monday', time: '09:00' },
        { day: 'wednesday', time: '09:00' },
      ],
    });

    const schedule = await scheduleService.getSchedule();
    expect(schedule.slots.map((s) => s.day)).toEqual(['monday', 'wednesday', 'friday']);
  });

  it('should reject invalid day', async () => {
    await expect(
      scheduleService.saveSchedule({ slots: [{ day: 'notaday', time: '09:00' }] }),
    ).rejects.toThrow('Invalid day: notaday');
  });

  it('should reject invalid time format', async () => {
    await expect(
      scheduleService.saveSchedule({ slots: [{ day: 'monday', time: '9am' }] }),
    ).rejects.toThrow('Invalid time format: 9am');
  });

  it('should provide optimal defaults', () => {
    const defaults = scheduleService.getOptimalDefaults();
    expect(defaults.length).toBeGreaterThan(0);
    expect(defaults[0]).toHaveProperty('day');
    expect(defaults[0]).toHaveProperty('time');
  });
});
