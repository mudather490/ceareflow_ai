import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { InterviewService } from "@/lib/services/interviewService";
import { interviewSessionPatchSchema } from "@/lib/validation/interviews";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiErr("UNAUTHORIZED", "Authentication required", 401);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(params.id)) return apiErr("VALIDATION_ERROR", "Invalid session ID format", 400, { field: "id" });
    const session = await InterviewService.getSessionById(user.id, params.id);
    if (!session) return apiErr("NOT_FOUND", "Session not found or unauthorized", 404);
    return apiOk(session);
  } catch (e) {
    return apiErr("INTERNAL_ERROR", e instanceof Error ? e.message : "Failed", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiErr("UNAUTHORIZED", "Authentication required", 401);
    const body = await request.json().catch(() => null);
    if (!body) return apiErr("VALIDATION_ERROR", "Invalid JSON", 400);
    const validation = interviewSessionPatchSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return apiErr("VALIDATION_ERROR", firstIssue?.message || "Invalid", 400, { field: firstIssue?.path.join(".") });
    }
    const updated = await InterviewService.patchSession(user.id, params.id, validation.data.status);
    return apiOk(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg.includes("not found")) return apiErr("NOT_FOUND", msg, 404);
    return apiErr("INTERNAL_ERROR", msg, 500);
  }
}
