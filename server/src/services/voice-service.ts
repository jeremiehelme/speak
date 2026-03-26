import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';

export interface VoiceContext {
  voiceDescription: string;
  examplePosts: string;
  generalOpinions: string;
  articleOpinion: string;
}

export class VoiceService {
  constructor(private db: Kysely<Database>) {}

  async assembleVoiceContext(articleOpinion?: string | null): Promise<VoiceContext> {
    const profile = await this.db
      .selectFrom('voice_profiles')
      .selectAll()
      .executeTakeFirst();

    return {
      voiceDescription: profile?.voice_description || 'No voice description provided.',
      examplePosts: profile?.example_posts || 'No example posts provided.',
      generalOpinions: profile?.general_opinions || 'No general opinions provided.',
      articleOpinion: articleOpinion || 'No specific opinion for this article.',
    };
  }
}
