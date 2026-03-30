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

  async generateDraft(
    sourceId: number,
    angle: string,
    llmProvider: LlmProvider,
    maxLength: number = 280,
  ): Promise<Draft> {
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
      maxLength: String(maxLength),
    });

    const response = await llmProvider.complete({
      model: draftingModel,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 1024,
    });

    return await this.db
      .insertInto('drafts')
      .values({
        source_id: sourceId,
        angle,
        content: response.content.trim(),
        status: 'draft',
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async regenerateDraft(
    draftId: number,
    feedback: string | null,
    newAngle: string | null,
    llmProvider: LlmProvider,
    maxLength: number = 280,
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
      maxLength: String(maxLength),
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

  async adaptDraft(
    draftId: number,
    targetPlatform: string,
    llmProvider: LlmProvider,
  ): Promise<Draft> {
    const existing = await this.db
      .selectFrom('drafts')
      .selectAll()
      .where('id', '=', draftId)
      .executeTakeFirst();

    if (!existing) throw new Error('Draft not found');
    if (!existing.content) throw new Error('Draft has no content to adapt');

    const charLimits: Record<string, number> = { x: 280, threads: 500 };
    const limit = charLimits[targetPlatform];
    if (!limit) throw new Error(`Unknown platform: ${targetPlatform}`);

    const draftingModel = (await this.settingsService.get('drafting_model')) || 'claude-sonnet-4-6';

    const response = await llmProvider.complete({
      model: draftingModel,
      system:
        'You are a social media content adapter. Rewrite posts for different platforms while preserving the core message, tone, and voice. Never truncate — always rewrite intelligently. Return ONLY the adapted post text, nothing else.',
      messages: [
        {
          role: 'user',
          content: `Adapt the following post for ${targetPlatform} (max ${limit} characters). The adapted version should feel native to the platform, not like a shortened copy.\n\nOriginal post:\n${existing.content}`,
        },
      ],
      maxTokens: 1024,
    });

    const adaptedContent = response.content.trim();

    return await this.db
      .insertInto('drafts')
      .values({
        source_id: existing.source_id,
        angle: existing.angle,
        content: adaptedContent,
        status: 'draft',
        platform: targetPlatform,
      })
      .returningAll()
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
