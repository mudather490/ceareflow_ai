import { ResumeParser } from "./services/resumeParser";
import { GeminiProvider } from "./providers/gemini";
import { MockProvider } from "./providers/mock";

/**
 * AI Provider Abstraction Interface
 * Spec: docs/decisions/ADR-003-AI-SERVICE-LAYER.md:1
 */
export interface AIProvider {
  resumeParser: ResumeParser;
}

export function getAIProvider(): AIProvider {
  const providerName = (process.env.AI_PROVIDER || "").toLowerCase().trim();

  // In test environments or when explicitly set to mock, or when GEMINI_API_KEY is not configured
  if (providerName === "mock" || process.env.NODE_ENV === "test" || !process.env.GEMINI_API_KEY) {
    return new MockProvider();
  }

  if (providerName === "gemini" || !providerName) {
    return new GeminiProvider();
  }

  throw new Error(`Unsupported AI_PROVIDER: "${providerName}". Supported values: gemini, mock`);
}
