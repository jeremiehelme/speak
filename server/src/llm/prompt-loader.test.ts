import { describe, it, expect } from 'vitest';
import { loadPrompt } from './prompt-loader.js';

describe('promptLoader', () => {
  it('should load and hydrate a prompt template', () => {
    const result = loadPrompt('analyze-source.md', {
      content: 'Test article content here.',
    });

    expect(result).toContain('Test article content here.');
    expect(result).toContain('Analyze the following article');
    expect(result).not.toContain('{{content}}');
  });
});
