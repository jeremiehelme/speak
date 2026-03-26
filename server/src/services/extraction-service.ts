import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface ExtractionResult {
  title: string;
  content: string;
  excerpt: string;
}

export async function extractArticle(url: string): Promise<ExtractionResult> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Speak/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent?.trim()) {
    throw new Error('Could not extract article content from URL');
  }

  return {
    title: article.title || 'Untitled',
    content: article.textContent.trim(),
    excerpt: article.excerpt || article.textContent.trim().slice(0, 300),
  };
}
