import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { CareerProfileService } from "@/lib/services/careerProfileService";
import { careerProfileInputSchema } from "@/lib/validation/profile";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile
 * Retrieves the authenticated user's canonical Career Profile.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiErr("UNAUTHORIZED", "Authentication required", 401);
    }

    const profile = await CareerProfileService.getProfileByUserId(user.id);
    return apiOk(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}

/**
 * PATCH /api/profile
 * Commits user-reviewed updates to the canonical Career Profile.
 */
export async function PATCH(request: NextRequest) {
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

    const validation = careerProfileInputSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return apiErr(
        "VALIDATION_ERROR",
        firstIssue?.message || "Invalid profile data",
        400,
        { field: firstIssue?.path.join(".") }
      );
    }

    const updatedProfile = await CareerProfileService.saveProfile(user.id, validation.data);
    return apiOk(updatedProfile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save profile";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}
