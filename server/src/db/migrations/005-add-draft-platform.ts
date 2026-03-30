import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE drafts ADD COLUMN platform TEXT DEFAULT NULL`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`SELECT 1`.execute(db);
}
