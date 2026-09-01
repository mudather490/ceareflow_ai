import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { publicProfileUpdateSchema } from "@/lib/validation/videoResume";
import { VideoResumeService } from "@/lib/services/videoResumeService";

export const dynamic = "force-dynamic";

/**
 * GET /api/public-profile/:id
 * 3C: Owner fetches publication metadata.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiErr("UNAUTHORIZED", "Authentication required", 401);
    }

    const profile = await VideoResumeService.getPublicProfileById(
      user.id,
      params.id
    );

    if (!profile) {
      return apiErr("NOT_FOUND", "Public profile not found", 404);
    }

    return apiOk(profile);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load public profile";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}

/**
 * PATCH /api/public-profile/:id
 * 3C: Owner toggles publication state (Published / Unpublished).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiErr("UNAUTHORIZED", "Authentication required", 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiErr("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const validation = publicProfileUpdateSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return apiErr(
        "VALIDATION_ERROR",
        firstIssue?.message || "Invalid update payload",
        400,
        { field: firstIssue?.path.join(".") }
      );
    }

    const updated = await VideoResumeService.updatePublicProfileStatus(
      user.id,
      params.id,
      validation.data.isPublished
    );

    return apiOk(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update publication status";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}
