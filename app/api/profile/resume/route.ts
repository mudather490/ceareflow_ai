import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiErr } from "@/lib/api/response";
import { validatePdfBuffer } from "@/lib/storage/pdfValidation";
import { CareerProfileService } from "@/lib/services/careerProfileService";

export const dynamic = "force-dynamic";

/**
 * POST /api/profile/resume
 * Uploads a resume PDF, parses via AI, creates an immutable resume_version,
 * and returns the staged parsed DTO for the Review Extracted Data Sheet.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 * This endpoint NEVER updates canonical career_profiles data.
 * Staging output is returned for user review and confirmed via PATCH /api/profile.
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

    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return apiErr("VALIDATION_ERROR", "A PDF file is required", 400, {
        field: "file",
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate PDF format, size, header magic bytes, and password protection
    const validation = validatePdfBuffer(buffer, file.type);
    if (!validation.valid) {
      return apiErr("VALIDATION_ERROR", validation.error ?? "Invalid PDF document", 400, {
        field: "file",
      });
    }

    // Process upload + parse without committing to canonical profile
    const result = await CareerProfileService.parseAndStageResume(
      user.id,
      buffer,
      file.type || "application/pdf"
    );

    return apiOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process resume";
    return apiErr("INTERNAL_ERROR", message, 500);
  }
}
