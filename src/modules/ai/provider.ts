// =============================================================================
// AI Provider Interface
// =============================================================================
// All AI providers must implement this interface. This abstraction allows
// switching between Ollama (local dev) and hosted providers (OpenAI, etc.)
// without changing application code.
// =============================================================================

import type { GeneratedContent, GenerationInput } from "./schemas";

export interface AIProvider {
  readonly name: string;

  generateContent(input: GenerationInput): Promise<GeneratedContent>;

  /**
   * Optional health check — verifies the provider is reachable.
   */
  healthCheck?(): Promise<boolean>;
}
