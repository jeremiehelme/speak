import { AnthropicProvider } from './anthropic-provider.js';
import type { LlmProvider } from './llm-provider.js';

export type { LlmProvider, LlmRequest, LlmResponse, LlmMessage } from './llm-provider.js';
export { loadPrompt } from './prompt-loader.js';

export function createLlmProvider(apiKey: string): LlmProvider {
  return new AnthropicProvider(apiKey);
}
