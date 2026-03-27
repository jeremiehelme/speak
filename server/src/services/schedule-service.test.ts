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

  it('should return default time restrictions when none set', async () => {
    const restrictions = await scheduleService.getTimeRestrictions();
    expect(restrictions.start).toBeNull();
    expect(restrictions.end).toBeNull();
    expect(restrictions.timezone).toBeTruthy();
  });

  it('should save and retrieve time restrictions', async () => {
    await scheduleService.saveTimeRestrictions({
      start: '08:00',
      end: '18:00',
      timezone: 'America/New_York',
    });

    const restrictions = await scheduleService.getTimeRestrictions();
    expect(restrictions.start).toBe('08:00');
    expect(restrictions.end).toBe('18:00');
    expect(restrictions.timezone).toBe('America/New_York');
  });

  it('should allow time within restriction window', () => {
    const restrictions = { start: '08:00', end: '18:00', timezone: 'UTC' };
    expect(scheduleService.isTimeAllowed('09:00', restrictions)).toBe(true);
    expect(scheduleService.isTimeAllowed('18:00', restrictions)).toBe(true);
  });

  it('should reject time outside restriction window', () => {
    const restrictions = { start: '08:00', end: '18:00', timezone: 'UTC' };
    expect(scheduleService.isTimeAllowed('07:00', restrictions)).toBe(false);
    expect(scheduleService.isTimeAllowed('19:00', restrictions)).toBe(false);
  });

  it('should allow any time when no restrictions set', () => {
    const restrictions = { start: null, end: null, timezone: 'UTC' };
    expect(scheduleService.isTimeAllowed('03:00', restrictions)).toBe(true);
  });

  it('should snap to restriction start when outside window', () => {
    const restrictions = { start: '08:00', end: '18:00', timezone: 'UTC' };
    expect(scheduleService.getNextAllowedTime('06:00', restrictions)).toBe('08:00');
  });

  it('should return same time when within window', () => {
    const restrictions = { start: '08:00', end: '18:00', timezone: 'UTC' };
    expect(scheduleService.getNextAllowedTime('12:00', restrictions)).toBe('12:00');
  });
});
