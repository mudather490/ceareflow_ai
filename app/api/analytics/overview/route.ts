import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { AnalyticsService } from "@/lib/services/analyticsService";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/overview
 * Authenticated owner only — returns aggregate metrics.
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

    const overview = await AnalyticsService.getOverview(user.id);
    return apiOk(overview);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load overview";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}
