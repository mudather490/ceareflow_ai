import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { VideoResumeService } from "@/lib/services/videoResumeService";
import { validateVideoBuffer } from "@/lib/storage/videoValidation";

export const dynamic = "force-dynamic";

/**
 * POST /api/video-resume/video
 * 3B: Uploads recorded video to private storage and creates draft public profile.
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

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return apiErr("VALIDATION_ERROR", "Multipart form-data expected", 400);
    }

    const jobId = formData.get("jobId") as string | null;
    const file = formData.get("file");
    const durationRaw = formData.get("durationSec") as string | null;
    const durationSec = durationRaw ? parseFloat(durationRaw) : undefined;

    if (!jobId) {
      return apiErr("VALIDATION_ERROR", "jobId is required", 400, {
        field: "jobId",
      });
    }

    // Validate jobId is a UUID to prevent injection and ensure IDOR guard works on canonical IDs
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(jobId)) {
      return apiErr("VALIDATION_ERROR", "Invalid job ID format", 400, { field: "jobId" });
    }

    if (durationSec !== undefined && (Number.isNaN(durationSec) || durationSec < 0 || durationSec > 600)) {
      return apiErr("VALIDATION_ERROR", "Invalid durationSec (0-600)", 400, { field: "durationSec" });
    }

    if (!file || !(file instanceof Blob)) {
      return apiErr("VALIDATION_ERROR", "A video file is required", 400, {
        field: "file",
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate video format, size, and magic bytes
    const validation = validateVideoBuffer(buffer, file.type);
    if (!validation.valid) {
      return apiErr("VALIDATION_ERROR", validation.error || "Invalid video", 400, {
        field: "file",
      });
    }

    const result = await VideoResumeService.saveRecordedVideo(
      user.id,
      jobId,
      buffer,
      validation.mimeType || file.type || "video/webm",
      durationSec
    );

    return apiOk(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload video";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}
