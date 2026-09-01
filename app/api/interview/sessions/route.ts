import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { interviewSetupSchema } from "@/lib/validation/interviews";
import { InterviewService } from "@/lib/services/interviewService";

export const dynamic = "force-dynamic";

/**
 * POST /api/interview/sessions
 * Create an interview session for authenticated user's job.
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

    const validation = interviewSetupSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return apiErr("VALIDATION_ERROR", firstIssue?.message || "Invalid session data", 400, {
        field: firstIssue?.path.join("."),
      });
    }

    const session = await InterviewService.createSession(user.id, validation.data);
    return apiOk(session, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create interview session";
    if (message.includes("Job not found") || message.includes("unauthorized")) {
      return apiErr("NOT_FOUND", message, 404);
    }
    if (message.includes("Career profile not found")) {
      return apiErr("VALIDATION_ERROR", message, 400);
    }
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}

/**
 * GET /api/interview/sessions
 * List user's interview sessions (for dashboard recent list)
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

    const sessions = await InterviewService.listSessions(user.id);
    return apiOk(sessions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list sessions";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}
