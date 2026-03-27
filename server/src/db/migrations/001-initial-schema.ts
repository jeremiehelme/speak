import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('sources')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
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
    .addColumn('created_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`extract(epoch from now())::integer`),
    )
    .addColumn('updated_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`extract(epoch from now())::integer`),
    )
    .execute();

  await db.schema
    .createTable('drafts')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('source_id', 'integer', (col) =>
      col.notNull().references('sources.id').onDelete('cascade'),
    )
    .addColumn('angle', 'text')
    .addColumn('content', 'text')
    .addColumn('feedback', 'text')
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('draft'))
    .addColumn('created_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`extract(epoch from now())::integer`),
    )
    .addColumn('updated_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`extract(epoch from now())::integer`),
    )
    .execute();

  await db.schema
    .createTable('voice_profiles')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('voice_description', 'text')
    .addColumn('example_posts', 'text')
    .addColumn('general_opinions', 'text')
    .addColumn('created_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`extract(epoch from now())::integer`),
    )
    .addColumn('updated_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`extract(epoch from now())::integer`),
    )
    .execute();

  await db.schema
    .createTable('settings')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('key', 'text', (col) => col.notNull().unique())
    .addColumn('value', 'text', (col) => col.notNull())
    .addColumn('created_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`extract(epoch from now())::integer`),
    )
    .addColumn('updated_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`extract(epoch from now())::integer`),
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('drafts').execute();
  await db.schema.dropTable('sources').execute();
  await db.schema.dropTable('voice_profiles').execute();
  await db.schema.dropTable('settings').execute();
}
