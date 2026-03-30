import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';

export class SettingsService {
  constructor(private db: Kysely<Database>) {}

  async get(key: string): Promise<string | null> {
    const row = await this.db
      .selectFrom('settings')
      .select('value')
      .where('key', '=', key)
      .executeTakeFirst();
    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const existing = await this.get(key);
    if (existing !== null) {
      await this.db
        .updateTable('settings')
        .set({ value, updated_at: Math.floor(Date.now() / 1000) })
        .where('key', '=', key)
        .execute();
    } else {
      await this.db.insertInto('settings').values({ key, value }).execute();
    }
  }

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.db.selectFrom('settings').select(['key', 'value']).execute();
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async getAnthropicApiKey(): Promise<string | null> {
    // Env variable takes priority
    const envKey = process.env['ANTHROPIC_API_KEY'];
    if (envKey) return envKey;
    return this.get('anthropic_api_key');
  }

  async getPublicSettings(): Promise<Record<string, string>> {
    const all = await this.getAll();
    // Never expose secrets to frontend
    delete all['anthropic_api_key'];
    delete all['x_api_key'];
    delete all['x_api_secret'];
    delete all['x_access_token'];
    delete all['x_access_token_secret'];
    delete all['threads_access_token'];
    delete all['threads_user_id'];
    return all;
  }
}
