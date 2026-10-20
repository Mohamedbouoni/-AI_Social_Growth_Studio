// =============================================================================
// Local Ollama AI Provider
// =============================================================================

import type { AIProvider } from "../provider";
import type { GeneratedContent, GenerationInput } from "../schemas";
import {
  youtubeOutputSchema,
  tiktokOutputSchema,
  instagramReelOutputSchema,
  instagramCarouselOutputSchema,
} from "../schemas";
import { buildSystemPrompt, buildUserPrompt } from "../prompts/template";
import { logger } from "@/lib/logging/logger";

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.model = process.env.OLLAMA_MODEL || "llama3.1";
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

  async generateContent(input: GenerationInput): Promise<GeneratedContent> {
    const systemPrompt = buildSystemPrompt(input);
    const userPrompt = buildUserPrompt(input);

    logger.info("Ollama generation started", {
      model: this.model,
      platform: input.platform,
      contentType: input.contentType,
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          system: systemPrompt,
          prompt: userPrompt,
          format: "json",
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
          },
        }),
        signal: AbortSignal.timeout(60000), // 60s timeout for local inference
      });

      if (!response.ok) {
        throw new Error(
          `Ollama API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const rawText = data.response;
      const parsedJson = JSON.parse(rawText);

      return this.formatAndValidateOutput(input, parsedJson);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Ollama inference failed", { error: message });
      throw new Error(`Ollama generation failed: ${message}`);
    }
  }

  private formatAndValidateOutput(
    input: GenerationInput,
    rawJson: Record<string, unknown>
  ): GeneratedContent {
    switch (input.platform) {
      case "youtube": {
        const validated = youtubeOutputSchema.parse(rawJson);
        return { platform: "youtube", content: validated };
      }
      case "tiktok": {
        const validated = tiktokOutputSchema.parse(rawJson);
        return { platform: "tiktok", content: validated };
      }
      case "instagram": {
        if (input.contentType === "carousel") {
          const validated = instagramCarouselOutputSchema.parse(rawJson);
          return {
            platform: "instagram",
            contentType: "carousel",
            content: validated,
          };
        } else {
          const validated = instagramReelOutputSchema.parse(rawJson);
          return {
            platform: "instagram",
            contentType: "reel",
            content: validated,
          };
        }
      }
    }
  }
}
