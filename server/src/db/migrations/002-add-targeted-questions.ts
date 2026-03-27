import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable('sources').addColumn('targeted_questions', 'text').execute();

  await db.schema.alterTable('sources').addColumn('targeted_answers', 'text').execute();

  await db.schema.alterTable('sources').addColumn('angles', 'text').execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable('sources').dropColumn('targeted_questions').execute();

  await db.schema.alterTable('sources').dropColumn('targeted_answers').execute();

  await db.schema.alterTable('sources').dropColumn('angles').execute();
}
