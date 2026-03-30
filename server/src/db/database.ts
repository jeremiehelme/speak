import pg from 'pg';
import { Kysely, Migrator, PostgresDialect, type Migration, type MigrationProvider } from 'kysely';
import type { Database } from './types.js';

const { Pool } = pg;

class CustomMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    const migration001 = await import('./migrations/001-initial-schema.js');
    const migration002 = await import('./migrations/002-add-targeted-questions.js');
    const migration003 = await import('./migrations/003-add-draft-publishing-fields.js');
    const migration004 = await import('./migrations/004-add-draft-scheduled-at.js');
    const migration005 = await import('./migrations/005-add-draft-platform.js');
    return {
      '001-initial-schema': migration001,
      '002-add-targeted-questions': migration002,
      '003-add-draft-publishing-fields': migration003,
      '004-add-draft-scheduled-at': migration004,
      '005-add-draft-platform': migration005,
    };
  }
}

export function createDatabase(connectionString?: string): Kysely<Database> {
  const url = connectionString ?? process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 10,
  });

  const dialect = new PostgresDialect({ pool });
  return new Kysely<Database>({ dialect });
}

export async function migrateDatabase(db: Kysely<Database>): Promise<void> {
  const migrator = new Migrator({
    db,
    provider: new CustomMigrationProvider(),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((result) => {
    if (result.status === 'Success') {
      console.log(`Migration "${result.migrationName}" executed successfully`);
    } else if (result.status === 'Error') {
      console.error(`Migration "${result.migrationName}" failed`);
    }
  });

  if (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

let db: Kysely<Database> | null = null;

export function getDatabase(): Kysely<Database> {
  if (!db) {
    db = createDatabase();
  }
  return db;
}

export async function initDatabase(): Promise<Kysely<Database>> {
  const database = getDatabase();
  await migrateDatabase(database);
  return database;
}
