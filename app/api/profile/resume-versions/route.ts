import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { CareerProfileService } from "@/lib/services/careerProfileService";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile/resume-versions
 * Retrieves all immutable resume versions for the authenticated candidate.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiErr("UNAUTHORIZED", "Authentication required", 401);
    }

    const { searchParams } = new URL(request.url);
    const resumeId = searchParams.get("resumeId") ?? undefined;

    const versions = await CareerProfileService.listResumeVersions(user.id, resumeId);
    return apiOk(versions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list resume versions";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}
