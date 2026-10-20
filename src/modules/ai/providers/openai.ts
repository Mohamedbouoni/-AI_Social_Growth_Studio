// =============================================================================
// Hosted OpenAI-Compatible AI Provider
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

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    this.baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async generateContent(input: GenerationInput): Promise<GeneratedContent> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const systemPrompt = buildSystemPrompt(input);
    const userPrompt = buildUserPrompt(input);

    logger.info("OpenAI generation started", {
      model: this.model,
      platform: input.platform,
      contentType: input.contentType,
    });

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(45000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content;
      if (!rawText) {
        throw new Error("Received empty response from OpenAI.");
      }

      const parsedJson = JSON.parse(rawText);
      return this.formatAndValidateOutput(input, parsedJson);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("OpenAI generation failed", { error: message });
      throw new Error(`Generation failed: ${message}`);
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
