import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { handleApiError, unauthenticated } from "@/lib/api";
import { AppError } from "@/lib/errors";

const updateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    status: z.enum(["draft", "planned", "published", "archived"]).optional(),
    planned_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update.");

const idSchema = z.string().uuid();

type Params = { params: Promise<{ id: string }> };

// Both handlers run as the user: RLS rejects projects outside their workspaces,
// which surfaces here as "not found".
export async function PATCH(request: Request, { params }: Params) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthenticated();

    const id = idSchema.parse((await params).id);
    const changes = updateSchema.parse(await request.json().catch(() => ({})));

    const { data, error } = await supabase
      .from("content_projects")
      .update(changes)
      .eq("id", id)
      .select("id, title, status, planned_date, updated_at")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new AppError("NOT_FOUND", "Content not found.", 404);

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return handleApiError(err, "PATCH /api/library/[id]");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthenticated();

    const id = idSchema.parse((await params).id);

    const { data, error } = await supabase
      .from("content_projects")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) throw new Error(error.message);
    if (!data?.length) throw new AppError("NOT_FOUND", "Content not found.", 404);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return handleApiError(err, "DELETE /api/library/[id]");
  }
}
