import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';
import { XPublishingService } from './x-publishing-service.js';
import { ThreadsPublishingService } from './threads-publishing-service.js';
import { SettingsService } from './settings-service.js';

export class PublishingEngine {
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private db: Kysely<Database>,
    private xPublishing: XPublishingService,
    private threadsPublishing: ThreadsPublishingService,
  ) {}

  /** Start the publishing engine for local dev — checks every minute */
  start(): void {
    if (this.interval) return;

    // Check every minute
    this.interval = setInterval(() => {
      this.processDuePublications().catch((err) => {
        console.error('[PublishingEngine] Error processing publications:', err);
      });
    }, 60_000);

    // Also process immediately on start (catch up on missed publications)
    this.processDuePublications().catch((err) => {
      console.error('[PublishingEngine] Error on startup processing:', err);
    });

    console.log('[PublishingEngine] Started — checking every minute for due publications');
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('[PublishingEngine] Stopped');
    }
  }

  async processDuePublications(): Promise<number> {
    const now = Math.floor(Date.now() / 1000);

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
        const result =
          draft.platform === 'threads'
            ? await this.threadsPublishing.publishPost(draft.content)
            : await this.xPublishing.publishTweet(draft.content);

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

        if (message.includes('rate limit')) {
          console.warn(`[PublishingEngine] Rate limited on draft ${draft.id} — will retry`);
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
  const threadsPublishing = new ThreadsPublishingService(settings);
  return new PublishingEngine(db, xPublishing, threadsPublishing);
}
