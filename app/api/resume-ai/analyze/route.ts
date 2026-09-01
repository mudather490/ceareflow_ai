import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { resumeAiAnalyzeSchema } from "@/lib/validation/resumeAi";
import { ResumeAiService } from "@/lib/services/resumeAiService";
import { rateLimitByRequest } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/resume-ai/analyze
 * Input: { resumeVersionId, jobId? }
 * Verifies ownership of resume and optional job, returns validated analysis.
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

    // Lightweight AI rate limit: 10 analyses per IP per hour (LLM cost protection, fails open)
    const rl = rateLimitByRequest(request, { keyPrefix: "resume-ai", limit: 10, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) {
      return apiErr("RATE_LIMITED", "Rate limit exceeded (10/hr). Try again later.", 429);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiErr("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const validation = resumeAiAnalyzeSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return apiErr("VALIDATION_ERROR", firstIssue?.message || "Invalid request", 400, {
        field: firstIssue?.path.join("."),
      });
    }

    const result = await ResumeAiService.analyze(user.id, validation.data);
    return apiOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze resume";
    if (message.includes("not found") || message.includes("unauthorized")) {
      return apiErr("NOT_FOUND", message, 404);
    }
    if (message.includes("AI") || message.includes("GEMINI")) {
      return apiErr("AI_UNAVAILABLE", message, 503);
    }
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}
