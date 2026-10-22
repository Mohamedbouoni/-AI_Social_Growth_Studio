// =============================================================================
// Library Service — persist generations as content projects + variants
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logging/logger";
import type { GeneratedContent, GenerationInput } from "@/modules/ai/schemas";

const MAX_TITLE_LENGTH = 120;

export function deriveTitle(content: GeneratedContent, fallback: string): string {
  let title: string | undefined;
  switch (content.platform) {
    case "youtube":
      title = content.content.titles[0];
      break;
    case "tiktok":
      title = content.content.openingHook;
      break;
    case "instagram":
      title =
        content.contentType === "carousel"
          ? content.content.slides[0]?.heading
          : content.content.openingHook;
      break;
  }
  const text = (title || fallback).trim();
  return text.length > MAX_TITLE_LENGTH ? `${text.slice(0, MAX_TITLE_LENGTH - 1)}…` : text;
}

/** Saves an analyzed video: transcript + the whole package as one 'package' variant. */
export async function saveVideoToLibrary(
  supabase: SupabaseClient,
  workspaceId: string,
  video: {
    title: string;
    niche: string;
    language: string;
    tone: string;
    transcript: string;
    durationSeconds: number;
    output: unknown;
  }
): Promise<string | null> {
  const title = video.title.trim() || "Untitled video";
  const { data: project, error: projectError } = await supabase
    .from("content_projects")
    .insert({
      workspace_id: workspaceId,
      title: title.length > MAX_TITLE_LENGTH ? `${title.slice(0, MAX_TITLE_LENGTH - 1)}…` : title,
      niche: video.niche,
      language: video.language.slice(0, 12),
      source_idea: "",
      tone: video.tone,
      status: "draft",
      source: "video",
      duration_seconds: Math.round(video.durationSeconds),
      transcript: video.transcript,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    logger.error("Failed to save video project", { error: projectError?.message });
    return null;
  }

  const { error: variantError } = await supabase.from("content_variants").insert({
    project_id: project.id,
    platform: "youtube",
    content_type: "package",
    output_json: video.output,
  });

  if (variantError) {
    logger.error("Failed to save video package", { error: variantError.message });
    await supabase.from("content_projects").delete().eq("id", project.id);
    return null;
  }
  return project.id;
}

/**
 * Saves one idea with one or more platform variants. Returns the project id,
 * or null if saving failed — the user still gets their content, so a library
 * failure must never fail the generation.
 */
export async function saveToLibrary(
  supabase: SupabaseClient,
  workspaceId: string,
  input: Pick<GenerationInput, "niche" | "idea" | "tone" | "language">,
  variants: { contentType: string; content: GeneratedContent }[]
): Promise<string | null> {
  const first = variants[0];
  if (!first) return null;

  const { data: project, error: projectError } = await supabase
    .from("content_projects")
    .insert({
      workspace_id: workspaceId,
      title: deriveTitle(first.content, input.idea),
      niche: input.niche,
      language: input.language,
      source_idea: input.idea,
      tone: input.tone,
      status: "draft",
    })
    .select("id")
    .single();

  if (projectError || !project) {
    logger.error("Failed to save content project", { error: projectError?.message });
    return null;
  }

  const { error: variantError } = await supabase.from("content_variants").insert(
    variants.map((v) => ({
      project_id: project.id,
      platform: v.content.platform,
      content_type: v.contentType,
      output_json: v.content,
    }))
  );

  if (variantError) {
    logger.error("Failed to save content variants", { error: variantError.message });
    await supabase.from("content_projects").delete().eq("id", project.id);
    return null;
  }

  return project.id;
}
