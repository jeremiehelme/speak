export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  model: string;
  system?: string;
  messages: LlmMessage[];
  maxTokens?: number;
}

export interface LlmResponse {
  content: string;
}

export interface LlmProvider {
  complete(request: LlmRequest): Promise<LlmResponse>;
}
