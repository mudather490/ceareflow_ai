export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_VIDEO_DURATION_SEC = 180; // 3 minutes

export type VideoValidationResult = {
  valid: boolean;
  error?: string;
  mimeType?: string;
};

/**
 * Validates a video buffer against file size, MIME type, and magic bytes.
 * Spec: docs/architecture/05_STORAGE_AND_VIDEO.md:54 & docs/architecture/07_SECURITY.md:88
 */
export function validateVideoBuffer(
  buffer: Buffer,
  mimeTypeHint?: string
): VideoValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "The video file is empty." };
  }

  if (buffer.length > MAX_VIDEO_SIZE_BYTES) {
    return {
      valid: false,
      error: "The video file exceeds the 100 MB maximum size limit.",
    };
  }

  // 1. Check WebM magic bytes (EBML Header: 0x1A 0x45 0xDF 0xA3)
  const isWebM =
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3;

  // 2. Check MP4 / QuickTime magic bytes (ftyp at offset 4: 0x66 0x74 0x79 0x70)
  const isMP4 =
    buffer.length >= 8 &&
    buffer[4] === 0x66 && // 'f'
    buffer[5] === 0x74 && // 't'
    buffer[6] === 0x79 && // 'y'
    buffer[7] === 0x70;   // 'p'

  const normalizedHint = (mimeTypeHint || "").toLowerCase().trim();

  if (isWebM) {
    return { valid: true, mimeType: "video/webm" };
  }

  if (isMP4) {
    return { valid: true, mimeType: "video/mp4" };
  }

  // Allow browser webm recordings where header might be streamed chunk
  if (normalizedHint.includes("webm")) {
    return { valid: true, mimeType: "video/webm" };
  }

  if (normalizedHint.includes("mp4")) {
    return { valid: true, mimeType: "video/mp4" };
  }

  return {
    valid: false,
    error: "Invalid video format. Please upload or record a standard WebM or MP4 video.",
  };
}
