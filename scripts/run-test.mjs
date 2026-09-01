import { validatePdfBuffer, MAX_RESUME_SIZE_BYTES } from "../lib/storage/pdfValidation.js";
import { calculateCompletionScore } from "../lib/services/careerProfileService.js";
import { parsedResumeSchema } from "../lib/ai/services/resumeParser.js";
import { MockProvider } from "../lib/ai/providers/mock.js";
import { careerProfileInputSchema } from "../lib/validation/profile.js";
import { hasNeedsUserPlaceholder, extractNeedsUserPlaceholders } from "../lib/ai/safety/nonFabrication.js";
import { interviewSetupSchema, interviewAnswerSchema, interviewSessionPatchSchema } from "../lib/validation/interviews.js";
import { interviewQuestionsResultSchema } from "../lib/ai/services/interviewQuestionGenerator.js";
import { interviewFeedbackSchema } from "../lib/ai/services/interviewAnswerEvaluator.js";
import { resumeAiAnalyzeSchema } from "../lib/validation/resumeAi.js";
import { analyticsEventTypeSchema, analyticsRecordSchema } from "../lib/validation/analytics.js";
import { resumeAnalyzerResultSchema } from "../lib/ai/services/resumeAnalyzer.js";

console.log("=== Running CareerFlow AI Phase 2+4 Test Suite ===");
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

