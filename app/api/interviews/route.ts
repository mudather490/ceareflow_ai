import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { interviewSetupSchema } from "@/lib/validation/interviews";
import { InterviewService } from "@/lib/services/interviewService";
import { rateLimitByRequest } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitByRequest(request, { keyPrefix: "interview-create", limit: 6, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) return apiErr("RATE_LIMITED", "Rate limit exceeded (6/hr)", 429);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiErr("UNAUTHORIZED", "Authentication required", 401);
    const body = await request.json().catch(() => null);
    if (!body) return apiErr("VALIDATION_ERROR", "Invalid JSON payload", 400);
    const validation = interviewSetupSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return apiErr("VALIDATION_ERROR", firstIssue?.message || "Invalid session data", 400, { field: firstIssue?.path.join(".") });
    }
    const session = await InterviewService.createSession(user.id, validation.data);
    return apiOk(session, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create session";
    if (message.includes("Job not found")) return apiErr("NOT_FOUND", message, 404);
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiErr("UNAUTHORIZED", "Authentication required", 401);
    const sessions = await InterviewService.listSessions(user.id);
    return apiOk(sessions);
  } catch (error) {
    return apiErr("INTERNAL_ERROR", error instanceof Error ? error.message : "Failed", 500);
  }
}
