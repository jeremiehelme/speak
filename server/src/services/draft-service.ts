import type { Kysely } from 'kysely';
import type { Database, Draft } from '../db/types.js';
import type { LlmProvider } from '../llm/llm-provider.js';
import { loadPrompt } from '../llm/prompt-loader.js';
import { VoiceService } from './voice-service.js';
import { SettingsService } from './settings-service.js';

export class DraftService {
  private voiceService: VoiceService;

  constructor(
    private db: Kysely<Database>,
    private settingsService: SettingsService,
  ) {
    this.voiceService = new VoiceService(db);
  }

  private buildTargetedQAPairs(source: {
    targeted_questions: string | null;
    targeted_answers: string | null;
  }): { question: string; answer: string }[] {
    if (!source.targeted_questions || !source.targeted_answers) return [];
    try {
      const questions = JSON.parse(source.targeted_questions) as string[];
      const answers = JSON.parse(source.targeted_answers) as string[];
      const pairs: { question: string; answer: string }[] = [];
      for (let i = 0; i < questions.length; i++) {
        if (answers[i] && answers[i].trim()) {
          pairs.push({ question: questions[i]!, answer: answers[i]! });
        }
      }
      return pairs;
    } catch {
      return [];
    }
  }

  async generateDraft(sourceId: number, angle: string, llmProvider: LlmProvider): Promise<Draft> {
    const source = await this.db
      .selectFrom('sources')
      .selectAll()
      .where('id', '=', sourceId)
      .executeTakeFirst();

    if (!source) throw new Error('Source not found');

    const qaPairs = this.buildTargetedQAPairs(source);
    const voiceContext = await this.voiceService.assembleVoiceContext(source.opinion, qaPairs);
    const draftingModel = (await this.settingsService.get('drafting_model')) || 'claude-sonnet-4-6';

    const systemPrompt = loadPrompt('system-voice.md', {
      voiceDescription: voiceContext.voiceDescription,
    });

    const targetedQASection = voiceContext.targetedQA
      ? `\n## Author's Specific Reasoning\n${voiceContext.targetedQA}`
      : '';

    const userPrompt = loadPrompt('generate-draft.md', {
      summary: source.analysis_summary || '',
      themes: source.themes || '[]',
      angle,
      voiceDescription: voiceContext.voiceDescription,
      examplePosts: voiceContext.examplePosts,
      generalOpinions: voiceContext.generalOpinions,
      articleOpinion: voiceContext.articleOpinion,
      targetedQA: targetedQASection,
    });

    const response = await llmProvider.complete({
      model: draftingModel,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 1024,
    });

    const result = await this.db
      .insertInto('drafts')
      .values({
        source_id: sourceId,
        angle,
        content: response.content.trim(),
        status: 'draft',
      })
      .executeTakeFirstOrThrow();

    return this.db
      .selectFrom('drafts')
      .selectAll()
      .where('id', '=', Number(result.insertId))
      .executeTakeFirstOrThrow();
  }

  async regenerateDraft(
    draftId: number,
    feedback: string | null,
    newAngle: string | null,
    llmProvider: LlmProvider,
  ): Promise<Draft> {
    const existing = await this.db
      .selectFrom('drafts')
      .selectAll()
      .where('id', '=', draftId)
      .executeTakeFirst();

    if (!existing) throw new Error('Draft not found');

    const angle = newAngle || existing.angle || '';
    const source = await this.db
      .selectFrom('sources')
      .selectAll()
      .where('id', '=', existing.source_id)
      .executeTakeFirst();

    if (!source) throw new Error('Source not found');

    const qaPairs = this.buildTargetedQAPairs(source);
    const voiceContext = await this.voiceService.assembleVoiceContext(source.opinion, qaPairs);
    const draftingModel = (await this.settingsService.get('drafting_model')) || 'claude-sonnet-4-6';

    const systemPrompt = loadPrompt('system-voice.md', {
      voiceDescription: voiceContext.voiceDescription,
    });

    const targetedQASection = voiceContext.targetedQA
      ? `\n## Author's Specific Reasoning\n${voiceContext.targetedQA}`
      : '';

    let userPrompt = loadPrompt('generate-draft.md', {
      summary: source.analysis_summary || '',
      themes: source.themes || '[]',
      angle,
      voiceDescription: voiceContext.voiceDescription,
      examplePosts: voiceContext.examplePosts,
      generalOpinions: voiceContext.generalOpinions,
      articleOpinion: voiceContext.articleOpinion,
      targetedQA: targetedQASection,
    });

    if (feedback) {
      userPrompt += `\n\n## Feedback on Previous Draft\nPrevious draft: "${existing.content}"\nFeedback: ${feedback}\n\nRewrite the post addressing this feedback.`;
    }

    const response = await llmProvider.complete({
      model: draftingModel,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 1024,
    });

    // Update the existing draft
    await this.db
      .updateTable('drafts')
      .set({
        angle,
        content: response.content.trim(),
        feedback,
        updated_at: Math.floor(Date.now() / 1000),
      })
      .where('id', '=', draftId)
      .execute();

    return this.db
      .selectFrom('drafts')
      .selectAll()
      .where('id', '=', draftId)
      .executeTakeFirstOrThrow();
  }

  async updateDraft(draftId: number, content: string): Promise<Draft> {
    await this.db
      .updateTable('drafts')
      .set({
        content,
        updated_at: Math.floor(Date.now() / 1000),
      })
      .where('id', '=', draftId)
      .execute();

    return this.db
      .selectFrom('drafts')
      .selectAll()
      .where('id', '=', draftId)
      .executeTakeFirstOrThrow();
  }
}
