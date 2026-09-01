import { NextRequest } from "next/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { AnalyticsService } from "@/lib/services/analyticsService";

export const dynamic = "force-dynamic";

/**
 * POST /api/public/[slug]/video-play
 * Public video play tracking. No auth, slug-derived owner, no PII.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    if (!slug || slug.length < 3 || slug.length > 64) {
      return apiErr("VALIDATION_ERROR", "Invalid slug", 400, { field: "slug" });
    }
    await AnalyticsService.recordPublicVideoPlay(slug);
    return apiOk({ ok: true });
  } catch (error) {
    return apiErr("INTERNAL_ERROR", error instanceof Error ? error.message : "Failed", 500);
  }
}
