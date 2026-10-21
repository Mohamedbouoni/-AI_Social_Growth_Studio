// =============================================================================
// Local Ollama AI Provider
// =============================================================================

import type { AIProvider, ChatMessage, ProviderResult } from "../provider";
import type { GeneratedContent, GenerationInput } from "../schemas";
import { parseGeneratedContent } from "../validate";
import { buildSystemPrompt, buildUserPrompt } from "../prompts/template";
import { logger } from "@/lib/logging/logger";

interface OllamaChatResponse {
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider implements AIProvider {
  readonly name: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.model = process.env.OLLAMA_MODEL || "llama3.1";
    this.name = `ollama:${this.model}`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async generateContent(input: GenerationInput): Promise<ProviderResult<GeneratedContent>> {
    logger.info("Ollama generation started", {
      model: this.model,
      platform: input.platform,
      contentType: input.contentType,
    });

    const result = await this.request(
      [
        { role: "system", content: buildSystemPrompt(input) },
        { role: "user", content: buildUserPrompt(input) },
      ],
      true
    );

    return { ...result, data: parseGeneratedContent(input, result.data) };
  }

  chat(messages: ChatMessage[]): Promise<ProviderResult<string>> {
    return this.request(messages, false);
  }

  private async request(
    messages: ChatMessage[],
    jsonMode: boolean
  ): Promise<ProviderResult<string>> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        ...(jsonMode ? { format: "json" } : {}),
        options: { temperature: 0.7, top_p: 0.9 },
      }),
      signal: AbortSignal.timeout(60000), // 60s timeout for local inference
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    const text = data.message?.content;
    if (!text) {
      throw new Error("Ollama returned an empty response.");
    }

    return {
      data: text,
      usage: {
        promptCount: data.prompt_eval_count ?? 0,
        completionCount: data.eval_count ?? 0,
      },
      providerName: this.name,
    };
  }
}
