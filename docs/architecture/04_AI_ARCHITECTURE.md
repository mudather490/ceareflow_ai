# AI Architecture — CareerFlow AI

> How AI is integrated safely: provider-agnostic service layer, anti-fabrication hardening, and prompt safety. AI is never called directly from React components and never leaks API keys to the browser.

---

## 1. Goals

1. **Isolation:** UI → Application Service → AI Service → AI Provider. (`docs/decisions/ADR-003-AI-SERVICE-LAYER.md:1`)
2. **Portability:** Gemini can be swapped for OpenAI/Azure without changing services or handlers.
3. **Non-fabrication:** Every AI surface that emits candidate facts is constrained to never invent experience, metrics, or skills — missing data yields a placeholder prompt.
4. **Auditability:** Each LLM call persists `promptHash` + `model` + `latencyMs` alongside its result row (so results can be reproduced / compared).
5. **Rate awareness:** LLM calls are server-side only and rate-limited before invoking the provider.

---

## 2. Layers (ASCII)

```
┌──────────────────────────────────────────────┐
│ React (client islands only)                  │  MediaRecorder, beacon, forms, copy link
│  never calls fetch('https://generativelanguage...'),       │
│  never imports lib/ai/providers/*            │
├──────────────────────────────────────────────┤
│ Application Services (lib/services/*)        │  CareerProfileService, VideoService, etc.
│  orchestrate: validate → fetch data → call   │
│  AI Service interfaces → persist → respond    │
├──────────────────────────────────────────────┤
│ AI Service Interfaces (lib/ai/services/*)    │  9 typed service interfaces
│  contracts: ResumeParser, JobParser, etc.    │
│  each: async fn(args) => DTO (pure, testable)│
├──────────────────────────────────────────────┤
│ Provider Adapters (lib/ai/providers/*)       │  GeminiProvider implements every interface
│  (one file per provider)                     │  future: OpenAIProvider, MockProvider
└──────────────────┬───────────────────────────┘
                   │ fetch with {GEMINI_API_KEY}  (server env only)
                   ▼
              Gemini API  (or alternative)
```

---

## 3. Service Catalogue

| Service | File (interface) | Inputs | Outputs (DTO) | Called from |
|---|---|---|---|---|
| **Resume Parser** | `lib/ai/services/resumeParser.ts` | `{ pdfText or storageKey, userId }` | `{ name, title, summary, location, contacts, experiences[], education[], skills[], projects[], certifications[] }` | `POST /api/profile/resume` hydration |
| **Job Parser** | `jobParser.ts` | `{ jobDescription }` | `{ requirements[], requiredSkills[], niceToHave[], qualifications[] }` | `VideoService.matchResumeToJob`, `ResumeAnalyzer` |
| **Resume ↔ Job Matcher** | `resumeJobMatcher.ts` | `{ resumeVersion, job, jobParserOut, careerProfile }` | `{ score 0..100, strongMatches[], partialMatches[], missingWeak[], talkingPoints[], aiInsight, raw }` → persists `job_matches` | `POST /api/video-resume/match` |
| **Script Generator** | `scriptGenerator.ts` | `{ careerProfile, resumeVersion, job, jobMatch }` → variants `shorten`/`natural` | `{ opening, experience, skills, closing, wordCount }` → persists `scripts` | `GET/POST /api/video-resume/script` |
| **Interview Question Generator** | `interviewQuestionGenerator.ts` | `{ job, careerProfile, interviewType, difficulty, priorQs, questionCount }` | `{ question, hint }` | `POST /api/interviews`, `GET .../next-question` |
| **Interview Follow-up Engine** | `interviewFollowupEngine.ts` | `{ job, careerProfile, lastQuestion, lastAnswerMeta, history(3) }` | `{ nextQuestion, hint, followUpCue, isPivot? }` | `PUT .../answers` continuation |
| **Interview Feedback Engine** | `interviewFeedbackEngine.ts` | `{ job, careerProfile, interview, questions, answers }` | `{ overallScore, label, dimensions, strengths[], weaknesses[], aiRecommendation }` | `PATCH interviews→completed` worker |
| **Resume Analyzer** | `resumeAnalyzer.ts` | `{ resumeVersion, job? }` | `{ summary, categoryScores, suggestions[] }` | `POST /api/resume-ai/analyze` |
| **Resume Improvement Engine** | `resumeImprovementEngine.ts` | `{ resumeVersion, suggestionsAccepted }` | (future: re-rank) — in MVP part of analyzer path | internal to analyze |

