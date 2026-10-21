// =============================================================================
// AI Coach Service — conversational growth assistant (1 credit per message)
// =============================================================================

import { z } from "zod";
import { languageEnum } from "./schemas";
import { getAIProvider } from "./provider-factory";
import type { ChatMessage, ProviderResult } from "./provider";
import { buildCoachSystemPrompt, type CoachContext } from "./prompts/coach";
import { createAdminClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { getEntitlement } from "@/modules/billing/entitlement";
import { recordUsageDetails, releaseCredits, reserveCredits } from "@/modules/billing/credits";

export const coachInputSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      })
    )
    .min(1)
    .max(20),
  language: languageEnum.optional(),
  projectId: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
});

export interface CoachResult {
  reply: string;
  creditsRemaining: number;
}

export async function coachService(userId: string, rawInput: unknown): Promise<CoachResult> {
  const input = coachInputSchema.parse(rawInput);
  if (input.messages[input.messages.length - 1]?.role !== "user") {
    throw new AppError("INVALID_REQUEST", "The last message must be from the user.", 400);
  }
  const requestId = input.requestId || crypto.randomUUID();

  const supabase = createAdminClient();
  const entitlement = await getEntitlement(supabase, userId);

  // Context: recent library items, plus the item being asked about (scoped to
  // the user's own workspace, since this client bypasses RLS)
  const { data: recent } = await supabase
    .from("content_projects")
    .select("title, niche")
    .eq("workspace_id", entitlement.workspaceId)
    .order("created_at", { ascending: false })
    .limit(5);

  const context: CoachContext = { language: input.language, recentProjects: recent ?? [] };

  if (input.projectId) {
    const { data: project } = await supabase
      .from("content_projects")
      .select("title, niche, source_idea, content_variants(output_json)")
      .eq("id", input.projectId)
      .eq("workspace_id", entitlement.workspaceId)
      .maybeSingle();

    if (!project) throw new AppError("NOT_FOUND", "Content not found.", 404);
    context.focusProject = {
      title: project.title,
      niche: project.niche,
      idea: project.source_idea,
      outputs: JSON.stringify(
        (project.content_variants ?? []).map((v: { output_json: unknown }) => v.output_json)
      ),
    };
  }

  const provider = getAIProvider({
    tier: entitlement.config.features.qualityModel ? "quality" : "fast",
    language: input.language ?? "en",
  });

  const used = await reserveCredits(supabase, entitlement, {
    requestId,
    kind: "assistant",
    model: provider.name,
  });

  const messages: ChatMessage[] = [
    { role: "system", content: buildCoachSystemPrompt(context) },
    ...input.messages,
  ];

  let result: ProviderResult<string>;
  try {
    result = await provider.chat(messages);
  } catch (err) {
    await releaseCredits(supabase, entitlement.workspaceId, requestId);
    throw err;
  }

  await recordUsageDetails(
    supabase,
    entitlement.workspaceId,
    requestId,
    result.providerName,
    result.usage
  );

  return {
    reply: result.data.trim(),
    creditsRemaining: Math.max(0, entitlement.config.credits - used),
  };
}
