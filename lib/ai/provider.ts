import { ResumeParser } from "./services/resumeParser";
import { JobParser } from "./services/jobParser";
import { ResumeJobMatcher } from "./services/resumeJobMatcher";
import { ScriptGenerator } from "./services/scriptGenerator";
import { InterviewQuestionGenerator } from "./services/interviewQuestionGenerator";
import { InterviewAnswerEvaluator } from "./services/interviewAnswerEvaluator";
import { ResumeAnalyzer } from "./services/resumeAnalyzer";
import { GeminiProvider } from "./providers/gemini";
import { MockProvider } from "./providers/mock";

/**
 * AI Provider Abstraction Interface
 * Spec: docs/decisions/ADR-003-AI-SERVICE-LAYER.md:1
 */
export interface AIProvider {
  resumeParser: ResumeParser;
  jobParser: JobParser;
  resumeJobMatcher: ResumeJobMatcher;
  scriptGenerator: ScriptGenerator;
  interviewQuestionGenerator: InterviewQuestionGenerator;
  interviewAnswerEvaluator: InterviewAnswerEvaluator;
  resumeAnalyzer: ResumeAnalyzer;
}

export function getAIProvider(): AIProvider {
  const providerName = (process.env.AI_PROVIDER || "").toLowerCase().trim();
  const apiKey = process.env.GEMINI_API_KEY || "";

  // Fallback to mock for local dev without real key, dummy placeholders, or test env
  const isPlaceholderKey =
    !apiKey ||
    apiKey.trim() === "" ||
    apiKey.includes("dummy") ||
    apiKey.includes("your-") ||
    apiKey.length < 20;

  if (providerName === "mock" || process.env.NODE_ENV === "test" || isPlaceholderKey) {
    return new MockProvider();
  }

  if (providerName === "gemini" || !providerName) {
    // Guard: if gemini requested but key is still placeholder, fallback mock (fails open)
    if (isPlaceholderKey) return new MockProvider();
    return new GeminiProvider();
  }

  throw new Error(`Unsupported AI_PROVIDER: "${providerName}". Supported values: gemini, mock`);
}