Each interface is an `@interface`-style object:

```ts
// lib/ai/services/scriptGenerator.ts
export interface ScriptGenerator {
  generate(args: ScriptGeneratorArgs): Promise<ScriptDTO>;
  generateVariant(args: ScriptGeneratorArgs & { variant: 'shorten'|'natural' }): Promise<ScriptDTO>;
}
export type ScriptGeneratorArgs = {
  careerProfile: CareerProfileDTO;
  resumeVersion: ResumeVersionDTO;
  job: JobDTO;
  jobMatch: JobMatchDTO;
};
export type ScriptDTO = { opening: string; experience: string; skills: string; closing: string; wordCount: number };
```

The provider (`lib/ai/providers/gemini.ts`) implements all 9 interfaces as a single `GeminiProvider` class so prompt helpers can share system preambles and output validators.

---

## 4. Provider Adapter

### 4.1 Interface

```ts
// lib/ai/provider.ts
export interface AIProvider {
  resumeParser: ResumeParser;
  jobParser: JobParser;
  resumeJobMatcher: ResumeJobMatcher;
  scriptGenerator: ScriptGenerator;
  interviewQuestionGenerator: InterviewQuestionGenerator;
  interviewFollowupEngine: InterviewFollowupEngine;
  interviewFeedbackEngine: InterviewFeedbackEngine;
  resumeAnalyzer: ResumeAnalyzer;
}
export function getAIProvider(): AIProvider {
  const name = process.env.AI_PROVIDER ?? 'gemini';
  if (name === 'gemini') return new GeminiProvider();
  if (name === 'openai') return new OpenAIProvider();
  if (name === 'mock')   return new MockProvider(); // tests
  throw new Error(`Unknown AI_PROVIDER=${name}`);
}
```

### 4.2 Gemini provider sketch

```ts
// lib/ai/providers/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
export class GeminiProvider implements AIProvider {
  private client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  private modelId = process.env.GEMINI_MODEL ?? 'gemini-1.5-pro';
  // each method: build prompt → call generateContent with JSON responseSchema
  //               → validate with zod output schema → throw TypedAIError on failure
}
```

Environment (`docs/implementation/01_PROJECT_FOUNDATION.md:1`):

```
GEMINI_API_KEY=...        # secret, never NEXT_PUBLIC_*
GEMINI_MODEL=gemini-1.5-pro
AI_PROVIDER=gemini        # or 'openai' | 'mock'
```

### 4.3 Replaceability check

To add OpenAI, create `lib/ai/providers/openai.ts` implementing the same interfaces using `openai.chat.completions.create`. Only `getAIProvider` branches — handlers and services stay unchanged.

---

## 5. Prompt Safety — Anti-Fabrication Contract

Every prompt that can emit candidate facts (ScriptGenerator, ResumeImprovement, ResumeAnalyzer suggestion texts, Matcher talking points) includes the **shared preamble**:

```
System rules:
- You are writing on behalf of the candidate using ONLY facts present in CAREER_PROFILE and RESUME_VERSION and JOB.
- DO NOT invent: company names, job titles, technologies, programming languages, metrics, dates, certifications, or achievements not present.
- If a factual claim is needed but evidence is absent (e.g. a % impact), DO NOT hallucinate a number. Instead emit a placeholder of the form:
    [NEEDS_USER: <what is needed, e.g. "accuracy lift % for recommendation engine">]
- The UI will render this placeholder as a yellow dashed box with "Tell us more: ...".
- If no relevant experience exists for a required section, write a short acknowledgement acknowledging the gap rather than claiming false experience.
- Keep the tone: professional, honest, helpful.
```

Post-generation validation (server before persist):

```ts
function validateNonFabrication(output: ScriptDTO, allowedFacts: AllowedFacts): void {
  // lightweight check: if any token in output is a metric (% / $ / count)
  // that does not appear in allowedFacts.metrics, fail and retry with stronger system prompt.
  // Two retries max, else surface a user-prompt variant asking for the missing metric.
}
```

No handler persists a script/feedback body that fails this validation — it must either appear as a placeholder or not at all.

---

## 6. Prompt Shapes (summaries — full prompts in lib/)

### Resume Parser

```
Extract JSON from resumeText. Tables:
- experiences: { company,title,start,end,isCurrent,bullets[] }
- education: { institution,degree,field,start,end }
- skills: unique list
Constraints: do not infer dates; leave null if ambiguous; bullets preserve verbatim text.
```

### Job Parser + Matcher

