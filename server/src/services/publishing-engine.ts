import cron from 'node-cron';
import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';
import { XPublishingService } from './x-publishing-service.js';
import { SettingsService } from './settings-service.js';

export class PublishingEngine {
  private task: cron.ScheduledTask | null = null;

  constructor(
    private db: Kysely<Database>,
    private xPublishing: XPublishingService,
  ) {}

  /** Start the publishing engine — checks every minute for due drafts */
  start(): void {
    if (this.task) return;

    // Run every minute
    this.task = cron.schedule('* * * * *', () => {
      this.processDuePublications().catch((err) => {
        console.error('[PublishingEngine] Error processing publications:', err);
      });
    });

    // Also process immediately on start (catch up on missed publications)
    this.processDuePublications().catch((err) => {
      console.error('[PublishingEngine] Error on startup processing:', err);
    });

    console.log('[PublishingEngine] Started — checking every minute for due publications');
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('[PublishingEngine] Stopped');
    }
  }

  async processDuePublications(): Promise<number> {
    const now = Math.floor(Date.now() / 1000);

    // Find all queued drafts that are due
    const dueDrafts = await this.db
      .selectFrom('drafts')
      .selectAll()
      .where('published_status', '=', 'queued')
      .where('scheduled_at', '<=', now)
      .where('scheduled_at', 'is not', null)
      .orderBy('scheduled_at', 'asc')
      .execute();

    let publishedCount = 0;

    for (const draft of dueDrafts) {
      if (!draft.content) {
        await this.markFailed(draft.id, 'Draft has no content');
        continue;
      }

      try {
        const result = await this.xPublishing.publishTweet(draft.content);

        await this.db
          .updateTable('drafts')
          .set({
            published_status: 'published',
            published_url: result.url,
            published_at: Math.floor(Date.now() / 1000),
            updated_at: Math.floor(Date.now() / 1000),
          })
          .where('id', '=', draft.id)
          .execute();

        publishedCount++;
        console.log(`[PublishingEngine] Published draft ${draft.id} → ${result.url}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';

        // Check for rate limit — retry later
        if (message.includes('rate limit')) {
          console.warn(`[PublishingEngine] Rate limited on draft ${draft.id} — will retry`);
          // Push scheduled_at forward by 15 minutes for retry
          await this.db
            .updateTable('drafts')
            .set({
              scheduled_at: now + 15 * 60,
              updated_at: Math.floor(Date.now() / 1000),
            })
            .where('id', '=', draft.id)
            .execute();
        } else {
          await this.markFailed(draft.id, message);
          console.error(`[PublishingEngine] Failed to publish draft ${draft.id}: ${message}`);
        }
      }
    }

    return publishedCount;
  }

  private async markFailed(draftId: number, reason: string): Promise<void> {
    await this.db
      .updateTable('drafts')
      .set({
        published_status: 'failed',
        feedback: reason,
        updated_at: Math.floor(Date.now() / 1000),
      })
      .where('id', '=', draftId)
      .execute();
  }
}

export function createPublishingEngine(db: Kysely<Database>): PublishingEngine {
  const settings = new SettingsService(db);
  const xPublishing = new XPublishingService(settings);
  return new PublishingEngine(db, xPublishing);
}
