import * as cheerio from 'cheerio';

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
  const $ = cheerio.load(html);

  // Remove non-content elements
  $(
    'script, style, nav, header, footer, aside, .sidebar, .nav, .menu, .ad, .advertisement, .social, .comments, .comment, [role="navigation"], [role="banner"], [role="complementary"]',
  ).remove();

  // Extract title
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text().trim() ||
    $('title').text().trim() ||
    'Untitled';

  // Extract main content - try common article containers first
  let content = '';
  const articleSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '#content',
  ];

  for (const selector of articleSelectors) {
    const el = $(selector);
    if (el.length) {
      content = el.text().trim();
      if (content.length > 200) break;
    }
  }

  // Fallback to body text
  if (content.length < 200) {
    content = $('body').text().trim();
  }

  // Clean up whitespace
  content = content.replace(/\s+/g, ' ').trim();

  if (!content) {
    throw new Error('Could not extract article content from URL');
  }

  return {
    title,
    content,
    excerpt: content.slice(0, 300),
  };
}
