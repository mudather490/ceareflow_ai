import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { interviewQuestionGenerateSchema } from "@/lib/validation/interviews";
import { InterviewService } from "@/lib/services/interviewService";

export const dynamic = "force-dynamic";

/**
 * POST /api/interview/questions
 * Generate or retrieve questions for an authorized session.
 * Body: { sessionId: uuid }
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

    const validation = interviewQuestionGenerateSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return apiErr("VALIDATION_ERROR", firstIssue?.message || "Invalid request", 400, {
        field: firstIssue?.path.join("."),
      });
    }

    const questions = await InterviewService.generateQuestionsForSession(
      user.id,
      validation.data.sessionId
    );

    return apiOk(questions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate questions";
    if (message.includes("not found") || message.includes("unauthorized")) {
      return apiErr("NOT_FOUND", message, 404);
    }
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}
