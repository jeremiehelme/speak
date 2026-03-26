import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';
import type { LlmProvider } from '../llm/llm-provider.js';
import { loadPrompt } from '../llm/prompt-loader.js';
import { SettingsService } from './settings-service.js';

export interface Angle {
  title: string;
  description: string;
}

export class AngleService {
  constructor(
    private db: Kysely<Database>,
    private settingsService: SettingsService,
  ) {}

  async generateAngles(sourceId: number, llmProvider: LlmProvider, count: number = 1): Promise<Angle[]> {
    const source = await this.db
      .selectFrom('sources')
      .selectAll()
      .where('id', '=', sourceId)
      .executeTakeFirst();

    if (!source) throw new Error('Source not found');
    if (source.analysis_status !== 'complete') throw new Error('Source analysis not complete');

    const analysisModel = (await this.settingsService.get('analysis_model')) || 'claude-haiku-4-5-20251001';

    const prompt = loadPrompt('generate-angles.md', {
      summary: source.analysis_summary || '',
      themes: source.themes || '[]',
      takeaways: source.takeaways || '[]',
      opinion: source.opinion || '',
      count: String(count),
    });

    const response = await llmProvider.complete({
      model: analysisModel,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 1024,
    });

    const angles: Angle[] = JSON.parse(response.content);
    return angles;
  }
}
