import SQLite from 'better-sqlite3';
import { Kysely, Migrator, SqliteDialect, type Migration, type MigrationProvider } from 'kysely';
import { sql } from 'kysely';
import type { Database } from './types.js';

/**
 * SQLite-based test database factory.
 * Uses SQLite in-memory or temp files for fast, isolated tests.
 * The schema mirrors the PostgreSQL production schema.
 */

class TestMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    return {
      '001-initial-schema': {
        async up(db: Kysely<unknown>) {
          await db.schema
            .createTable('sources')
            .ifNotExists()
            .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
            .addColumn('url', 'text')
            .addColumn('title', 'text')
            .addColumn('raw_text', 'text')
            .addColumn('extracted_content', 'text')
            .addColumn('analysis_summary', 'text')
            .addColumn('category', 'text')
            .addColumn('themes', 'text')
            .addColumn('takeaways', 'text')
            .addColumn('relevance', 'text')
            .addColumn('opinion', 'text')
            .addColumn('analysis_status', 'text', (col) => col.notNull().defaultTo('pending'))
            .addColumn('targeted_questions', 'text')
            .addColumn('targeted_answers', 'text')
            .addColumn('angles', 'text')
            .addColumn('created_at', 'integer', (col) =>
              col.notNull().defaultTo(sql`(unixepoch())`),
            )
            .addColumn('updated_at', 'integer', (col) =>
              col.notNull().defaultTo(sql`(unixepoch())`),
            )
            .execute();

          await db.schema
            .createTable('drafts')
            .ifNotExists()
            .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
            .addColumn('source_id', 'integer', (col) =>
              col.notNull().references('sources.id').onDelete('cascade'),
            )
            .addColumn('angle', 'text')
            .addColumn('content', 'text')
            .addColumn('feedback', 'text')
            .addColumn('status', 'text', (col) => col.notNull().defaultTo('draft'))
            .addColumn('published_status', 'text')
            .addColumn('published_url', 'text')
            .addColumn('published_at', 'integer')
            .addColumn('scheduled_at', 'integer')
            .addColumn('platform', 'text')
            .addColumn('created_at', 'integer', (col) =>
              col.notNull().defaultTo(sql`(unixepoch())`),
            )
            .addColumn('updated_at', 'integer', (col) =>
              col.notNull().defaultTo(sql`(unixepoch())`),
            )
            .execute();

          await db.schema
            .createTable('voice_profiles')
            .ifNotExists()
            .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
            .addColumn('voice_description', 'text')
            .addColumn('example_posts', 'text')
            .addColumn('general_opinions', 'text')
            .addColumn('created_at', 'integer', (col) =>
              col.notNull().defaultTo(sql`(unixepoch())`),
            )
            .addColumn('updated_at', 'integer', (col) =>
              col.notNull().defaultTo(sql`(unixepoch())`),
            )
            .execute();

          await db.schema
            .createTable('settings')
            .ifNotExists()
            .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
            .addColumn('key', 'text', (col) => col.notNull().unique())
            .addColumn('value', 'text', (col) => col.notNull())
            .addColumn('created_at', 'integer', (col) =>
              col.notNull().defaultTo(sql`(unixepoch())`),
            )
            .addColumn('updated_at', 'integer', (col) =>
              col.notNull().defaultTo(sql`(unixepoch())`),
            )
            .execute();
        },
        async down(_db: Kysely<unknown>) {},
      },
    };
  }
}

export function createTestDatabase(dbPath: string): Kysely<Database> {
  const dialect = new SqliteDialect({
    database: new SQLite(dbPath),
  });
  return new Kysely<Database>({ dialect });
}

export async function migrateTestDatabase(db: Kysely<Database>): Promise<void> {
  const migrator = new Migrator({
    db,
    provider: new TestMigrationProvider(),
  });

  const { error } = await migrator.migrateToLatest();
  if (error) throw error;
}
