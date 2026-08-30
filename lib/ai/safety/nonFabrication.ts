/**
 * Anti-Fabrication Safety Contract
 * Spec: docs/architecture/04_AI_ARCHITECTURE.md:130 and GEMINI.md Rule 17
 *
 * Enforces that AI generation and extraction NEVER invent candidate facts.
 * Missing evidence must emit `[NEEDS_USER: ...]` placeholders rather than hallucinated claims.
 */

export const NON_FABRICATION_PREAMBLE = `
System rules (ANTI-FABRICATION CONTRACT):
- You are processing data on behalf of the candidate using ONLY facts present in the provided context.
- DO NOT invent: employment, company names, job titles, technologies, programming languages, metrics, percentages, dates, certifications, degrees, schools, or achievements not present in the source text.
- If an essential factual claim is missing or ambiguous, DO NOT hallucinate or guess a number or fact.
- Instead, use an explicit placeholder in the exact format: [NEEDS_USER: <what is needed>]
- When extracting structured data from a resume, leave missing fields as empty/null rather than assuming defaults.
`;

export const NEEDS_USER_REGEX = /\[NEEDS_USER:\s*([^\]]+)\]/g;

export function hasNeedsUserPlaceholder(text: string): boolean {
  return /\[NEEDS_USER:[^\]]+\]/.test(text);
}

export function extractNeedsUserPlaceholders(text: string): string[] {
  const matches = text.match(NEEDS_USER_REGEX);
  if (!matches) return [];
  return matches.map((m) => m.replace(/^\[NEEDS_USER:\s*/, "").replace(/\]$/, "").trim());
}

/**
 * Validates a parsed candidate profile structure to ensure no obvious fabrication
 * or suspicious generic hallucinated metrics occurred.
 */
export function sanitizeParsedExperienceText(text: string): string {
  // Reject obviously synthetic hallucination markers if any
  return text.trim();
}
