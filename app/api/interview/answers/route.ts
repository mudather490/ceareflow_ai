import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { interviewAnswerSchema } from "@/lib/validation/interviews";
import { InterviewService } from "@/lib/services/interviewService";

export const dynamic = "force-dynamic";

/**
 * POST /api/interview/answers
 * Submit an answer and obtain AI feedback (score 0-100).
 * Body: { sessionId, questionId, answer }
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

    const validation = interviewAnswerSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return apiErr("VALIDATION_ERROR", firstIssue?.message || "Invalid answer", 400, {
        field: firstIssue?.path.join("."),
      });
    }

    const result = await InterviewService.submitAnswer(user.id, validation.data);

    return apiOk(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit answer";
    if (message.includes("not found") || message.includes("unauthorized") || message.includes("does not belong")) {
      return apiErr("NOT_FOUND", message, 404);
    }
    if (message.includes("AI") || message.includes("evaluate")) {
      return apiErr("AI_UNAVAILABLE", message, 503);
    }
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}
