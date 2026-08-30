# ADR-003 — AI Service Layer (Provider Abstraction)

- **Status:** Accepted
- **Date:** 2026-08-30 (Phase 0)
- **Deciders:** AI Product Architect + Lead Software Architect (Phase 0 agent)
- **Related:** `docs/architecture/04_AI_ARCHITECTURE.md:1`, `docs/architecture/03_API_ARCHITECTURE.md:1`

---

## 1. Context

Nine AI behaviors exist at product definition time (plus future Python outsourcing): resume parsing, job parsing, job matching, script generation + variants, interview question/generation-followup/feedback, resume analysis/improvement. Hard-wiring Gemini calls directly into `page.tsx` or `route.ts` would scatter provider details, harden fabrication behavior in multiple places, and make a later swap to OpenAI or Azure require cherry-picking many files.

The design mandates AI be *behind* a service layer — not directly in UI components (`Product §8`).

## 2. Decision

All AI calls pass through a typed three-layer abstraction:

```
Application Service (e.g. VideoService.matchResumeToJob)
       │
       └─► AI Service interface (e.g. ResumeJobMatcher.match(args) → DTO)
              │
              └─► Provider adapter (e.g. GeminiProvider implements every interface)
                     │
                     └─► Gemini API (single env secret)
```

### 2.1 Artifacts

| Path | Role | Imports allowed |
|---|---|---|
| `lib/ai/services/<name>.ts` | Interface + arg/DTO + shared output `zod` schema for that service | nothing AI-provider-specific |
| `lib/ai/providers/gemini.ts` | `class GeminiProvider implements AIProvider` (method per interface) | `@google/generative-ai`, provider model configs, shared safety helpers |
| `lib/ai/provider.ts` | `getAIProvider(): AIProvider` switch on `AI_PROVIDER` env | providers — the only place provider selection lives |
| `lib/ai/safety/nonFabrication.ts` | Shared anti-fabrication preamble + output validator (`[NEEDS_USER: …]` insertion) | imported by each provider method where emit-of-candidate-fact occurs |

### 2.2 Rules

1. **No `NEXT_PUBLIC_*` provider key.** `GEMINI_API_KEY` is server-only; `lib/ai/providers/*` asserts `typeof window === 'undefined'` at top.
2. **No UI component imports `lib/ai/**`.** Components call `fetch('/api/...')`; handlers import services.
3. **Each AI behavior is an interface method, not a handler helper.** Handlers never assemble prompts. Handlers only call `getAIProvider().<service>.generate(...)` via the owning `Application Service` for symmetry (or directly through the service layer — both acceptable; direct provider call from handler without going through an AI service method is forbidden).
4. **Output schemas are shared.** Each interface exports a `zod` `OutputSchema` that the provider validates against; mismatch triggers one retry with a fix preamble before bubbling `AI_UNAVAILABLE`.
5. **Swapping provider needs exactly one new file + one switch branch.** See `04_AI_ARCHITECTURE.md:1`§4.3.

## 3. Alternatives Considered

| Alternative | Why rejected |
|---|---|
| Call Gemini directly from each `route.ts` helper function | Duplication of prompt safety, inconsistent retries, sprawl of keys/configs, swap becomes a patch set across ~9 files |
| Use `mcp__azure__*` or similar MCP server for AI (prompts via MCP) | Tight coupling of MCP surface into app; less deterministic than SDK; adds network hop — revisit when MCP ground-up AI is the project goal |
| Shared LangChain / Vercel AI SDK as abstraction | Heavy runtime dependency (≈100 kB) and mutable wrapper — the project only needs 9 narrow interfaces, not agent orchestration; deferred to Phase 8 re-evaluation |

## 4. Consequences

- **Positive:** Mock provider (deterministic fixtures) covers every AI route in tests without touching the network — CI stays offline, gating is deterministic.
- **Positive:** Prompt safety lives in one layer — non-fabrication preamble + validator can be unit-tested with a corpus once.
- **Negative:** Adds one extra interface type per service (keeps codebase slightly larger) — offset by clarity.
- **Negative:** Early Gemini model version pin (`GEMINI_MODEL=gemini-1.5-pro`) is exposed as env; provider upgrade needs explicit bump + fixture revalidation.

## 5. Compliance

- No PR in Phases 3–6 may commit a `route.ts` that calls `new GoogleGenerativeAI`, `OpenAI(...)`, or `process.env.GEMINI_API_KEY` directly. It must call `getAIProvider().<svc>.method(...)` or go through `Application Service → AI Service`.
- Any proposal adding a new AI behavior must add a new `lib/ai/services/<name>.ts` interface + method on `AIProvider` (and implement in both `GeminiProvider` + `MockProvider`).
- Removing the guard's fabrication validation from any provider method requires a superseding ADR with a replacement guard and corpus evidence.

