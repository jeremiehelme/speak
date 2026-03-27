import type { Kysely } from 'kysely';
import type { Database, Source } from '../db/types.js';
import { extractArticle } from './extraction-service.js';

interface CaptureInput {
  url?: string;
  text?: string;
  opinion?: string;
}

export class CaptureService {
  constructor(private db: Kysely<Database>) {}

  async capture(input: CaptureInput): Promise<Source> {
    let title: string | null = null;
    let extractedContent: string | null = null;
    const rawText: string | null = input.text ?? null;
    let analysisStatus = 'pending';

    if (input.url) {
      try {
        const result = await extractArticle(input.url);
        title = result.title;
        extractedContent = result.content;
      } catch (err) {
        // Extraction failed — mark for manual fallback
        analysisStatus = 'extraction_failed';
        console.error('Extraction failed:', (err as Error).message);
      }
    }

    if (!extractedContent && rawText) {
      extractedContent = rawText;
    }

    const result = await this.db
      .insertInto('sources')
      .values({
        url: input.url ?? null,
        title,
        raw_text: rawText,
        extracted_content: extractedContent,
        opinion: input.opinion ?? null,
        analysis_status: analysisStatus,
      })
      .executeTakeFirstOrThrow();

    const sourceId = Number(result.insertId);

    return this.db
      .selectFrom('sources')
      .selectAll()
      .where('id', '=', sourceId)
      .executeTakeFirstOrThrow();
  }
}
