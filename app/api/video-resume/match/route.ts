import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { matchRequestSchema } from "@/lib/validation/videoResume";
import { VideoResumeService } from "@/lib/services/videoResumeService";
import { rateLimitByRequest } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/video-resume/match
 * 3A: Executes Job Matching Pipeline.
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

    const rl = rateLimitByRequest(request, { keyPrefix: "video-match", limit: 10, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) return apiErr("RATE_LIMITED", "Too many match requests (10/hr)", 429);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiErr("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const validation = matchRequestSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return apiErr(
        "VALIDATION_ERROR",
        firstIssue?.message || "Invalid match request",
        400,
        { field: firstIssue?.path.join(".") }
      );
    }

    const matchResult = await VideoResumeService.matchJob(
      user.id,
      validation.data
    );

    return apiOk(matchResult);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to execute job match";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}
