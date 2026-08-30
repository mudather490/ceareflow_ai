# ADR-001 — Technology Stack

- **Status:** Accepted
- **Date:** 2026-08-30 (Phase 0)
- **Deciders:** Product Architect + Lead Software Architect (Phase 0 agent)
- **Scope:** Project-wide — every future PR must implement within this stack or open a superseding ADR.

---

## 1. Context

Product requires:
- One integrated SaaS with shared auth/profile/resume across 3 AI modules.
- Rapid authenticated shell iteration + AI calls behind a swappable provider layer.
- Supabase is the planned backend (Postgres + Auth + Storage) — confirmed as product assumption.

The workspace at Phase 0 contains **no application code** (`E:\creare_ai` holds only `dising stitch/` design assets) — so there is no legacy to reconcile. Any recommendation must be forward-looking and justified, not prescribed by a competing scaffold.

## 2. Decision

Adopt:

| Layer | Choice | Notes |
|---|---|---|
| **Frontend** | Next.js 14+ (App Router) + React 18 + TypeScript (`strict`) | RSC + Route Handlers public-boundary `lib/ai` pattern |
| **Styling** | Tailwind CSS + shadcn/ui components | Mapped 1:1 to `DESIGN.md` tokens already used in every Stitch `code.html` — no competing system |
| **Validation** | `zod` + `react-hook-form` | Client + server share schemas (`lib/validation/`) |
| **Backend** | Next.js Route Handlers (no standalone server) | `app/api/**/route.ts`; services live in `lib/services/*` + `lib/ai/*` |
| **Database / Auth / Storage** | Supabase (Postgres + Auth + Storage) | RLS-per-row pattern; bucket assets as planned |
| **AI provider** | Gemini API behind `lib/ai/providers/gemini.ts` adapter, ref'd via `lib/ai/provider.ts:getAIProvider()` | `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` server-only; mock provider for CI |
| **Video capture** | Browser `MediaRecorder` (MVP) | No Mux/Cloudflare yet; 100 MB caps, webm |
| **Deployment** | Vercel (Next.js native) | `app.careerflow.ai` + Supabase same region |
| **VCS** | Git + GitHub | |

Explicitly **do NOT introduce Python/FastAPI in MVP** — even for AI/video processing. The single Node runtime is cheaper to operate and suffices until measured latency/accuracy proves otherwise. Document Python outsourcing as the future branch in `docs/architecture/04_AI_ARCHITECTURE.md:1`§9, not as a Phase 1 task.

Single package manager: **npm** (lowest friction with Vercel templates); pin Node ≥20.

## 3. Alternatives Considered

| Alternative | Why rejected |
|---|---|
| Separate backend (FastAPI/Express) | Double deploy, CORS, duplicated auth — no benefit for 20+ tables with RLS-weak auth |
| NestJS on standalone VM | Overkill for MVP; Vercel's edge + Node micro-tasks cover match/script delays acceptably |
| Firebase Auth + Firestore | Conflicts with required Supabase direction; RLS + Storage parity would be lost |
| Prisma ORM | Deferred: Supabase client + raw typed query helpers suffice at this scale; Prisma adds a migration layer without benefit until 50+ query variants appear |
| Remotion / Mux / Cloudflare Stream for video | Adds cost dependency and transcoding wait for a hero <3-min clip that native MediaRecorder + inline playback already satisfies |
| Python AI service from day one | Adds infra (Fly.io/Render), auth complexity (cross-service token), slower dev — justified only when live STT/Whisper or heavy semantic evals are measured as needed |

## 4. Consequences

- **Positive:** Single deploy, single auth model, single LLM abstraction point; token map from `DESIGN.md` slides into `tailwind.config.mjs` with 1:1 class names — nearly drop-in rendering match with Stitch mocks.
- **Positive:** Provider swap to OpenAI/Azure needs only a new `Provider` class (+ handler branching on `AI_PROVIDER`), not a rewrite of business logic.
- **Negative:** Node runtime is the only compute — if future ML needs Python features (Whisper), the switchover PR must add a sidecar + re-wire `MockProvider` for parity.
- **Negative:** Client browser must support `MediaRecorder` webm (Safari/mp4 fallback covers it; tested by `isTypeSupported` switch). Older laptops' hardware encoders will vary.

## 5. Compliance

- No PR in Phases 1–6 may introduce `python`, `fastapi`, `uvicorn`, or a separate `server/` folder unless this ADR is superseded.
- No PR may deviate from the RLS-gated Supabase Postgres contract in `02_DATABASE_SCHEMA.md:1`.
- Any stack-change initiative must update this file (increment status to `Superseded by ADR-00X`) and cite measured cause (latency/accuracy/load).
