import { NextRequest } from "next/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { AnalyticsService } from "@/lib/services/analyticsService";
import { rateLimitByRequest } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/public/[slug]/view
 * Public, no auth. Records a view event via AnalyticsService.recordPublicView
 * Validates slug, derives user_id server-side, dedup 1h, hashes IP, buckets referer.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Lightweight public rate limit: 60 views per IP per minute (prevents beacon flood, fails open)
    const rl = rateLimitByRequest(request, { keyPrefix: `view:${params.slug}`, limit: 60, windowMs: 60_000 });
    if (!rl.allowed) {
      return apiErr("RATE_LIMITED", "Too many requests — try again shortly", 429);
    }

    const slug = params.slug;
    if (!slug || typeof slug !== "string" || slug.length < 3 || slug.length > 64) {
      return apiErr("VALIDATION_ERROR", "Invalid slug", 400, { field: "slug" });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;
    let referer: string | null = null;
    try {
      const body = await request.json().catch(() => null);
      if (body && typeof body.referer === "string") referer = body.referer.slice(0, 512);
    } catch {
      // ignore
    }
    if (!referer) {
      referer = request.headers.get("referer") || null;
    }

    const result = await AnalyticsService.recordPublicView({ slug, ip, userAgent, referer });
    if (!result.ok) {
      // Still return ok to not leak existence, but 404 if definitely not found? For privacy, return 200 with ok:false
      return apiOk({ ok: false });
    }
    return apiOk({ ok: true, deduped: result.deduped || false });
  } catch (error) {
    return apiErr("INTERNAL_ERROR", error instanceof Error ? error.message : "Failed to record view", 500);
  }
}
