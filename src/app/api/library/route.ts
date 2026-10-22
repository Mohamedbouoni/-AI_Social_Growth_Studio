import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { handleApiError, unauthenticated } from "@/lib/api";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const querySchema = z.object({
  platform: z.enum(["youtube", "tiktok", "instagram"]).optional(),
  status: z.enum(["draft", "planned", "published", "archived"]).optional(),
  // Calendar range on planned_date (inclusive)
  from: isoDate.optional(),
  to: isoDate.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(60),
});

// Lists the user's saved content; RLS scopes rows to workspaces they own
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthenticated();

    const params = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries())
    );

    const variantJoin = params.platform ? "content_variants!inner" : "content_variants";
    let query = supabase
      .from("content_projects")
      .select(
        `id, title, niche, language, source_idea, tone, status, planned_date, source, duration_seconds, created_at, updated_at,
         ${variantJoin}(id, platform, content_type, output_json, version, created_at)`
      )
      .order("created_at", { ascending: false })
      .limit(params.limit);

    if (params.platform) query = query.eq("content_variants.platform", params.platform);
    if (params.status) query = query.eq("status", params.status);
    if (params.from) query = query.gte("planned_date", params.from);
    if (params.to) query = query.lte("planned_date", params.to);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return handleApiError(err, "/api/library");
  }
}
