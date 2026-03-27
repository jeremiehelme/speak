import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE drafts ADD COLUMN published_status TEXT DEFAULT NULL`.execute(db);
  await sql`ALTER TABLE drafts ADD COLUMN published_url TEXT DEFAULT NULL`.execute(db);
  await sql`ALTER TABLE drafts ADD COLUMN published_at INTEGER DEFAULT NULL`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // SQLite does not support DROP COLUMN in older versions
  // This is a best-effort down migration
  await sql`SELECT 1`.execute(db);
}
