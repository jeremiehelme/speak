import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';
import type { LlmProvider } from '../llm/llm-provider.js';
import { loadPrompt } from '../llm/prompt-loader.js';
import { SettingsService } from './settings-service.js';

export class AnalysisService {
  constructor(
    private db: Kysely<Database>,
    private settingsService: SettingsService,
  ) {}

  async analyzeSource(sourceId: number, llmProvider: LlmProvider): Promise<void> {
    const source = await this.db
      .selectFrom('sources')
      .selectAll()
      .where('id', '=', sourceId)
      .executeTakeFirst();

    if (!source) throw new Error('Source not found');

    const content = source.extracted_content || source.raw_text;
    if (!content) {
      await this.db
        .updateTable('sources')
        .set({ analysis_status: 'failed', updated_at: Math.floor(Date.now() / 1000) })
        .where('id', '=', sourceId)
        .execute();
      return;
    }

    try {
      const analysisModel = (await this.settingsService.get('analysis_model')) || 'claude-haiku-4-5-20251001';
      const prompt = loadPrompt('analyze-source.md', {
        content: content.slice(0, 10000), // Limit content length
      });

      const response = await llmProvider.complete({
        model: analysisModel,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1024,
      });

      const analysis = JSON.parse(response.content);

      await this.db
        .updateTable('sources')
        .set({
          analysis_summary: analysis.summary,
          themes: JSON.stringify(analysis.themes),
          takeaways: JSON.stringify(analysis.takeaways),
          relevance: analysis.relevance,
          category: analysis.category,
          analysis_status: 'complete',
          updated_at: Math.floor(Date.now() / 1000),
        })
        .where('id', '=', sourceId)
        .execute();
    } catch (err) {
      console.error('Analysis failed:', (err as Error).message);
      await this.db
        .updateTable('sources')
        .set({
          analysis_status: 'failed',
          updated_at: Math.floor(Date.now() / 1000),
        })
        .where('id', '=', sourceId)
        .execute();
    }
  }
}