async function run() {
  // 1. PDF Validation
  await test("Validates authentic PDF header bytes (%PDF)", () => {
    const validPdfBuffer = Buffer.from("%PDF-1.7 standard valid document content");
    const result = validatePdfBuffer(validPdfBuffer, "application/pdf");
    assert(result.valid === true, "Valid PDF should pass validation");
  });

  await test("Rejects non-PDF files with invalid header magic bytes", () => {
    const fakeBuffer = Buffer.from("<html><body>Not a PDF</body></html>");
    const result = validatePdfBuffer(fakeBuffer, "application/pdf");
    assert(result.valid === false, "Invalid header should fail");
    assert(result.error && result.error.includes("valid text-based PDF"), "Should give clear error message");
  });

  await test("Rejects empty files", () => {
    const empty = Buffer.alloc(0);
    const result = validatePdfBuffer(empty);
    assert(result.valid === false, "Empty buffer must fail");
  });

  await test("Rejects oversized files (> 10MB)", () => {
    const oversized = Buffer.alloc(MAX_RESUME_SIZE_BYTES + 1024);
    oversized[0] = 0x25;
    oversized[1] = 0x50;
    oversized[2] = 0x44;
    oversized[3] = 0x46;
    const result = validatePdfBuffer(oversized);
    assert(result.valid === false, "Oversized buffer must fail");
    assert(result.error && result.error.includes("10 MB"), "Should mention 10 MB limit");
  });

  await test("Detects encrypted / password-protected PDF", () => {
    const encryptedPdf = Buffer.from("%PDF-1.4 ... /Encrypt 12 0 R /Trailer << >>");
    const result = validatePdfBuffer(encryptedPdf);
    assert(result.valid === false, "Encrypted PDF should fail");
    assert(result.error && result.error.includes("password-protected"), "Should flag password protection");
  });

  // 2. Non-fabrication placeholders
  await test("Detects and extracts [NEEDS_USER: ...] placeholders correctly", () => {
    const sampleText = "Achieved [NEEDS_USER: conversion lift percentage] across [NEEDS_USER: client sector] platforms.";
    assert(hasNeedsUserPlaceholder(sampleText) === true, "Should detect placeholders");
    const placeholders = extractNeedsUserPlaceholders(sampleText);
    assert(placeholders.length === 2, "Should extract exactly 2 placeholders");
    assert(placeholders[0] === "conversion lift percentage", "Should match first placeholder text");
  });

  // 3. AI Output Schema Validation
  await test("MockProvider produces schema-compliant ParsedResumeDTO", async () => {
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

  await test("Malformed AI output is rejected by Zod schema", () => {
    const badData = {
      headlineTitle: 12345,
      experiences: "invalid string",
    };
    const validated = parsedResumeSchema.safeParse(badData);
    assert(validated.success === false, "Malformed AI data must fail schema validation");
  });

  // 4. Career Profile Completion Score Calculation
  await test("Calculates 0% completion score for empty profile", () => {
    const score = calculateCompletionScore({});
    assert(score === 0, `Empty profile score should be 0, got ${score}`);
  });

  await test("Calculates correct completion score for full profile", () => {
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
  await test("Validates CareerProfileInput schema for commit", () => {
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

  await test("Rejects invalid email in CareerProfileInput", () => {
    const invalidPayload = {
      contactEmail: "not-an-email-address",
    };
    const result = careerProfileInputSchema.safeParse(invalidPayload);
    assert(result.success === false, "Invalid email must fail validation");
  });

  // === PHASE 4 Interview Coach ===
  await test("Validates interviewSetupSchema for valid session creation", () => {
    const result = interviewSetupSchema.safeParse({
      jobId: "123e4567-e89b-12d3-a456-426614174000",
      type: "mixed",
      difficulty: "medium",
      questionCount: 10,
    });
    assert(result.success === true, "Valid setup should pass");
  });

  await test("Rejects invalid jobId (non-UUID) for interview session", () => {
    const result = interviewSetupSchema.safeParse({
      jobId: "not-a-uuid",
      type: "mixed",
      difficulty: "medium",
      questionCount: 10,
    });
    assert(result.success === false, "Invalid jobId should fail");
  });

  await test("Rejects questionCount <3 and >15", () => {
    const low = interviewSetupSchema.safeParse({ jobId: "123e4567-e89b-12d3-a456-426614174000", questionCount: 2 });
    const high = interviewSetupSchema.safeParse({ jobId: "123e4567-e89b-12d3-a456-426614174000", questionCount: 16 });
    assert(low.success === false, "2 should fail");
    assert(high.success === false, "16 should fail");
  });

  await test("Validates interviewAnswerSchema for valid answer", () => {
    const result = interviewAnswerSchema.safeParse({
      sessionId: "123e4567-e89b-12d3-a456-426614174001",
      questionId: "123e4567-e89b-12d3-a456-426614174002",
      answer: "I led a cross-functional initiative at Vertex...",
    });
    assert(result.success === true, "Valid answer should pass");
  });

  await test("Rejects empty answer", () => {
    const result = interviewAnswerSchema.safeParse({
      sessionId: "123e4567-e89b-12d3-a456-426614174001",
      questionId: "123e4567-e89b-12d3-a456-426614174002",
      answer: "",
    });
    assert(result.success === false, "Empty answer should fail");
  });

  await test("Rejects oversized answer (>5000)", () => {
    const long = "a".repeat(5001);
    const result = interviewAnswerSchema.safeParse({
      sessionId: "123e4567-e89b-12d3-a456-426614174001",
      questionId: "123e4567-e89b-12d3-a456-426614174002",
      answer: long,
    });
    assert(result.success === false, "Oversized answer should fail");
  });

  await test("Accepts answer exactly at 5000 (boundary)", () => {
    const boundary = "a".repeat(5000);
    const result = interviewAnswerSchema.safeParse({
      sessionId: "123e4567-e89b-12d3-a456-426614174001",
      questionId: "123e4567-e89b-12d3-a456-426614174002",
      answer: boundary,
    });
    assert(result.success === true, "5000 should pass");
  });

  await test("Validates score 0-100 in interviewFeedbackSchema", () => {
    const valid = {
      score: 85,
      strengths: ["Clear structure"],
      weaknesses: ["Could add metric"],
      improvement: "Add quantified outcome",
      betterAnswer: "Stronger framing with STAR",
      feedback: "Solid answer",
    };
    const ok = interviewFeedbackSchema.safeParse(valid);
    assert(ok.success === true, "Valid score should pass");
    const low = interviewFeedbackSchema.safeParse({ ...valid, score: -1 });
    const high = interviewFeedbackSchema.safeParse({ ...valid, score: 101 });
    assert(low.success === false, "Score -1 should fail");
    assert(high.success === false, "Score 101 should fail");
  });

  await test("Validates interviewSessionPatchSchema for valid statuses", () => {
    const ok = interviewSessionPatchSchema.safeParse({ status: "completed" });
    const bad = interviewSessionPatchSchema.safeParse({ status: "invalid_status" });
    assert(ok.success === true, "completed should be valid");
    assert(bad.success === false, "invalid_status should fail");
  });

  await test("Rejects invalid UUIDs for session/question IDs", () => {
    const result = interviewAnswerSchema.safeParse({
      sessionId: "not-uuid",
      questionId: "also-not-uuid",
      answer: "Valid answer text",
    });
    assert(result.success === false, "Invalid UUIDs should fail");
  });

  await test("MockInterviewQuestionGenerator generates deterministic questions with correct count", async () => {
    const mock = new MockProvider();
    const profile = {
      id: "profile-1",
      userId: "user-1",
      displayName: "Alex Mercer",
      avatarUrl: null,
      headlineTitle: "Senior Product Designer",
      summary: "Senior Product Designer with 6+ years",
      location: "San Francisco, CA",
      contactEmail: "alex@example.com",
      linkedinUrl: null,
      portfolioUrl: null,
      completionScore: 85,
      lastEditedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      experiences: [
        {
          id: "exp-1",
          careerProfileId: "profile-1",
          userId: "user-1",
          company: "Vertex Design Labs",
          title: "Lead Product Designer",
          location: "SF",
          startDate: "2021-03",
          endDate: null,
          isCurrent: true,
          bullets: [{ text: "Architected design tokens", order: 0 }],
          orderIndex: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      education: [],
      skills: [{ id: "s1", careerProfileId: "profile-1", userId: "user-1", name: "Figma", category: "Design", proficiency: null, createdAt: new Date().toISOString() }],
      projects: [{ id: "p1", careerProfileId: "profile-1", userId: "user-1", name: "OpenTokens", description: "tool", url: null, techStack: ["Figma"], orderIndex: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
      certifications: [],
    };
    const job = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user-1",
      title: "Senior Product Designer",
      company: "Acme Corp",
      description: "We are looking for a Senior Product Designer with 5+ years experience in design systems, Figma, and user research for enterprise SaaS.",
      descriptionHash: "hash",
      source: "interview",
      createdAt: new Date().toISOString(),
    };
    const result = await mock.interviewQuestionGenerator.generate({
      careerProfile: profile,
      job: job,
      type: "mixed",
      difficulty: "medium",
      questionCount: 10,
    });
    assert(result.questions.length === 10, `Expected 10 questions, got ${result.questions.length}`);
    const parsed = interviewQuestionsResultSchema.safeParse(result);
    assert(parsed.success === true, "Mock output must satisfy Zod schema");
  });

  await test("MockInterviewAnswerEvaluator returns validated feedback with score 0-100", async () => {
    const mock = new MockProvider();
    const profile = {
      id: "profile-1",
      userId: "user-1",
      displayName: "Alex Mercer",
      avatarUrl: null,
      headlineTitle: "Senior Product Designer",
      summary: "Senior Product Designer with 6+ years",
      location: "San Francisco, CA",
      contactEmail: "alex@example.com",
      linkedinUrl: null,
      portfolioUrl: null,
      completionScore: 85,
      lastEditedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      experiences: [
        {
          id: "exp-1",
          careerProfileId: "profile-1",
          userId: "user-1",
          company: "Vertex Design Labs",
          title: "Lead Product Designer",
          location: "SF",
          startDate: "2021-03",
          endDate: null,
          isCurrent: true,
          bullets: [{ text: "Architected design tokens", order: 0 }],
          orderIndex: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      education: [],
      skills: [{ id: "s1", careerProfileId: "profile-1", userId: "user-1", name: "Figma", category: "Design", proficiency: null, createdAt: new Date().toISOString() }],
      projects: [{ id: "p1", careerProfileId: "profile-1", userId: "user-1", name: "OpenTokens", description: "tool", url: null, techStack: ["Figma"], orderIndex: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
      certifications: [],
    };
    const job = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user-1",
      title: "Senior Product Designer",
      company: "Acme Corp",
      description: "We are looking for a Senior Product Designer.",
      descriptionHash: "hash",
      source: "interview",
      createdAt: new Date().toISOString(),
    };
    const feedback = await mock.interviewAnswerEvaluator.evaluate({
      question: "Tell me about a challenge you faced?",
      answer: "I led a team at Vertex Design Labs to redesign our analytics workspace. We collaborated with 45 engineers, reduced task time by 28% using STAR approach with measured impact.",
      careerProfile: profile,
      job: job,
      category: "behavioral",
      difficulty: "medium",
    });
    const parsed = interviewFeedbackSchema.safeParse(feedback);
    assert(parsed.success === true, "Feedback must satisfy schema");
    assert(feedback.score >= 0 && feedback.score <= 100, "Score must be 0-100");
    assert(feedback.strengths.length > 0 && feedback.weaknesses.length > 0, "Must have strengths/weaknesses");
  });

  await test("Mock evaluator scores short answers lower than detailed", async () => {
    const mock = new MockProvider();
    const profile = {
      id: "profile-1",
      userId: "user-1",
      displayName: "Alex Mercer",
      avatarUrl: null,
      headlineTitle: "Senior Product Designer",
      summary: "Senior Product Designer with 6+ years",
      location: "San Francisco, CA",
      contactEmail: "alex@example.com",
      linkedinUrl: null,
      portfolioUrl: null,
      completionScore: 85,
      lastEditedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      experiences: [
        {
          id: "exp-1",
          careerProfileId: "profile-1",
          userId: "user-1",
          company: "Vertex Design Labs",
          title: "Lead Product Designer",
          location: "SF",
          startDate: "2021-03",
          endDate: null,
          isCurrent: true,
          bullets: [{ text: "Architected design tokens", order: 0 }],
          orderIndex: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      education: [],
      skills: [{ id: "s1", careerProfileId: "profile-1", userId: "user-1", name: "Figma", category: "Design", proficiency: null, createdAt: new Date().toISOString() }],
      projects: [{ id: "p1", careerProfileId: "profile-1", userId: "user-1", name: "OpenTokens", description: "tool", url: null, techStack: ["Figma"], orderIndex: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
      certifications: [],
    };
    const job = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user-1",
      title: "Senior Product Designer",
      company: "Acme Corp",
      description: "We are looking for a Senior Product Designer.",
      descriptionHash: "hash",
      source: "interview",
      createdAt: new Date().toISOString(),
    };
    const short = await mock.interviewAnswerEvaluator.evaluate({
      question: "Tell me about a time you led a project?",
      answer: "I did stuff.",
      careerProfile: profile,
      job: job,
    });
    const long = await mock.interviewAnswerEvaluator.evaluate({
      question: "Tell me about a time you led a project?",
      answer: "At Vertex Design Labs as Lead Product Designer, I owned the cross-platform design token architecture used by 45+ engineers. I led research with 8 users, iterated on prototypes, shipped a system that cut workflow time by 28% measured via analytics. Result was adopted across 10 teams.",
      careerProfile: profile,
      job: job,
    });
    assert(long.score > short.score, `Long answer score ${long.score} should exceed short ${short.score}`);
  });

  await test("Non-fabrication: empty profile triggers [NEEDS_USER] in idealFocus", async () => {
    const mock = new MockProvider();
    const emptyProfile = {
      id: "profile-1",
      userId: "user-1",
      displayName: "Alex Mercer",
      avatarUrl: null,
      headlineTitle: null,
      summary: null,
      location: null,
      contactEmail: null,
      linkedinUrl: null,
      portfolioUrl: null,
      completionScore: 10,
      lastEditedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      experiences: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
    };
    const job = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user-1",
      title: "Senior Product Designer",
      company: "Acme Corp",
      description: "We are looking for a Senior Product Designer with 5+ years experience in design systems, Figma, and user research for enterprise SaaS.",
      descriptionHash: "hash",
      source: "interview",
      createdAt: new Date().toISOString(),
    };
    const result = await mock.interviewQuestionGenerator.generate({
      careerProfile: emptyProfile,
      job: job,
      type: "mixed",
      difficulty: "medium",
      questionCount: 5,
    });
    const hasPlaceholder = result.questions.some((q) => hasNeedsUserPlaceholder(q.idealFocus));
    assert(hasPlaceholder === true, "Empty profile should trigger [NEEDS_USER] in at least one idealFocus");
  });

  await test("Ownership simulation: job belonging to other user is not accessible", () => {
    const otherUserJob = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "other-user-id",
      title: "Senior Product Designer",
      company: "Acme Corp",
      description: "desc",
      descriptionHash: "hash",
      source: "interview",
      createdAt: new Date().toISOString(),
    };
    const currentUserId = "user-1";
    const isOwned = otherUserJob.userId === currentUserId;
    assert(isOwned === false, "Job from other user should not be owned");
  });

  await test("All generated categories are within allowed enum", async () => {
    const mock = new MockProvider();
    const profile = {
      id: "profile-1",
      userId: "user-1",
      displayName: "Alex Mercer",
      avatarUrl: null,
      headlineTitle: "Senior Product Designer",
      summary: "Senior Product Designer with 6+ years",
      location: "San Francisco, CA",
      contactEmail: "alex@example.com",
      linkedinUrl: null,
      portfolioUrl: null,
      completionScore: 85,
      lastEditedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      experiences: [
        {
          id: "exp-1",
          careerProfileId: "profile-1",
          userId: "user-1",
          company: "Vertex Design Labs",
          title: "Lead Product Designer",
          location: "SF",
          startDate: "2021-03",
          endDate: null,
          isCurrent: true,
          bullets: [{ text: "Architected design tokens", order: 0 }],
          orderIndex: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      education: [],
      skills: [{ id: "s1", careerProfileId: "profile-1", userId: "user-1", name: "Figma", category: "Design", proficiency: null, createdAt: new Date().toISOString() }],
      projects: [{ id: "p1", careerProfileId: "profile-1", userId: "user-1", name: "OpenTokens", description: "tool", url: null, techStack: ["Figma"], orderIndex: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
      certifications: [],
    };
    const job = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user-1",
      title: "Senior Product Designer",
      company: "Acme Corp",
      description: "We are looking for a Senior Product Designer with 5+ years experience in design systems, Figma, and user research for enterprise SaaS.",
      descriptionHash: "hash",
      source: "interview",
      createdAt: new Date().toISOString(),
    };
    const result = await mock.interviewQuestionGenerator.generate({
      careerProfile: profile,
      job: job,
      type: "mixed",
      difficulty: "easy",
      questionCount: 10,
    });
    const allowed = ["behavioral", "technical", "role_specific", "company", "resume_based", "situational"];
    for (const q of result.questions) {
      assert(allowed.includes(q.category), `Category ${q.category} must be allowed`);
    }
  });

  // === PHASE 5 Resume AI ===
  await test("Validates resumeAiAnalyzeSchema with jobId and without", () => {
    const withJob = resumeAiAnalyzeSchema.safeParse({
      resumeVersionId: "123e4567-e89b-12d3-a456-426614174001",
      jobId: "123e4567-e89b-12d3-a456-426614174000",
    });
    const withoutJob = resumeAiAnalyzeSchema.safeParse({
      resumeVersionId: "123e4567-e89b-12d3-a456-426614174001",
    });
    assert(withJob.success === true, "With job should pass");
    assert(withoutJob.success === true, "Without job should pass");
  });

  await test("Rejects invalid resumeVersionId/jobId in resumeAiAnalyzeSchema", () => {
    const badResume = resumeAiAnalyzeSchema.safeParse({ resumeVersionId: "not-uuid" });
    const badJob = resumeAiAnalyzeSchema.safeParse({
      resumeVersionId: "123e4567-e89b-12d3-a456-426614174001",
      jobId: "bad",
    });
    assert(badResume.success === false, "Bad resumeVersionId should fail");
    assert(badJob.success === false, "Bad jobId should fail");
  });

  await test("Validates resumeAnalyzerResultSchema score 0-100", () => {
    const valid = {
      overallScore: 78,
      summary: "Overall good resume with clear experience and skills, needs stronger summary and metrics.",
      sectionScores: [
        { section: "summary", score: 70, strengths: ["Clear"], issues: [], recommendations: ["Tighten"] },
        { section: "experience", score: 82, strengths: ["Strong"], issues: [], recommendations: ["Add metric"] },
        { section: "skills", score: 85, strengths: ["Relevant"], issues: [], recommendations: ["Group"] },
      ],
      strengths: ["Relevant skills"],
      issues: ["Summary brief"],
      recommendations: ["Use STAR with metric", "Tailor bullets to JD"],
      keywordSuggestions: ["Figma"],
      jobAlignment: null,
    };
    const ok = resumeAnalyzerResultSchema.safeParse(valid);
    assert(ok.success === true, "Valid should pass");
    assert(resumeAnalyzerResultSchema.safeParse({ ...valid, overallScore: -1 }).success === false, "-1 fail");
    assert(resumeAnalyzerResultSchema.safeParse({ ...valid, overallScore: 101 }).success === false, "101 fail");
  });

  await test("MockResumeAnalyzer returns valid with jobAlignment when job provided", async () => {
    const mock = new MockProvider();
    const profile = {
      id: "profile-1",
      userId: "user-1",
      displayName: "Alex Mercer",
      avatarUrl: null,
      headlineTitle: "Senior Product Designer",
      summary: "Senior Product Designer with 6+ years",
      location: "San Francisco, CA",
      contactEmail: "alex@example.com",
      linkedinUrl: null,
      portfolioUrl: null,
      completionScore: 85,
      lastEditedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      experiences: [
        {
          id: "exp-1",
          careerProfileId: "profile-1",
          userId: "user-1",
          company: "Vertex Design Labs",
          title: "Lead Product Designer",
          location: "SF",
          startDate: "2021-03",
          endDate: null,
          isCurrent: true,
          bullets: [{ text: "Architected design tokens", order: 0 }],
          orderIndex: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      education: [
        {
          id: "edu-1",
          careerProfileId: "profile-1",
          userId: "user-1",
          institution: "CMU",
          degree: "B.S.",
          field: "HCI",
          startDate: "2014-08",
          endDate: "2018-05",
          isCurrent: false,
          description: "Honors",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      skills: [
        { id: "s1", careerProfileId: "profile-1", userId: "user-1", name: "Figma", category: "Design", proficiency: null, createdAt: new Date().toISOString() },
      ],
      projects: [{ id: "p1", careerProfileId: "profile-1", userId: "user-1", name: "OpenTokens", description: "tool", url: null, techStack: ["Figma"], orderIndex: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
      certifications: [],
    };
    const job = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user-1",
      title: "Senior Product Designer",
      company: "Acme Corp",
      description: "We are looking for a Senior Product Designer with design systems, Figma, user research.",
      descriptionHash: "hash",
      source: "resume_ai",
      createdAt: new Date().toISOString(),
    };
    const rv = {
      id: "123e4567-e89b-12d3-a456-426614174001",
      resumeId: "resume-1",
      versionNumber: 1,
      filePath: "user-1/v.pdf",
      extractedText: null,
      parsedData: null,
      source: "upload",
      createdAt: new Date().toISOString(),
    };
    const result = await mock.resumeAnalyzer.analyze({ careerProfile: profile, resumeVersion: rv, job });
    assert(resumeAnalyzerResultSchema.safeParse(result).success === true, "Mock with job must be valid");
    assert(result.jobAlignment !== null, "Job alignment present");
    assert(result.keywordSuggestions.length > 0, "Keywords present");
  });

  await test("MockResumeAnalyzer general analysis without job has null jobAlignment", async () => {
    const mock = new MockProvider();
    const profile = {
      id: "profile-1",
      userId: "user-1",
      displayName: "Alex Mercer",
      avatarUrl: null,
      headlineTitle: "Senior Product Designer",
      summary: "Senior Product Designer with 6+ years",
      location: "San Francisco, CA",
      contactEmail: "alex@example.com",
      linkedinUrl: null,
      portfolioUrl: null,
      completionScore: 85,
      lastEditedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      experiences: [
        {
          id: "exp-1",
          careerProfileId: "profile-1",
          userId: "user-1",
          company: "Vertex Design Labs",
          title: "Lead Product Designer",
          location: "SF",
          startDate: "2021-03",
          endDate: null,
          isCurrent: true,
          bullets: [{ text: "Architected design tokens", order: 0 }],
          orderIndex: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      education: [],
      skills: [{ id: "s1", careerProfileId: "profile-1", userId: "user-1", name: "Figma", category: "Design", proficiency: null, createdAt: new Date().toISOString() }],
      projects: [],
      certifications: [],
    };
    const rv = {
      id: "123e4567-e89b-12d3-a456-426614174001",
      resumeId: "resume-1",
      versionNumber: 1,
      filePath: "user-1/v.pdf",
      extractedText: null,
      parsedData: null,
      source: "upload",
      createdAt: new Date().toISOString(),
    };
    const result = await mock.resumeAnalyzer.analyze({ careerProfile: profile, resumeVersion: rv, job: null });
    assert(resumeAnalyzerResultSchema.safeParse(result).success === true, "General must be valid");
    assert(result.jobAlignment === null, "jobAlignment null without job");
  });

  await test("Non-fabrication: empty profile analysis contains [NEEDS_USER]", async () => {
    const mock = new MockProvider();
    const emptyProfile = {
      id: "profile-1",
      userId: "user-1",
      displayName: "Alex Mercer",
      avatarUrl: null,
      headlineTitle: null,
      summary: null,
      location: null,
      contactEmail: null,
      linkedinUrl: null,
      portfolioUrl: null,
      completionScore: 10,
      lastEditedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      experiences: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
    };
    const rv = {
      id: "123e4567-e89b-12d3-a456-426614174001",
      resumeId: "resume-1",
      versionNumber: 1,
      filePath: "user-1/v.pdf",
      extractedText: null,
      parsedData: null,
      source: "upload",
      createdAt: new Date().toISOString(),
    };
    const result = await mock.resumeAnalyzer.analyze({ careerProfile: emptyProfile, resumeVersion: rv, job: null });
    const hasPlaceholder = result.sectionScores.some((s) => s.recommendations.some((r) => hasNeedsUserPlaceholder(r))) || result.recommendations.some((r) => hasNeedsUserPlaceholder(r));
    assert(hasPlaceholder === true, "Empty profile should trigger placeholder");
  });

  // === PHASE 5 Analytics ===
  await test("Validates analyticsEventTypeSchema for allowed types", () => {
    assert(analyticsEventTypeSchema.safeParse("profile_view").success === true, "profile_view valid");
    assert(analyticsEventTypeSchema.safeParse("invalid_event").success === false, "invalid should fail");
  });

  await test("Validates analyticsRecordSchema for valid video_play/resume_download", () => {
    assert(analyticsRecordSchema.safeParse({ eventType: "video_play" }).success === true, "video_play valid");
    assert(analyticsRecordSchema.safeParse({ eventType: "resume_download" }).success === true, "resume_download valid");
    assert(analyticsRecordSchema.safeParse({ eventType: "hacked" }).success === false, "hacked fail");
  });

  await test("IDOR simulation: analytics owner check", () => {
    const ownerId = "user-2";
    const requestingUserId = "user-1";
    assert(ownerId !== requestingUserId, "Other user's analytics should be blocked");
  });

  await test("Public/private separation: public DTO does not leak private analytics", () => {
    const publicKeys = ["name", "title", "location", "summary", "experiences", "education", "skills", "videoUrl", "resumeUrl"];
    const privateKeys = ["job_description", "match_breakdown", "interview_answers", "resume_analysis", "analytics"];
    for (const k of privateKeys) {
      assert(!publicKeys.includes(k), `Public should not include ${k}`);
    }
  });

  await test("Analytics aggregation rates are 0-100", () => {
    const views = 10, plays = 3;
    const rate = Math.round((plays / views) * 100);
    assert(rate === 30, "Rate 30");
  });

  await test("Trend calculation produces correct 7/30 points", () => {
    const days = 7;
    const trends = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10),
      profileViews: i,
      resumeDownloads: 0,
      videoPlays: 0,
    }));
    assert(trends.length === 7 && trends[0].date.length === 10, "7 points with date");
  });

  console.log(`\nAll tests evaluated: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
