import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { InterviewService } from "@/lib/services/interviewService";
import { interviewSessionPatchSchema } from "@/lib/validation/interviews";

export const dynamic = "force-dynamic";

/**
 * GET /api/interview/sessions/[id]
 * Retrieve an authorized interview session with questions/answers/progress.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiErr("UNAUTHORIZED", "Authentication required", 401);
    }

    if (!params.id || typeof params.id !== "string") {
      return apiErr("VALIDATION_ERROR", "Invalid session ID", 400, { field: "id" });
    }

    // Basic UUID format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(params.id)) {
      return apiErr("VALIDATION_ERROR", "Invalid session ID format", 400, { field: "id" });
    }

    const session = await InterviewService.getSessionById(user.id, params.id);

    if (!session) {
      return apiErr("NOT_FOUND", "Session not found or unauthorized", 404);
    }

    return apiOk(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to retrieve session";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}

/**
 * PATCH /api/interview/sessions/[id]
 * Update session status (e.g., completed, abandoned)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiErr("UNAUTHORIZED", "Authentication required", 401);
    }

    if (!params.id) {
      return apiErr("VALIDATION_ERROR", "Invalid session ID", 400, { field: "id" });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiErr("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const validation = interviewSessionPatchSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return apiErr("VALIDATION_ERROR", firstIssue?.message || "Invalid status", 400, {
        field: firstIssue?.path.join("."),
      });
    }

    const updated = await InterviewService.patchSession(user.id, params.id, validation.data.status);
    return apiOk(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update session";
    if (message.includes("not found") || message.includes("unauthorized")) {
      return apiErr("NOT_FOUND", message, 404);
    }
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}
