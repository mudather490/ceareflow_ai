import { NextRequest } from "next/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { VideoResumeService } from "@/lib/services/videoResumeService";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/:slug
 * 3C: Minimal recruiter profile data fetch.
 * Strictly whitelist-only per ADR-004.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const profile = await VideoResumeService.getPublicProfileBySlug(
      params.slug
    );

    if (!profile) {
      return apiErr(
        "NOT_FOUND",
        "Public profile not found or is unpublished",
        404
      );
    }

    return apiOk(profile);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load public profile";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}
