import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createDatabase, migrateDatabase } from '../db/database.js';
import type { Database } from '../db/types.js';
import type { Kysely } from 'kysely';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('Profile (voice_profiles table)', () => {
  let db: Kysely<Database>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = path.join(
      os.tmpdir(),
      `speak-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
    );
    db = createDatabase(dbPath);
    await migrateDatabase(db);
  });

  afterEach(async () => {
    await db.destroy();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('should create a voice profile', async () => {
    await db
      .insertInto('voice_profiles')
      .values({
        voice_description: 'Direct, technical, no buzzwords',
        example_posts: 'Post 1\n---\nPost 2',
        general_opinions: 'AI hype is overblown',
      })
      .execute();

    const profile = await db.selectFrom('voice_profiles').selectAll().executeTakeFirst();
    expect(profile).toBeDefined();
    expect(profile!.voice_description).toBe('Direct, technical, no buzzwords');
    expect(profile!.example_posts).toBe('Post 1\n---\nPost 2');
    expect(profile!.general_opinions).toBe('AI hype is overblown');
  });

  it('should update an existing profile', async () => {
    await db
      .insertInto('voice_profiles')
      .values({
        voice_description: 'Original',
      })
      .execute();

    const profile = await db.selectFrom('voice_profiles').select('id').executeTakeFirstOrThrow();

    await db
      .updateTable('voice_profiles')
      .set({ voice_description: 'Updated' })
      .where('id', '=', profile.id)
      .execute();

    const updated = await db.selectFrom('voice_profiles').selectAll().executeTakeFirstOrThrow();
    expect(updated.voice_description).toBe('Updated');
  });
});
