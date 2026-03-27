import SQLite from 'better-sqlite3';
import { Kysely, Migrator, SqliteDialect, type Migration, type MigrationProvider } from 'kysely';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Database } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.resolve(__dirname, '../../../data');

class CustomMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    const migration001 = await import('./migrations/001-initial-schema.js');
    const migration002 = await import('./migrations/002-add-targeted-questions.js');
    return {
      '001-initial-schema': migration001,
      '002-add-targeted-questions': migration002,
    };
  }
}

export function createDatabase(dbPath?: string): Kysely<Database> {
  const resolvedPath = dbPath ?? path.join(DATA_DIR, 'speak.db');
  const dialect = new SqliteDialect({
    database: new SQLite(resolvedPath),
  });

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
