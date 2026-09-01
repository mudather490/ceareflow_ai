import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import {
  scriptGenerateSchema,
  scriptUpdateSchema,
} from "@/lib/validation/videoResume";
import { VideoResumeService } from "@/lib/services/videoResumeService";

export const dynamic = "force-dynamic";

/**
 * GET /api/video-resume/script?jobId=...&mode=...
 * 3B: Retrieves or auto-generates the script for a job.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiErr("UNAUTHORIZED", "Authentication required", 401);
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const mode = (searchParams.get("mode") || "initial") as
      | "initial"
      | "regenerate"
      | "shorten"
      | "natural";

    if (!jobId) {
      return apiErr("VALIDATION_ERROR", "jobId is required", 400, {
        field: "jobId",
      });
    }

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(jobId)) {
      return apiErr("VALIDATION_ERROR", "Invalid job ID", 400, { field: "jobId" });
    }
    if (!["initial", "regenerate", "shorten", "natural"].includes(mode)) {
      return apiErr("VALIDATION_ERROR", "Invalid mode", 400, { field: "mode" });
    }

    const script = await VideoResumeService.getOrCreateScript(
      user.id,
      jobId,
      mode
    );

    return apiOk(script);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load script";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}

/**
 * POST /api/video-resume/script
 * 3B: Generates, regenerates, shortens, or naturalizes script.
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

    const validation = scriptGenerateSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return apiErr(
        "VALIDATION_ERROR",
        firstIssue?.message || "Invalid script request",
        400,
        { field: firstIssue?.path.join(".") }
      );
    }

    const script = await VideoResumeService.getOrCreateScript(
      user.id,
      validation.data.jobId,
      validation.data.mode
    );

    return apiOk(script);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate script";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}

/**
 * PATCH /api/video-resume/script
 * 3B: Saves user's manual script edits.
 */
export async function PATCH(request: NextRequest) {
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

    const validation = scriptUpdateSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return apiErr(
        "VALIDATION_ERROR",
        firstIssue?.message || "Invalid script update",
        400,
        { field: firstIssue?.path.join(".") }
      );
    }

    const updated = await VideoResumeService.saveCustomScript(
      user.id,
      validation.data.jobId,
      {
        opening: validation.data.opening,
        experience: validation.data.experience,
        skills: validation.data.skills,
        closing: validation.data.closing,
      }
    );

    return apiOk(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update script";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}
