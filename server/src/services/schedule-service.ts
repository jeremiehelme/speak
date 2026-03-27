import { SettingsService } from './settings-service.js';

export interface ScheduleSlot {
  day: string;
  time: string;
}

export interface PublishingSchedule {
  slots: ScheduleSlot[];
}

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const OPTIMAL_DEFAULTS: ScheduleSlot[] = [
  { day: 'tuesday', time: '09:00' },
  { day: 'thursday', time: '12:00' },
];

export class ScheduleService {
  constructor(private settings: SettingsService) {}

  async getSchedule(): Promise<PublishingSchedule> {
    const raw = await this.settings.get('publishing_schedule');
    if (!raw) {
      return { slots: [] };
    }
    try {
      return JSON.parse(raw) as PublishingSchedule;
    } catch {
      return { slots: [] };
    }
  }

  async saveSchedule(schedule: PublishingSchedule): Promise<void> {
    // Validate days
    for (const slot of schedule.slots) {
      if (!DAYS_OF_WEEK.includes(slot.day as (typeof DAYS_OF_WEEK)[number])) {
        throw new Error(`Invalid day: ${slot.day}`);
      }
      if (!/^\d{2}:\d{2}$/.test(slot.time)) {
        throw new Error(`Invalid time format: ${slot.time} (expected HH:MM)`);
      }
    }

    // Sort by day order then time
    schedule.slots.sort((a, b) => {
      const dayDiff =
        DAYS_OF_WEEK.indexOf(a.day as (typeof DAYS_OF_WEEK)[number]) -
        DAYS_OF_WEEK.indexOf(b.day as (typeof DAYS_OF_WEEK)[number]);
      if (dayDiff !== 0) return dayDiff;
      return a.time.localeCompare(b.time);
    });

    await this.settings.set('publishing_schedule', JSON.stringify(schedule));
  }

  getOptimalDefaults(): ScheduleSlot[] {
    return OPTIMAL_DEFAULTS;
  }

  getDaysOfWeek(): readonly string[] {
    return DAYS_OF_WEEK;
  }

  async getTimeRestrictions(): Promise<TimeRestrictions> {
    const start = await this.settings.get('restriction_start');
    const end = await this.settings.get('restriction_end');
    const timezone = await this.settings.get('timezone');
    return {
      start: start ?? null,
      end: end ?? null,
      timezone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  async saveTimeRestrictions(restrictions: TimeRestrictions): Promise<void> {
    if (restrictions.start !== null) {
      if (!/^\d{2}:\d{2}$/.test(restrictions.start)) {
        throw new Error(`Invalid start time format: ${restrictions.start} (expected HH:MM)`);
      }
      await this.settings.set('restriction_start', restrictions.start);
    }
    if (restrictions.end !== null) {
      if (!/^\d{2}:\d{2}$/.test(restrictions.end)) {
        throw new Error(`Invalid end time format: ${restrictions.end} (expected HH:MM)`);
      }
      await this.settings.set('restriction_end', restrictions.end);
    }
    if (restrictions.timezone) {
      await this.settings.set('timezone', restrictions.timezone);
    }
  }

  /** Check if a given HH:MM time falls within the allowed publishing window */
  isTimeAllowed(time: string, restrictions: TimeRestrictions): boolean {
    if (!restrictions.start || !restrictions.end) return true;
    return time >= restrictions.start && time <= restrictions.end;
  }

  /** Given a target time, return the next allowed time within the restriction window */
  getNextAllowedTime(time: string, restrictions: TimeRestrictions): string {
    if (this.isTimeAllowed(time, restrictions)) return time;
    // If outside window, snap to the start of the next window
    return restrictions.start ?? time;
  }
}

export interface TimeRestrictions {
  start: string | null;
  end: string | null;
  timezone: string;
}
