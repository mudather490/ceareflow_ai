/**
 * PDF Validation Service
 * Defense-in-depth validation for candidate resume uploads.
 * Spec: docs/architecture/07_SECURITY.md:120 and docs/architecture/05_STORAGE_AND_VIDEO.md:45
 */

export const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export type PdfValidationResult = {
  valid: boolean;
  error?: string;
  isScanned?: boolean;
};

/**
 * Validates a PDF buffer for MIME type, header magic bytes, size, and encryption.
 */
export function validatePdfBuffer(
  buffer: Buffer | Uint8Array,
  mimeTypeHint?: string
): PdfValidationResult {
  // 1. File size check
  if (buffer.length === 0) {
    return {
      valid: false,
      error: "Uploaded file is empty.",
    };
  }

  if (buffer.length > MAX_RESUME_SIZE_BYTES) {
    return {
      valid: false,
      error: "File exceeds the 10 MB limit. Please upload a smaller PDF resume.",
    };
  }

  // 2. Client MIME check
  if (mimeTypeHint && mimeTypeHint !== "application/pdf") {
    return {
      valid: false,
      error: "Unsupported file type. Please upload a valid PDF document.",
    };
  }

  // 3. Header Magic Bytes check (%PDF- = 0x25, 0x50, 0x44, 0x46)
  if (buffer.length < 4) {
    return {
      valid: false,
      error: "Corrupted PDF header. Please export a standard PDF resume.",
    };
  }

  const isPdfHeader =
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46; // F

  if (!isPdfHeader) {
    return {
      valid: false,
      error: "Unsupported file. Please upload a valid text-based PDF resume ≤10 MB.",
    };
  }

  // 4. Check for encryption / password-protection
  // In PDF structure, an encrypted file contains an /Encrypt dictionary reference.
  const rawString = Buffer.from(buffer.slice(0, Math.min(buffer.length, 32768))).toString("latin1");
  const endString = Buffer.from(buffer.slice(Math.max(0, buffer.length - 8192))).toString("latin1");
  const combined = rawString + endString;

  // Simple heuristic for encryption detection
  if (/\/Encrypt\s+\d+\s+\d+\s+R/.test(combined) || /\/Encrypt\s*<</.test(combined)) {
    return {
      valid: false,
      error: "This PDF is password-protected or encrypted. Please export an unlocked version.",
    };
  }

  // 5. Scanned / image-only heuristic check
  // If the entire PDF has no text stream commands (/Text, /Font, BT ... ET), flag as potentially scanned
  const hasTextTokens = /\b(BT|\/Font|\/Text)\b/.test(rawString) || /\b(BT|\/Font|\/Text)\b/.test(endString);
  const isScanned = !hasTextTokens;

  return {
    valid: true,
    isScanned,
  };
}
