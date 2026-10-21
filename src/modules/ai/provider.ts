// =============================================================================
// AI Provider Interface
// =============================================================================
// All AI providers must implement this interface. This abstraction allows
// switching between free hosted providers (Groq, Gemini, OpenRouter), Ollama
// (local dev) and paid providers without changing application code.
// =============================================================================

import type { GeneratedContent, GenerationInput } from "./schemas";

export interface TokenUsage {
  promptCount: number;
  completionCount: number;
}

export interface ProviderResult<T> {
  data: T;
  usage: TokenUsage;
  /** Name of the provider that actually served the request. */
  providerName: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProvider {
  readonly name: string;

  generateContent(input: GenerationInput): Promise<ProviderResult<GeneratedContent>>;

  /** Free-form conversation, used by the AI Coach assistant. */
  chat(messages: ChatMessage[]): Promise<ProviderResult<string>>;

  /**
   * Optional health check — verifies the provider is reachable.
   */
  healthCheck?(): Promise<boolean>;
}

export const EMPTY_USAGE: TokenUsage = { promptCount: 0, completionCount: 0 };
