import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { validateVideoBuffer } from "./videoValidation";

export type UploadVideoResult = {
  videoId: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
};

/**
 * Uploads a validated video to the private 'videos' Supabase storage bucket.
 * Bucket topology: videos/{userId}/{jobId}/{videoId}.webm
 */
export async function uploadVideoBuffer(
  userId: string,
  jobId: string,
  buffer: Buffer,
  mimeTypeHint: string = "video/webm"
): Promise<UploadVideoResult> {
  const validation = validateVideoBuffer(buffer, mimeTypeHint);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid video buffer");
  }

  const videoId = nanoid();
  const extension = validation.mimeType === "video/mp4" ? "mp4" : "webm";
  const storagePath = `videos/${userId}/${jobId}/${videoId}.${extension}`;

  const supabase = await createClient();

  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(storagePath, buffer, {
      contentType: validation.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload video to storage: ${uploadError.message}`);
  }

  return {
    videoId,
    storagePath,
    mimeType: validation.mimeType || "video/webm",
    fileSize: buffer.length,
  };
}
