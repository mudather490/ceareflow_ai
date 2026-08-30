import { validatePdfBuffer, MAX_RESUME_SIZE_BYTES } from "../lib/storage/pdfValidation.js";
import { calculateCompletionScore } from "../lib/services/careerProfileService.js";
import { parsedResumeSchema } from "../lib/ai/services/resumeParser.js";
import { MockProvider } from "../lib/ai/providers/mock.js";
import { careerProfileInputSchema } from "../lib/validation/profile.js";
import { hasNeedsUserPlaceholder, extractNeedsUserPlaceholders } from "../lib/ai/safety/nonFabrication.js";

console.log("=== Running CareerFlow AI Phase 2 Test Suite ===");
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

// 1. PDF Validation
test("Validates authentic PDF header bytes (%PDF)", () => {
  const validPdfBuffer = Buffer.from("%PDF-1.7 standard valid document content");
  const result = validatePdfBuffer(validPdfBuffer, "application/pdf");
  assert(result.valid === true, "Valid PDF should pass validation");
});

test("Rejects non-PDF files with invalid header magic bytes", () => {
  const fakeBuffer = Buffer.from("<html><body>Not a PDF</body></html>");
  const result = validatePdfBuffer(fakeBuffer, "application/pdf");
  assert(result.valid === false, "Invalid header should fail");
  assert(result.error && result.error.includes("valid text-based PDF"), "Should give clear error message");
});

test("Rejects empty files", () => {
  const empty = Buffer.alloc(0);
  const result = validatePdfBuffer(empty);
  assert(result.valid === false, "Empty buffer must fail");
});

test("Rejects oversized files (> 10MB)", () => {
  const oversized = Buffer.alloc(MAX_RESUME_SIZE_BYTES + 1024);
  oversized[0] = 0x25;
  oversized[1] = 0x50;
  oversized[2] = 0x44;
  oversized[3] = 0x46;
  const result = validatePdfBuffer(oversized);
  assert(result.valid === false, "Oversized buffer must fail");
  assert(result.error && result.error.includes("10 MB"), "Should mention 10 MB limit");
});

test("Detects encrypted / password-protected PDF", () => {
  const encryptedPdf = Buffer.from("%PDF-1.4 ... /Encrypt 12 0 R /Trailer << >>");
  const result = validatePdfBuffer(encryptedPdf);
  assert(result.valid === false, "Encrypted PDF should fail");
  assert(result.error && result.error.includes("password-protected"), "Should flag password protection");
});

// 2. Non-fabrication placeholders
test("Detects and extracts [NEEDS_USER: ...] placeholders correctly", () => {
  const sampleText = "Achieved [NEEDS_USER: conversion lift percentage] across [NEEDS_USER: client sector] platforms.";
  assert(hasNeedsUserPlaceholder(sampleText) === true, "Should detect placeholders");
  const placeholders = extractNeedsUserPlaceholders(sampleText);
  assert(placeholders.length === 2, "Should extract exactly 2 placeholders");
  assert(placeholders[0] === "conversion lift percentage", "Should match first placeholder text");
});

// 3. AI Output Schema Validation
test("MockProvider produces schema-compliant ParsedResumeDTO", async () => {
  const mock = new MockProvider();
  const parsed = await mock.resumeParser.parse({
    pdfBuffer: Buffer.from("%PDF-1.7"),
    userId: "test-user-id",
  });

  const validated = parsedResumeSchema.safeParse(parsed);
  assert(validated.success === true, "Mock parser output must satisfy parsedResumeSchema");
  assert(parsed.name === "Alex Mercer", "Mock identity must be Alex Mercer");
  assert(parsed.experiences.length > 0, "Experiences must be populated");
  assert(parsed.skills.length > 0, "Skills must be populated");
});

test("Malformed AI output is rejected by Zod schema", () => {
  const badData = {
    headlineTitle: 12345,
    experiences: "invalid string",
  };
  const validated = parsedResumeSchema.safeParse(badData);
  assert(validated.success === false, "Malformed AI data must fail schema validation");
});

// 4. Career Profile Completion Score Calculation
test("Calculates 0% completion score for empty profile", () => {
  const score = calculateCompletionScore({});
  assert(score === 0, `Empty profile score should be 0, got ${score}`);
});

test("Calculates correct completion score for full profile", () => {
  const fullProfile = {
    headlineTitle: "Senior Product Designer",
    summary: "Experienced UX strategist",
    location: "San Francisco, CA",
    contactEmail: "alex@example.com",
    experiences: [{ company: "TechCorp", title: "Lead Designer" }],
    education: [{ institution: "CMU", degree: "M.S." }],
    skills: [{ name: "UX" }, { name: "Figma" }, { name: "CSS" }],
    projects: [{ name: "Design System" }],
    certifications: [],
  };
  const score = calculateCompletionScore(fullProfile);
  assert(score >= 80, `Full profile score should be >= 80%, got ${score}%`);
});

// 5. Profile Input Validation
test("Validates CareerProfileInput schema for commit", () => {
  const validPayload = {
    displayName: "Alex Mercer",
    headlineTitle: "Principal Designer",
    summary: "About text",
    location: "San Francisco, CA",
    contactEmail: "alex@example.com",
    experiences: [
      {
        company: "TechCorp",
        title: "Principal Designer",
        isCurrent: true,
        bullets: [{ text: "Led core redesign", order: 0 }],
      },
    ],
    skills: [{ name: "Figma", category: "Design" }],
  };
  const result = careerProfileInputSchema.safeParse(validPayload);
  assert(result.success === true, "Valid profile input should pass validation");
});

test("Rejects invalid email in CareerProfileInput", () => {
  const invalidPayload = {
    contactEmail: "not-an-email-address",
  };
  const result = careerProfileInputSchema.safeParse(invalidPayload);
  assert(result.success === false, "Invalid email must fail validation");
});

console.log(`\nAll Phase 2 tests evaluated: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
}
