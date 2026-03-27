import type { Kysely } from 'kysely';
import type { Database, Draft } from '../db/types.js';
import { ScheduleService, type ScheduleSlot, type TimeRestrictions } from './schedule-service.js';

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export class QueueService {
  constructor(
    private db: Kysely<Database>,
    private scheduleService: ScheduleService,
  ) {}

  async getNextAvailableSlot(): Promise<Date | null> {
    const schedule = await this.scheduleService.getSchedule();
    if (schedule.slots.length === 0) return null;

    const restrictions = await this.scheduleService.getTimeRestrictions();
    const now = new Date();

    // Get all already-scheduled times to avoid conflicts
    const queued = await this.db
      .selectFrom('drafts')
      .select('scheduled_at')
      .where('published_status', '=', 'queued')
      .where('scheduled_at', 'is not', null)
      .execute();
    const takenTimes = new Set(queued.map((q) => q.scheduled_at));

    // Try to find the next available slot over the next 4 weeks
    for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
      for (const slot of schedule.slots) {
        const candidate = this.resolveSlotToDate(slot, now, weekOffset, restrictions);
        if (
          candidate &&
          candidate > now &&
          !takenTimes.has(Math.floor(candidate.getTime() / 1000))
        ) {
          return candidate;
        }
      }
    }

    return null;
  }

  private resolveSlotToDate(
    slot: ScheduleSlot,
    now: Date,
    weekOffset: number,
    restrictions: TimeRestrictions,
  ): Date | null {
    const targetDayIndex = DAY_INDEX[slot.day];
    if (targetDayIndex === undefined) return null;

    const currentDay = now.getDay();
    let daysUntil = targetDayIndex - currentDay;
    if (daysUntil < 0) daysUntil += 7;
    daysUntil += weekOffset * 7;

    const [hours, minutes] = slot.time.split(':').map(Number);
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + daysUntil);
    candidate.setHours(hours!, minutes!, 0, 0);

    // Apply time restrictions
    const effectiveTime = this.scheduleService.getNextAllowedTime(slot.time, restrictions);
    if (effectiveTime !== slot.time) {
      const [rh, rm] = effectiveTime.split(':').map(Number);
      candidate.setHours(rh!, rm!, 0, 0);
    }

    return candidate;
  }

  async queueDraft(draftId: number): Promise<Draft> {
    const draft = await this.db
      .selectFrom('drafts')
      .selectAll()
      .where('id', '=', draftId)
      .executeTakeFirst();

    if (!draft) throw new Error('Draft not found');
    if (!draft.content) throw new Error('Draft has no content');
    if (draft.content.length > 280) throw new Error('Draft exceeds 280 character limit');
    if (draft.published_status === 'published') throw new Error('Draft already published');
    if (draft.published_status === 'queued') throw new Error('Draft already queued');

    const nextSlot = await this.getNextAvailableSlot();
    if (!nextSlot) throw new Error('No publishing schedule configured — set one in Settings');

    await this.db
      .updateTable('drafts')
      .set({
        published_status: 'queued',
        scheduled_at: Math.floor(nextSlot.getTime() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
      })
      .where('id', '=', draftId)
      .execute();

    return this.db
      .selectFrom('drafts')
      .selectAll()
      .where('id', '=', draftId)
      .executeTakeFirstOrThrow();
  }

  async unqueueDraft(draftId: number): Promise<Draft> {
    await this.db
      .updateTable('drafts')
      .set({
        published_status: null,
        scheduled_at: null,
        updated_at: Math.floor(Date.now() / 1000),
      })
      .where('id', '=', draftId)
      .execute();

    return this.db
      .selectFrom('drafts')
      .selectAll()
      .where('id', '=', draftId)
      .executeTakeFirstOrThrow();
  }

  async getQueuedDrafts(): Promise<Draft[]> {
    return this.db
      .selectFrom('drafts')
      .selectAll()
      .where('published_status', '=', 'queued')
      .where('scheduled_at', 'is not', null)
      .orderBy('scheduled_at', 'asc')
      .execute();
  }
}
