import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { AnalyticsService } from "@/lib/services/analyticsService";
import { analyticsTrendsQuerySchema } from "@/lib/validation/analytics";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/trends?days=7|30
 * Authenticated owner only — returns daily trend points.
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

    const url = new URL(request.url);
    const daysParam = url.searchParams.get("days") || "7";
    const validation = analyticsTrendsQuerySchema.safeParse({ days: daysParam });
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return apiErr("VALIDATION_ERROR", firstIssue?.message || "Invalid days", 400, {
        field: firstIssue?.path.join("."),
      });
    }

    const days = validation.data.days === "30" ? 30 : 7;
    const trends = await AnalyticsService.getTrends(user.id, days as 7 | 30);
    return apiOk(trends);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load trends";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}
