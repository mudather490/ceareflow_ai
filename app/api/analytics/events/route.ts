import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { analyticsRecordSchema } from "@/lib/validation/analytics";
import { AnalyticsService } from "@/lib/services/analyticsService";

export const dynamic = "force-dynamic";

/**
 * POST /api/analytics/events
 * Authenticated event recording (IDOR-safe: user_id derived from auth)
 */
export async function POST(request: NextRequest) {
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

    const validation = analyticsRecordSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return apiErr("VALIDATION_ERROR", firstIssue?.message || "Invalid event", 400, {
        field: firstIssue?.path.join("."),
      });
    }

    // Verify job ownership if jobId provided
    if (validation.data.jobId) {
      const { data: job } = await supabase.from("jobs").select("id").eq("id", validation.data.jobId).eq("user_id", user.id).single();
      if (!job) {
        return apiErr("NOT_FOUND", "Job not found or unauthorized", 404);
      }
    }

    // Verify public profile ownership if provided
    if (validation.data.publicProfileId) {
      const { data: profile } = await supabase.from("public_profiles").select("id").eq("id", validation.data.publicProfileId).eq("user_id", user.id).single();
      if (!profile) {
        return apiErr("NOT_FOUND", "Public profile not found or unauthorized", 404);
      }
    }

    // Never store raw PII in metadata — strip obvious fields if present
    let safeMetadata = validation.data.metadata || null;
    if (safeMetadata && typeof safeMetadata === "object") {
      const copy = { ...(safeMetadata as Record<string, unknown>) };
      delete (copy as Record<string, unknown>).ip;
      delete (copy as Record<string, unknown>).email;
      safeMetadata = copy;
    }

    await AnalyticsService.recordEvent({
      userId: user.id,
      publicProfileId: validation.data.publicProfileId || null,
      eventType: validation.data.eventType,
      jobId: validation.data.jobId || null,
      metadata: safeMetadata,
    });

    return apiOk({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record event";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}
