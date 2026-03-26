import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createDatabase, migrateDatabase } from '../db/database.js';
import type { Database } from '../db/types.js';
import { sql, type Kysely } from 'kysely';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('Sources (database operations)', () => {
  let db: Kysely<Database>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `speak-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    db = createDatabase(dbPath);
    await migrateDatabase(db);
  });

  afterEach(async () => {
    await db.destroy();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should list sources ordered by created_at desc', async () => {
    await db.insertInto('sources').values({ title: 'First', analysis_status: 'complete' }).execute();
    await db.insertInto('sources').values({ title: 'Second', analysis_status: 'complete' }).execute();

    const sources = await db.selectFrom('sources').selectAll().orderBy('id', 'desc').execute();
    expect(sources).toHaveLength(2);
    expect(sources[0]!.title).toBe('Second');
  });

  it('should search sources by title', async () => {
    await db.insertInto('sources').values({ title: 'AI Agents Guide', analysis_status: 'complete' }).execute();
    await db.insertInto('sources').values({ title: 'React Basics', analysis_status: 'complete' }).execute();

    const term = '%AI%';
    const sources = await db.selectFrom('sources').selectAll()
      .where('title', 'like', term)
      .execute();
    expect(sources).toHaveLength(1);
    expect(sources[0]!.title).toBe('AI Agents Guide');
  });

  it('should delete a source and cascade drafts', async () => {
    await sql`PRAGMA foreign_keys = ON`.execute(db);

    const sourceResult = await db.insertInto('sources').values({
      title: 'To Delete',
      analysis_status: 'complete',
    }).executeTakeFirstOrThrow();
    const sourceId = Number(sourceResult.insertId);

    await db.insertInto('drafts').values({
      source_id: sourceId,
      content: 'Draft content',
      status: 'draft',
    }).execute();

    await db.deleteFrom('sources').where('id', '=', sourceId).execute();

    const sources = await db.selectFrom('sources').selectAll().execute();
    expect(sources).toHaveLength(0);

    const drafts = await db.selectFrom('drafts').selectAll().execute();
    expect(drafts).toHaveLength(0);
  });
});