```
JobParser → skills + requirements (no scoring).
Matcher
  Input: extracted resume fields + jobParser output.
  Task: classify each requiredSkill into strong/partial/missing via evidence in resumeVersion + careerProfile.
  Score: 0..100 via weighted rubric (exposed in prompt for determinism) — used as alignment indicator only.
  Also produce talkingPoints (2-3) which are the script's anchor material.
```

### Script Generator

```
Sectioned output: { opening, experience, skills, closing }.
Target 90-150s spoken = 120-190 words total; no section > 60 words.
Include talkingPoints verbatim in experience/skills.
Variants:
- shorten: "Reduce total words by ~30%, keep placeholders."
- natural: "Rewrite for conversational flow — keep structure, fixes placeholders preserved."
```

### Interview Question Generator

```
System: You are an interviewer for {job.title} at {company}.
Profile context: {headline, key experiences}
Difficulty {easy|medium|hard} scales follow-up depth and terminology.
Output: JSON { question, hint }.
Do not ask the same question as prior history (included for dedup).
Types: behavioral→STAR scenarios, technical→depth on profile's tech, mixed→alternate.
```

### Interview Follow-up Engine

```
Given lastAnswerMeta (duration, textLen, structure tags, if available semantic cues),
choose: follow_up (deeper on hinted weakness), pivot (new competency), or summarize.
Emit nextQuestion + hint + followUpCue (for AI Insight badge).
Must reference lastAnswer content where possible (e.g. "You mentioned Scikit-learn — tell me how you tuned…").
```

### Interview Feedback Engine

```
Grade transcript + optional semantic signals across dimensions:
  communication, technical, structureSTAR, confidence, conciseness, relevance.
Return overallScore, label, per-dimension scores, strengths[], weaknesses[], aiRecommendation (markdown, 1 paragraph 60-90 words with STAR recommendation when structure < 70).
Scales: 0..100 each, weighs STAR heavily when interviewType is behavioral.
```

### Resume Analyzer + Improvement

```
Analyzer: audit against ATS+impact+clarity+structure+relevance (when job exists).
  Emit summary + categoryScores + suggestions (8-16) each with { category,target,original,suggested,prompt,reasoning,confidence }.
  When missing evidence for a stronger bullet, emit prompt (question) and leave suggested null/partial.
  Never suggest a fact not in base resume or profile.
```

---

## 7. Reliability & Cost Controls

| Concern | Mitigation |
|---|---|
| Latency | Target ≤8s for match, ≤6s for script, ≤4s for interview next-question. No concurrency explosion — interviews are serialized. |
| Rate cost | Per-endpoint limits (see `docs/architecture/03_API_ARCHITECTURE.md:1`); no concurrent calls for the same user within the same handler. |
| API outage | Call wrapper `withRetry(max=2, backoff=exponential)`; after retries return `503 AI_UNAVAILABLE` with safe UX instead of hallucinated fallback. |
| Output validation | Each service has a `zod` output schema; mismatch triggers a single re-prompt with the schema error context (parse failure → retry with stricter format instruction). |
| Observability | Every call logs `(service, model, promptHash, latencyMs, tokensIn/Out)` when available — used for cost panels (`/analytics` internal in Phase 8). |

---

## 8. Testing AI Services (see `docs/implementation/05_TESTING.md:1`)

- **MockProvider** bypasses the network and returns golden fixtures — used for all CI unit tests.
- **Non-fabrication suite:** a corpus of profiles *intentionally lacking a metric* feeds ScriptGenerator; test suite asserts no fabricated number appears in any mocked or golden non-mock pass (human QA loop for live validation).
- **Schema conformance suite:** 50+ generated outputs must parse against their `zod` output schemata.
- **Provider swap test:** same prompt inputs yield shape-equivalent outputs (not identical text) under Gemini vs OpenAI adapters.

---

## 9. Future Option — Python Service

If Phase 9 reveals a need for long-running semantic analysis, STT (Whisper), or heavy video transcoding, an optional Python sidecar (FastAPI + Celery/RQ on Fly.io) is pre-planned. Gemini would still be called from that service; the AI service interface boundary would be preserved via HTTP rather than SDK calls:

```
Next.js (Node)  ──HTTP──►  Python /ai/* (FastAPI)  ──► Gemini API / STT
                ◄──DTO────
```

In MVP, **do NOT introduce Python**. This is documented as an ADR deferment (`docs/decisions/ADR-001`): stay single-runtime until measured latency/accuracy proves insufficient.

