import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface Database {
  sources: SourcesTable;
  drafts: DraftsTable;
  voice_profiles: VoiceProfilesTable;
  settings: SettingsTable;
}

export interface SourcesTable {
  id: Generated<number>;
  url: string | null;
  title: string | null;
  raw_text: string | null;
  extracted_content: string | null;
  analysis_summary: string | null;
  category: string | null;
  themes: string | null;
  takeaways: string | null;
  relevance: string | null;
  opinion: string | null;
  analysis_status: string;
  targeted_questions: string | null;
  targeted_answers: string | null;
  angles: string | null;
  created_at: Generated<number>;
  updated_at: Generated<number>;
}

export interface DraftsTable {
  id: Generated<number>;
  source_id: number;
  angle: string | null;
  content: string | null;
  feedback: string | null;
  status: string;
  published_status: string | null;
  published_url: string | null;
  published_at: number | null;
  scheduled_at: number | null;
  created_at: Generated<number>;
  updated_at: Generated<number>;
}

export interface VoiceProfilesTable {
  id: Generated<number>;
  voice_description: string | null;
  example_posts: string | null;
  general_opinions: string | null;
  created_at: Generated<number>;
  updated_at: Generated<number>;
}

export interface SettingsTable {
  id: Generated<number>;
  key: string;
  value: string;
  created_at: Generated<number>;
  updated_at: Generated<number>;
}

export type Source = Selectable<SourcesTable>;
export type NewSource = Insertable<SourcesTable>;
export type SourceUpdate = Updateable<SourcesTable>;

export type Draft = Selectable<DraftsTable>;
export type NewDraft = Insertable<DraftsTable>;
export type DraftUpdate = Updateable<DraftsTable>;

export type VoiceProfile = Selectable<VoiceProfilesTable>;
export type NewVoiceProfile = Insertable<VoiceProfilesTable>;
export type VoiceProfileUpdate = Updateable<VoiceProfilesTable>;

export type Setting = Selectable<SettingsTable>;
