import { describe, it, expect, afterEach } from 'vitest';
import { createDatabase, migrateDatabase } from './database.js';
import type { Database } from './types.js';
import { sql, type Kysely } from 'kysely';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('Database', () => {
  let db: Kysely<Database>;
  let dbPath: string;

  afterEach(async () => {
    if (db) await db.destroy();
    if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should create database and run migrations', async () => {
    dbPath = path.join(os.tmpdir(), `speak-test-${Date.now()}.db`);
    db = createDatabase(dbPath);
    await migrateDatabase(db);

    // Verify tables exist by inserting and querying
    await db.insertInto('sources').values({
      url: 'https://example.com',
      analysis_status: 'pending',
    }).execute();

    const sources = await db.selectFrom('sources').selectAll().execute();
    expect(sources).toHaveLength(1);
    expect(sources[0]!.url).toBe('https://example.com');
    expect(sources[0]!.analysis_status).toBe('pending');
  });

  it('should create all four tables', async () => {
    dbPath = path.join(os.tmpdir(), `speak-test-${Date.now()}.db`);
    db = createDatabase(dbPath);
    await migrateDatabase(db);

    // Test all tables by inserting
    await db.insertInto('settings').values({ key: 'test_key', value: 'test_value' }).execute();
    const settings = await db.selectFrom('settings').selectAll().execute();
    expect(settings).toHaveLength(1);

    await db.insertInto('voice_profiles').values({ voice_description: 'test' }).execute();
    const profiles = await db.selectFrom('voice_profiles').selectAll().execute();
    expect(profiles).toHaveLength(1);

    await db.insertInto('sources').values({ analysis_status: 'pending' }).execute();
    const source = await db.selectFrom('sources').selectAll().executeTakeFirstOrThrow();

    await db.insertInto('drafts').values({ source_id: source.id, status: 'draft' }).execute();
    const drafts = await db.selectFrom('drafts').selectAll().execute();
    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.source_id).toBe(source.id);
  });

  it('should cascade delete drafts when source is deleted', async () => {
    dbPath = path.join(os.tmpdir(), `speak-test-${Date.now()}.db`);
    db = createDatabase(dbPath);
    await migrateDatabase(db);

    // Enable foreign keys for SQLite
    await sql`PRAGMA foreign_keys = ON`.execute(db);

    const result = await db.insertInto('sources').values({ analysis_status: 'pending' }).executeTakeFirstOrThrow();
    const sourceId = Number(result.insertId);

    await db.insertInto('drafts').values({ source_id: sourceId, status: 'draft' }).execute();
    await db.deleteFrom('sources').where('id', '=', sourceId).execute();

    const drafts = await db.selectFrom('drafts').selectAll().execute();
    expect(drafts).toHaveLength(0);
  });
});
