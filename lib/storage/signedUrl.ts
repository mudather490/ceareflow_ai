import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

/**
 * Storage Signed URL Generator
 * Spec: docs/architecture/05_STORAGE_AND_VIDEO.md:1
 * TTLs:
 *  - Resumes: 60s
 *  - Videos: 300s
 *  - Interview Answers: 300s (owner-only)
 */

export async function createSignedDownloadUrl(
  bucket: "resumes" | "videos" | "interview-answers",
  filePath: string,
  expiresInSec: number = 60,
  useServiceRole: boolean = false
): Promise<string> {
  const supabase = useServiceRole ? createServiceClient() : await createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresInSec);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL for ${bucket}/${filePath}: ${error?.message}`);
  }

  return data.signedUrl;
}
