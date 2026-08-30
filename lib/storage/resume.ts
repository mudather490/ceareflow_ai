import { createClient } from "@/lib/supabase/server";
import { validatePdfBuffer } from "./pdfValidation";

export type UploadResumeResult = {
  filePath: string;
  versionId: string;
  isScanned?: boolean;
};

/**
 * Uploads a validated resume PDF to the private resumes bucket.
 * Bucket path: resumes/{userId}/{versionId}.pdf
 */
export async function uploadResumePdf(
  userId: string,
  buffer: Buffer,
  mimeTypeHint: string = "application/pdf"
): Promise<UploadResumeResult> {
  const validation = validatePdfBuffer(buffer, mimeTypeHint);
  if (!validation.valid) {
    throw new Error(validation.error ?? "Invalid PDF document");
  }

  const versionId = crypto.randomUUID();
  const filePath = `${userId}/${versionId}.pdf`;

  const supabase = await createClient();

  const { error } = await supabase.storage
    .from("resumes")
    .upload(filePath, buffer, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    // If storage error occurs, bubble a clean error message
    throw new Error(`Failed to store resume PDF: ${error.message}`);
  }

  return {
    filePath,
    versionId,
    isScanned: validation.isScanned,
  };
}
