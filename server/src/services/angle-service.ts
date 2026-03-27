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

  async generateAngles(
    sourceId: number,
    llmProvider: LlmProvider,
    count: number = 1,
  ): Promise<Angle[]> {
    const source = await this.db
      .selectFrom('sources')
      .selectAll()
      .where('id', '=', sourceId)
      .executeTakeFirst();

    if (!source) throw new Error('Source not found');
    if (source.analysis_status !== 'complete') throw new Error('Source analysis not complete');

    const analysisModel =
      (await this.settingsService.get('analysis_model')) || 'claude-haiku-4-5-20251001';

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

    const jsonText = response.content
      .replace(/^```(?:json)?\s*\n?/m, '')
      .replace(/\n?```\s*$/m, '')
      .trim();
    const angles: Angle[] = JSON.parse(jsonText);

    if (!Array.isArray(angles)) {
      throw new Error('LLM returned invalid angles: expected an array');
    }

    // Store angles on the source
    await this.db
      .updateTable('sources')
      .set({
        angles: JSON.stringify(angles),
        updated_at: Math.floor(Date.now() / 1000),
      })
      .where('id', '=', sourceId)
      .execute();

    // Fire-and-forget targeted question generation after successful angles
    this.generateQuestions(sourceId, llmProvider).catch((err) => {
      console.error('Auto question generation error:', (err as Error).message);
    });

    return angles;
  }

  async generateQuestions(sourceId: number, llmProvider: LlmProvider): Promise<string[]> {
    const source = await this.db
      .selectFrom('sources')
      .selectAll()
      .where('id', '=', sourceId)
      .executeTakeFirst();

    if (!source) throw new Error('Source not found');

    const analysisModel =
      (await this.settingsService.get('analysis_model')) || 'claude-haiku-4-5-20251001';

    const prompt = loadPrompt('generate-questions.md', {
      summary: source.analysis_summary || '',
      themes: source.themes || '[]',
      takeaways: source.takeaways || '[]',
    });

    const response = await llmProvider.complete({
      model: analysisModel,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 512,
    });

    const jsonText = response.content
      .replace(/^```(?:json)?\s*\n?/m, '')
      .replace(/\n?```\s*$/m, '')
      .trim();
    const questions: string[] = JSON.parse(jsonText);

    if (!Array.isArray(questions) || !questions.every((q) => typeof q === 'string')) {
      throw new Error('LLM returned invalid questions: expected an array of strings');
    }

    await this.db
      .updateTable('sources')
      .set({
        targeted_questions: JSON.stringify(questions),
        updated_at: Math.floor(Date.now() / 1000),
      })
      .where('id', '=', sourceId)
      .execute();

    return questions;
  }
}
