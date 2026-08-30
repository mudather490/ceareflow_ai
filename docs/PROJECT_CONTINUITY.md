# PROJECT CONTINUITY — CareerFlow AI

> **Permanent handoff document.** Any future agent (Gemini CLI, Gemini Pro, Claude Code, OpenCode, Cursor, human senior developer) must be able to continue this project without access to the previous agent's memory. Read this file **plus** `GEMINI.md:1` before touching code.
>
> **Last verified:** 2026-08-30 — by inspection of the actual repository (`E:\creare_ai`) and all blueprint documents. No application code was modified to create this file.
>
> **Authority order:** `GEMINI.md:1` (agent rules) > `ARCHITECTURE.md:1` (system overview) > `docs/architecture/*` (contract) > this file (continuity) > `docs/product/*` (product). If this file conflicts with `GEMINI.md` or `ARCHITECTURE.md`, the latter win — file a docs PR.

---

## 1. PROJECT IDENTITY

**Project name:** CareerFlow AI — `E:\creare_ai`

**What it is (one paragraph):** CareerFlow AI is **one integrated AI-powered career SaaS platform** that turns a single **Career Profile** into three private AI outcomes and one public outcome: a recruiter-ready Video Resume + shareable Public Recruiter Profile, a dynamic AI Interview Coach that scores and coaches across 8 dimensions, and an AI Resume Improvement loop that produces evidence-based, non-fabricating suggestions as a new immutable resume version. The candidate uploads a resume once, the system hydrates an editable Career Profile, and every module reuses that profile plus a shared Job context (title/company/description) — the user never re-pastes the same JD or maintains three disconnected apps.

**Why "ONE" matters:** `docs/product/01_PRODUCT_OVERVIEW.md:15` and `docs/decisions/ADR-002-SHARED-CAREER-PROFILE.md:18` forbid per-module copies of users, profiles, resumes, or jobs. The architecture enforces it via `docs/architecture/02_DATABASE_SCHEMA.md:11` invariants (one `career_profiles` per `user_id`, immutable `resume_versions`, single `jobs` table with `description_hash` dedup) and via `GEMINI.md:7` CI lint (`grep create table.*_users`). The three modules are **workflows over the same data**, not separate applications:

1. **Video Resume + Public Recruiter Profile** — `docs/modules/01_VIDEO_RESUME.md:1` (3-step: Match → Script+Video → Publish) + `docs/modules/02_PUBLIC_PROFILE.md:1` minimal page at `/p/[slug]`
2. **AI Interview Coach** — `docs/modules/04_INTERVIEW_COACH.md:1` (Setup → Live dynamic Q/A → Results bento)
3. **Resume AI** — `docs/modules/05_RESUME_AI.md:1` (Analyze → per-bullet Accept/Reject/Edit → Apply → new `resume_versions`)

**Shared core:** `Career Profile` (`career_profiles` + children `experiences`/`education`/`skills`/`projects`/`certifications`) hydrated from `resume_versions` (immutable history, `docs/architecture/02_DATABASE_SCHEMA.md:101`). Every module reads it; none duplicates it:

```
                    CAREER PROFILE (1 per user, versioned via resume_versions)
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
    VIDEO RESUME    AI INTERVIEW    RESUME AI
    + PUBLIC LINK   + TRAINING      + IMPROVEMENT
         \              |              /
          \   shared: jobs + JobService (dedup)
           \____________|_____________/
                        |
                  Analytics (private) + Storage (private buckets)
```

---

## 2. CURRENT PROJECT STATUS

**Inspection method:** `Get-ChildItem` of `E:\creare_ai` (2026-08-30 — **updated 2026-08-30 Phase 1 complete**). Foundation code now exists: `package.json` (Next 14.2.35), `tsconfig.json`, `tailwind.config.ts`, `next.config.mjs`, `app/` (App Router), `lib/`, `components/`, `middleware.ts`, `.env.example` + `.env.local` (dummy), `node_modules` installed. `dising stitch/` + `docs/` blueprint unchanged (30 files). Phase 0 18/18 PASS remains; Phase 1 gate: build+lint+typecheck PASS (see §11/§19). No `supabase/migrations` on disk yet (Phase 2).

| Area | Status | Notes |
|------|--------|-------|
| Product Blueprint | COMPLETE | `docs/product/01_PRODUCT_OVERVIEW.md:1`, `02_USER_FLOWS.md:1`, `03_FEATURES.md:1` (F-00…F-60), `04_INFORMATION_ARCHITECTURE.md:1` — flows 0–7 + acceptance criteria |
| Design System & Audit | PARTIALLY_COMPLETE | `DESIGN_SYSTEM.md:1` tokens/components + `PRODUCT_SPEC.md:81` 14 screen folders + `careerflow_ai/DESIGN.md:1` tokens — but Resume AI, My Applications dedicated table, Interview Progress chart, and detailed Analytics dashboard have no Stitch mock (tracked as `docs/implementation/06_DEPLOYMENT.md:1` O-001…O-003) |
| Design Assets | COMPLETE | `dising stitch/` — 15 inspected entries (14 screen `code.html`+`screen.png` + `careerflow_ai/DESIGN.md:1`) — see §9 |
| Project Foundation | COMPLETE | Next 14.2.35 App Router + TS strict + Tailwind 3 (DESIGN.md tokens verbatim) + shadcn primitives (Button/Card/Badge/Input/Textarea/Label/Dialog/Sheet/Skeleton/Separator/Tabs) + Supabase clients (`client.ts`/`server.ts`/`service.ts` with server-only guard) + `middleware.ts` auth gate + `(dashboard)` shell (SideNav w-64 + TopNav h-16 + MobileDrawer) + marketing/auth/public shells + `lib/validation/*` (zod) + `lib/env.ts` audit + lint `no-restricted-imports`. Build+lint+typecheck PASS 2026-08-30. No future module implemented. |
| Authentication | COMPLETE | Foundation: Supabase Auth PKCE + Google OAuth via `lib/supabase/*` + `middleware.ts` (PKCE refresh via @supabase/ssr, httpOnly) + `/auth/callback` + `/auth/signout` + `(auth)/login|signup` (zod + RHF + browser client) + `(dashboard)/layout.tsx` server guard. `001_init_users_and_trigger.sql` + RLS policies active. |
| Career Profile | COMPLETE | Database migrations 001–010 on disk; `CareerProfileService` + `ResumeParser` + `ReviewExtractedDataSheet` + `GET/PATCH /api/profile` + `POST /api/profile/resume` + live `/career-profile` and `/onboarding` wired |
| Video Resume (Match) | PLANNED | Spec `docs/modules/01_VIDEO_RESUME.md:1` Step 1 + `docs/architecture/04_AI_ARCHITECTURE.md:43` JobParser/Matcher; not implemented |
| AI Resume/Job Match | PLANNED | Same as above (score as alignment indicator, not hire probability) |
| AI Script Generation | PLANNED | `docs/modules/01_VIDEO_RESUME.md:1` Step 2 ScriptGenerator + anti-fabrication `lib/ai/safety/nonFabrication.ts:1`; not implemented |
| Video Recording | PLANNED | `docs/architecture/05_STORAGE_AND_VIDEO.md:54` `useMediaRecorder` + private `videos` bucket; not implemented |
| Public Profile | PLANNED | Minimal spec `docs/decisions/ADR-004-MINIMAL-PUBLIC-PROFILE.md:18` + `docs/modules/02_PUBLIC_PROFILE.md:1`; not implemented |
| Public Analytics | PLANNED | `docs/modules/03_PUBLIC_ANALYTICS.md:1` + `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:19` beacon + RLS; not implemented |
| Interview Coach | PLANNED | `docs/modules/04_INTERVIEW_COACH.md:1` (Setup/Live/Results); not implemented |
| Dynamic Interview Follow-up | PLANNED | `InterviewFollowupEngine` `docs/architecture/04_AI_ARCHITECTURE.md:53`; not implemented |
| Interview Feedback | PLANNED | `InterviewFeedbackEngine` 5-bar bento; not implemented |
| Interview Progress | PLANNED | Deferred polish — no Stitch mock (`O-002`); not implemented |
| Resume AI | PLANNED | `docs/modules/05_RESUME_AI.md:1` Analyze→Editor→Apply→new version; not implemented |
| Resume Versioning | COMPLETE | Immutable `resume_versions` append-only `003_resumes_and_versions.sql` + `CareerProfileService.parseAndStageResume` |
| My Applications | PLANNED | Table over shared `jobs` (`PRODUCT_SPEC.md:45`); not implemented — no dedicated Stitch (`O-001`) |
| Advanced analytics | PLANNED | Product events + AI cost (`docs/architecture/06_ANALYTICS_ARCHITECTURE.md:100`) deferred to Phase 8 |
| Advanced video processing | PLANNED | Thumbnail/transcode/HLS deferred (`docs/architecture/05_STORAGE_AND_VIDEO.md:164`) |
| Speech-to-text | PLANNED | Whisper sidecar deferred (`docs/architecture/04_AI_ARCHITECTURE.md:254`) |
| Additional AI providers | PLANNED | OpenAI adapter deferred — interface ready (`docs/decisions/ADR-003:36`) |
| Testing | PARTIALLY_COMPLETE | Spec `docs/implementation/05_TESTING.md:1` — Phase 1 gates PASS: `npm run build` ✓, `npm run lint` ✓ (0 errors, 3 img warnings), `npx tsc --noEmit` ✓. No unit/e2e corpus yet — planned Phase 9. |
| Deployment | PLANNED | Vercel + Supabase same region (`ARCHITECTURE.md:230`); Phase 10 checklist not yet executed |
| Phase 0 Consistency Review | COMPLETE | `docs/PHASE_0_REVIEW.md:1` — 18/18 PASS, 0 BLOCKER, 1 IMPORTANT (wording), 3 NON-BLOCKING |

Allowed values used: `COMPLETE`, `PARTIALLY_COMPLETE`, `PLANNED`, `NOT_STARTED`. Phase 1 COMPLETE 2026-08-30 — see §11 Gate. Next: Phase 2 Career Profile.

---

## 3. WHAT IS ALREADY BUILT

**Source of truth for this section is the filesystem, not the plan.** Every claim below was verified by `Get-ChildItem -Recurse`.

### 3.1 Blueprint & Architecture (COMPLETE, docs-only)

| Capability | What it does | Where it is implemented | Dependencies | Current limitations | Test status |
|---|---|---|---|---|---|
| Product blueprint | Vision, flows 0–7, IA sitemap/nav, feature matrix F-00…F-60 with AC | `docs/product/01_PRODUCT_OVERVIEW.md:1`, `02_USER_FLOWS.md:1`, `03_FEATURES.md:1`, `04_INFORMATION_ARCHITECTURE.md:1` | None (prose) | Resume AI / My Applications / Interview Progress have no Stitch mock — specs are by-analogy (see O-001…O-003) | Phase 0 review: PASS |
| System architecture | One-app diagram, frontend/backend/DB/storage/AI/analytics boundaries, deployment, failure modes | `ARCHITECTURE.md:1` + `docs/architecture/01_SYSTEM_ARCHITECTURE.md:1` | References ADRs | No code yet — contract only | Pass 18/18 checks |
| Database contract | 20+ tables, indexes, migrations 001…010, RLS invariants, whitelisting view | `docs/architecture/02_DATABASE_SCHEMA.md:1` | Supabase Postgres (not yet created) | Migrations are specified, not on disk | RLS probe specs planned (`05_TESTING.md:1` §3.5) |
| API contract | 25 route handlers, error envelope, rate limits, caching, security invariants | `docs/architecture/03_API_ARCHITECTURE.md:1` (+ `06_DEPLOYMENT.md:1` open questions) | Requires Phase 1 scaffolding | No `app/api/` yet | — |
| AI contract | 9 services + Provider adapter (Gemini default + MockProvider) + anti-fabrication preamble | `docs/architecture/04_AI_ARCHITECTURE.md:1` + `docs/decisions/ADR-003-AI-SERVICE-LAYER.md:1` | `GEMINI_API_KEY` env (secret, server-only) | Provider is Gemini 1.5-pro pin; OpenAI swap is one-file + switch branch (not yet needed) | Non-fabrication corpus planned (12 cases) |
| Storage & video contract | 3 private buckets, MediaRecorder lifecycle, signed URLs (60s/300s), fallbacks | `docs/architecture/05_STORAGE_AND_VIDEO.md:1` | `useMediaRecorder` hook (not yet coded) | No transcoding/thumbnail in MVP | — |
| Analytics contract | Beacon (`POST /api/public/:slug/view`) + owner-only aggregates, no PII | `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:1` + `docs/modules/03_PUBLIC_ANALYTICS.md:1` | `public_profile_views` table | Materialized daily rollup deferred to ≥50k views | — |
| Security contract | Threat model, RLS policies, public/private boundary, upload checks, injection, headers, PR checklist | `docs/architecture/07_SECURITY.md:1` | All future PRs must tick checklist (`07_SECURITY.md:218`) | CSP tightened in Phase 8 | — |

### 3.2 Design Audit (PARTIALLY_COMPLETE, assets + audit)

| Capability | What it does | Where | Dependencies | Limitations | Test status |
|---|---|---|---|---|---|
| Token audit | Material/M3 neutrals, typography (Inter), shape, spacing, elevation | `DESIGN_SYSTEM.md:1` §2 + `dising stitch/careerflow_ai/DESIGN.md:1` | Used by `tailwind.config.mjs` (not yet created) | `secondary=#4648d4` indigo vs narrative `#6366F1` — treated as equivalent | — |
| Screen inventory | 14 Stitch screen sets audited + reconciled | `dising stitch/` (see table in `PRODUCT_SPEC.md:81`) + `DESIGN_SYSTEM.md:1` §3–7 | — | 4 public-page variants reconciled to one minimal (`ADR-004`); Resume AI / Applications / Progress have no mock | Phase 0 review §3.4 coherent |
| Component audit | SideNavBar, TopNavBar, RecruiterNav, Button, Card, Badges, Inputs, Stepper, Score ring, Video hero | `DESIGN_SYSTEM.md:1` §3, §5 | shadcn/ui (not yet installed) | No custom `custom-indigo` allowed | — |

### 3.3 Governance (COMPLETE, docs-only)

| Capability | Where | Role |
|---|---|---|
| Agent rules | `GEMINI.md:1` (25 rules, survives OpenCode/Claude/Cursor) | Every session must read it first |
| Root briefs | `ARCHITECTURE.md:1`, `PRODUCT_SPEC.md:1`, `DESIGN_SYSTEM.md:1` | Executive + design authority |
| ADRs | `docs/decisions/ADR-001:1` Stack, `ADR-002:1` Shared Profile, `ADR-003:1` AI Layer, `ADR-004:1` Minimal Public | Frozen decisions; supersession protocol in §15 |
| Phase 0 review | `docs/PHASE_0_REVIEW.md:1` | 18/18 PASS, 0 blocker, I-01/N-01…N-03 tracked |
| Roadmap + open questions | `docs/implementation/06_DEPLOYMENT.md:1` O-001…O-008, `docs/implementation/01_PROJECT_FOUNDATION.md:1` §2 commands | Source for next-step |

**What is NOT built:** No `package.json`/`app/`/`supabase/`/`tailwind.config.*`/`node_modules` exists. No feature from §4 below has code on disk. This is intentional — Phase 0 was docs-only.

---

## 4. WHAT IS NOT BUILT YET

Detailed list by implementation priority. Status is from the actual repo (all `PLANNED`/`NOT_STARTED`), **not** from the plan's ambition. Phases are from `docs/implementation/06_DEPLOYMENT.md:1` and `ARCHITECTURE.md:248`.

### P0 — Required for MVP (must ship before the product is usable)

| Feature | What it is | Depends on | Blueprint ref | Current status |
|---|---|---|---|---|
| **Career Profile** | One `career_profiles` row per user + children; upload PDF → `ResumeParser` → Review sheet → `PATCH /api/profile` commit | Project Foundation (Phase 1) | `docs/product/01_PRODUCT_OVERVIEW.md:42`, `docs/architecture/02_DATABASE_SCHEMA.md:54`, `docs/modules/01_VIDEO_RESUME.md:1` foundation | PLANNED |
| **Video Resume — AI Resume/Job Match** | Picker + `jobs` dedup (`description_hash`) → `JobParser` + `ResumeJobMatcher` → `job_matches` (score as alignment indicator) + ring + chips + talking points | Career Profile + Jobs | `docs/modules/01_VIDEO_RESUME.md:1` Step 1, `docs/architecture/04_AI_ARCHITECTURE.md:53` | PLANNED |
| **AI Script Generation** | `ScriptGenerator` (+ `shorten`/`natural` variants) → 4-section script, `[NEEDS_USER: …]` placeholder on missing evidence | Career Profile + Job + Match | Same, Step 2 | PLANNED |
| **Video Recording** | `useMediaRecorder` → `video/webm` blob (≤180s, ≤100MB) → private `videos` bucket → `videos` row → draft `public_profiles` slug | Script | `docs/architecture/05_STORAGE_AND_VIDEO.md:54` | PLANNED |
| **Public Profile** | Minimal centered page `/p/[slug]` — name+title, hero video (300s signed URL), single resume card, actions (Play/Download/LinkedIn/Copy) | Video + Storage | `docs/modules/02_PUBLIC_PROFILE.md:1`, `docs/decisions/ADR-004:18` | PLANNED |
| **Public Analytics (ingest)** | Beacon `POST /api/public/:slug/view` (dedup 1h, `ip_hash` hashed, no PII) + `public_profile_views` table | Public Profile | `docs/modules/03_PUBLIC_ANALYTICS.md:1`, `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:19` | PLANNED |
| **Resume Versioning** | Immutable `resume_versions` (append-only), `hash` dedup, `parent_analysis_id` link | Career Profile | `docs/architecture/02_DATABASE_SCHEMA.md:101` | PLANNED |
| **Interview Coach — Setup + Live + Feedback** | Job picker reuse → `POST /api/interviews` → immersive Live loop (Q→video answer→Follow-up LLM→next) → `InterviewFeedbackEngine` bento (5 bars + AI recommendation) | Career Profile + Jobs + Storage | `docs/modules/04_INTERVIEW_COACH.md:1`, `docs/architecture/04_AI_ARCHITECTURE.md:53` | PLANNED |
| **Resume AI — Analyze + Editor + Apply** | `ResumeAnalyzer` → 8–16 `resume_suggestions` → Accept/Reject/Edit → `POST .../apply` → new `resume_versions` | Jobs (optional), resume_versions | `docs/modules/05_RESUME_AI.md:1` | PLANNED |
| **My Applications** | Table over shared `jobs` (cross-module), filters + row actions (open Video/Interview/Analytics) | Jobs | `docs/product/03_FEATURES.md:236` F-50, `docs/implementation/04_RESUME_AI.md:1` §6c | PLANNED (no Stitch mock — O-001) |
| **Testing harness** | `zod` validation, AI output schema, non-fabrication corpus (12 cases), RLS probes, Playwright e2e, axe a11y | Foundation | `docs/implementation/05_TESTING.md:1` | PLANNED |

### P1 — Important after MVP (ship in first patches / Phase 6c+7)

| Feature | What it is | Blueprint ref |
|---|---|---|
| **Public Analytics — Owner dashboard** | Time-series + device/referrer/country aggregates, `GET /analytics?profileId=` | `docs/modules/03_PUBLIC_ANALYTICS.md:1` §4, `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:68` |
| **Interview Progress history** | Trend over time + session comparison (`GET /interview/progress`) | `docs/modules/04_INTERVIEW_COACH.md:1` §5.2, O-002 |
| **Typed fallback for Interview Live** | Textarea answer path when camera denied | `docs/modules/04_INTERVIEW_COACH.md:1` §4.3, `docs/architecture/05_STORAGE_AND_VIDEO.md:154` |
| **Resume re-render (PDF)** | Server-side HTML→PDF for updated resume version (vs text-only viewer) | `docs/modules/05_RESUME_AI.md:1` §5, O-003 |
| **Storage quota UI** | Per-user 500 MB soft cap bar in Settings | `docs/architecture/05_STORAGE_AND_VIDEO.md:1` §7, `docs/architecture/07_SECURITY.md:152` |

### P2 — Future / Optional (only if product owner explicitly requests)

| Feature | What it is | Blueprint ref |
|---|---|---|
| **Advanced analytics** (product events, `product_events` + `ai_calls` tables) | Funnel + cost/latency panels | `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:100` (§3, §4 sketch) |
| **Advanced video processing** | Thumbnails, `video/webm`→`mp4`/`hls` transcoding, CDN | `docs/architecture/05_STORAGE_AND_VIDEO.md:164` (flag `videoProcessing`) |
| **Speech-to-text** | Whisper/FastAPI sidecar → transcripts for interview answers | `docs/architecture/04_AI_ARCHITECTURE.md:254` + `docs/decisions/ADR-001:35` |
| **Additional AI providers** | `OpenAIProvider` via `getAIProvider()` switch (one file) | `docs/decisions/ADR-003:36`, `docs/architecture/04_AI_ARCHITECTURE.md:124` |
| **Interview silence trimming** | Client-side VAD trimming | O-004 in `06_DEPLOYMENT.md:1` |
| **Referrer family maintenance** | TLD list upkeep for `referrerFamily(host)` | O-005 |

---

## 5. INTENTIONALLY DEFERRED FEATURES

> **Do not build these in MVP.** They are documented here so a future agent does not invent them as implied deliverables. Build only if the product owner files an explicit request and, where marked, a superseding ADR.

| Feature | Reason for deferral | Potential future phase | Relevant documentation |
|---|---|---|---|
| **Python/FastAPI sidecar** | Single Node runtime is cheaper and sufficient for MVP; adds infra + cross-service auth | Phase 9, only if STT/heavy semantic evals measured as needed | `docs/decisions/ADR-001:35`, `docs/architecture/04_AI_ARCHITECTURE.md:254` (`if Phase 9 reveals need… do NOT introduce Python in MVP`) |
| **Advanced speech-to-text (Whisper)** | No MVP requirement for transcripts; typed fallback covers camera-denied path | Phase 9+, sidecar if justified | Same + `docs/architecture/05_STORAGE_AND_VIDEO.md:172` |
| **Silence trimming / VAD** | Edge processing with marginal UX gain; extra client complexity | Phase 7 polish, O-004 | `docs/implementation/06_DEPLOYMENT.md:1` O-004 |
| **Advanced video processing (thumbnails, transcoding to mp4/hls, adaptive bitrate)** | `MediaRecorder` webm plays inline via signed URL; transcoding adds cost + wait for <3-min hero | Phase 9+ (flag `videoProcessing`) | `docs/architecture/05_STORAGE_AND_VIDEO.md:164` |
| **HTML-to-PDF rendering (puppeteer) for updated resumes** | Text-only viewer is acceptable in MVP; render quality needs product sign-off | Phase 6 polish, O-003 | `docs/modules/05_RESUME_AI.md:1` §5, `docs/implementation/04_RESUME_AI.md:1` §6 |
| **Advanced analytics (product_events, ai_calls, cost panels)** | Public `public_profile_views` beacon is the only owner-visible MVP metric; events are pre-modeled but not wired | Phase 8 | `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:100` §3–4, `docs/implementation/06_DEPLOYMENT.md:1` Phase 8 |
| **Advanced recruiter identity detection / fingerprinting** | Only `ip_hash` + 1h dedup + buckets; no fingerprinting per privacy | Not planned (deferred indefinitely) | `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:42`, `docs/architecture/07_SECURITY.md:110` |
| **Additional AI providers (OpenAI, Azure OpenAI)** | Gemini behind adapter is sufficient; swap is one file + switch branch when needed | When latency/accuracy/cost justifies | `docs/decisions/ADR-003:36`, `docs/architecture/04_AI_ARCHITECTURE.md:124` |
| **Advanced subscription/billing** | No billing in MVP (single user, free) | Post-MVP | `PRODUCT_SPEC.md:73` Non-Goals (team RBAC deferred) |
| **Mobile application (native)** | Responsive web only in MVP | Not planned | `PRODUCT_SPEC.md:73` Non-Goals |
| **Advanced job scraping / ATS integrations** (Greenhouse/Lever) | Paste-JD is the MVP input; scraping is a separate product | Phase ≥8 | `PRODUCT_SPEC.md:73` Non-Goals |
| **LinkedIn automation / auto-apply** | Paste-JD + share link is the recruiter loop; automation is out of scope | Not planned | Same |
| **Real-time recruiter interaction (chat, presence)** | No chat route exists; model is not exposed as chatbot on public page | Not planned | `docs/architecture/07_SECURITY.md:165` (no chat route) |
| **Custom domains for public profiles; rich public variant** | Minimal `/p/[slug]` on same domain is the recruiter contract | Only via `ADR-004` amendment (`is_rich_public` flag) | `docs/decisions/ADR-004:72` Amendment Path |
| **Top-performer recruiter theming** | Token change without product approval would break `DESIGN_SYSTEM.md:1` | Only with approved wireframe + `ADR-004` supersession | Same |

---

## 6. DO NOT BUILD NOW

> **Highly visible — read before writing any code.** A future agent that auto-builds a deferred feature violates this continuity document and `GEMINI.md:15`. The product owner must explicitly request it and, where required, an ADR must supersede the frozen decision.

**General rule:** Only implement **CURRENT** scope (`§2` PLANNED P0 for the active phase). Do not stretch a small fix into a large refactor, and do not pull forward `P1`/`P2`/deferred features because they appear in the long-term vision.

- **DO NOT** introduce Python, FastAPI, `uvicorn`, or a separate `server/` folder in MVP — `docs/decisions/ADR-001:35` forbids it until an ADR supersedes with measured cause.
- **DO NOT** create a separate backend application (Express, NestJS) — `ARCHITECTURE.md:63` and `docs/architecture/01_SYSTEM_ARCHITECTURE.md:160` prescribe Next.js Route Handlers only.
- **DO NOT** create a second resume system (`video_resumes`, `interview_resumes`) — `GEMINI.md:26` / `docs/decisions/ADR-002:26` forbid it; CI lints for `create table.*_resumes`.
- **DO NOT** create a second Career Profile (`video_career_profiles`) — same.
- **DO NOT** create a separate authentication system or `*_users` table per module — `GEMINI.md:21` / `docs/decisions/ADR-002:22`.
- **DO NOT** create separate databases for modules — there is one Supabase Postgres + 3 private buckets (`docs/architecture/05_STORAGE_AND_VIDEO.md:9`).
- **DO NOT** replace the AI service/provider abstraction merely because a different AI provider is used — `GEMINI.md:41`, `docs/decisions/ADR-003:18` require adding `lib/ai/providers/openai.ts` + switch branch in `lib/ai/provider.ts:1` only.
- **DO NOT** expose `GEMINI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix or import `lib/ai/providers/*` from a React component — `GEMINI.md:38`, `docs/architecture/07_SECURITY.md:30`.
- **DO NOT** add AI analytics dashboards, job-description bodies, skill matrices beyond one `Skills & Tools` chip cloud, interview state, or a chatbot to the public recruiter page — `docs/decisions/ADR-004:67` requires a superseding ADR + wireframe.
- **DO NOT** turn the Public Profile into a dashboard — same; `docs/modules/02_PUBLIC_PROFILE.md:1` §8 gates it.
- **DO NOT** expose private analytics publicly or echo raw IP / full `user-agent` — `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:66`, `docs/architecture/07_SECURITY.md:110`.
- **DO NOT** fabricate resume facts (experience, metrics, tech stacks) — `GEMINI.md:86`, `docs/architecture/04_AI_ARCHITECTURE.md:130` anti-fabrication preamble + `lib/ai/safety/nonFabrication.ts:1` required; missing data → `[NEEDS_USER: …]` placeholder.
- **DO NOT** rewrite working modules without a documented reason (bug link or ADR) — `GEMINI.md:48`.
- **DO NOT** replace the established design system (`surface`, `secondary=#4648d4`, `outline-variant`, typography sizes, `rounded` values) or invent `custom-indigo` — `GEMINI.md:74`, `DESIGN_SYSTEM.md:1` §8 checklist.
- **DO NOT** install large dependencies (LangChain, Vercel AI SDK, `puppeteer`, `ffmpeg`, `recharts`) without a technical reason tied to an active phase's task table — `docs/implementation/01_PROJECT_FOUNDATION.md:1` §2 pin, `docs/decisions/ADR-001:35`.
- **DO NOT** implement future roadmap features during an MVP task — only the active phase's `docs/implementation/0N_*.md` gate.
- **DO NOT** perform large architectural refactors while implementing a small feature — follow `GEMINI.md:121` small → test → review → document.
- **DO NOT** add `supabase/migrations/*` without `enable row level security` + owner policy — `docs/architecture/07_SECURITY.md:92` CI grep fails the PR.
- **DO NOT** import `createServiceClient` outside `app/api/public/*` or `lib/storage/signedUrl.ts:1` — `docs/architecture/03_API_ARCHITECTURE.md:233` lint `no-restricted-imports`.

Additional DO-NOT rules emerge from the repo's own invariants — check `GEMINI.md:1` §1–25 before each PR.

---

## 7. CURRENT ARCHITECTURE

> Shipped blueprint (not yet code). The authoritative contract is `docs/architecture/01_SYSTEM_ARCHITECTURE.md:1` + `docs/architecture/02_DATABASE_SCHEMA.md:1`; the summary below is a faithful abstract with ASCII diagrams for handoff.

### 7.1 Frontend

`Next.js 14+ App Router` (`docs/implementation/01_PROJECT_FOUNDATION.md:1` §2) — `React 18` + `TypeScript strict` (`strictNullChecks`, `noImplicitAny`). RSC for data loads; client islands only for `MediaRecorder` (`hooks/useMediaRecorder.ts:1`), clipboard, and the view beacon (`components/public-profile/ViewBeacon.tsx:1`). Styling is `Tailwind CSS` + `shadcn/ui` primitives (`Button`, `Card`, `Badge`, `Input`, `Dialog`, `Sheet`, `Skeleton`) with `tailwind.config.mjs` tokens mapped 1:1 from `dising stitch/careerflow_ai/DESIGN.md:1` (`surface`, `secondary=#4648d4`, `outline-variant`, typography sizes, `rounded` values) — see `DESIGN_SYSTEM.md:1` §2. Validation is `zod` + `react-hook-form` shared between forms and Route Handlers (`lib/validation/*`).

Directory plan (not yet on disk — `docs/architecture/01_SYSTEM_ARCHITECTURE.md:115`):

```
app/
  layout.tsx
  (marketing)/page.tsx                  → Landing
  (auth)/login/page.tsx, signup/page.tsx
  (dashboard)/layout.tsx                → SideNavBar + TopNavBar (auth shell)
    dashboard/page.tsx
    career-profile/page.tsx
    video-resume/{page, match/[id]/page, script/[id]/page, publish/[id]/page}
    interview/{page, [interviewId]/live/page, [interviewId]/results/page, progress/page}
    resume-ai/{page, [analysisId]/page}
    applications/page.tsx  analytics/{page, [id]/page}  settings/page.tsx  onboarding/page.tsx
  p/[slug]/page.tsx                     → Public recruiter (isolated shell, no sidebar)
  api/{profile/..., video-resume/..., public/..., interviews/..., resume-ai/...}
components/{ui, nav, career-profile, video-resume, interview, public-profile, shared}
lib/{supabase/{client,server,service}.ts, validation/*, types/*, ai/{services,providers}, storage/*, analytics/*}
hooks/useMediaRecorder.ts
```

### 7.2 Backend

Next.js Route Handlers only (`app/api/**/route.ts:1`) on Vercel Node runtime (not edge — required for `@google/generative-ai` + Supabase). `ARCHITECTURE.md:63` / `docs/architecture/01_SYSTEM_ARCHITECTURE.md:160`:

```
UI --fetch--> Route Handler --thin validator--> Application Service --> AI Service --> Provider --> Gemini API
                    |                                    |
                    └--------> Supabase (Postgres / Storage / Auth)
                    |  auth.getUser() derived userId (never body)  |
                    |  zod shared schema, rate-limit before LLM,   |
                    |  { data, error: ApiError } envelope           |
                    └──────────────────────────────────────────────┘
```

- `middleware.ts:1` refreshes Supabase session on every request via `@supabase/ssr` (exempts `/p/*`, `/`, static).
- `lib/supabase/service.ts:1` (service-role) is imported **only** in `app/api/public/*` + `lib/storage/signedUrl.ts:1` (`docs/architecture/03_API_ARCHITECTURE.md:233`).

### 7.3 Database

Supabase Postgres, RLS on every table (`user_id = auth.uid()`, except the single anon-beacon exception). Conceptual schema — `docs/architecture/02_DATABASE_SCHEMA.md:9`, 20+ tables, migrations `001_init_users_and_trigger`…`010_storage_buckets` (specified, not yet run):

```
auth.users (Supabase managed)
     │
     │ trigger handle_new_user
     ▼
   users ──────► career_profiles ──┬─► experiences (1:N, bullets jsonb)
     │                             ├─► education (1:N)
     │                             ├─► skills (1:N, grouped)
     │                             ├─► projects (1:N)
     │                             └─► certifications (1:N)
     │
     ├─► resumes ──► resume_versions (immutable, version_number monotonic per resume_id)
     │
     ├─► jobs ──► job_matches ─┐  (description_hash dedup at app layer)
     │     │                   ├─► videos ──► public_profiles (slug nanoid10, is_published) ──► public_profile_views
     │     │                   └─► scripts (one live per job)
     │     │
     │     ├─► interviews ──► interview_questions / interview_answers (webm) / interview_feedback (session) / interview_answer_feedback?
     │     └─► resume_analyses ──► resume_suggestions (pending/accepted/rejected, edited_text)
     │
     └─► settings (optional)
```

Invariants (`ARCHITECTURE.md:100`, `docs/architecture/02_DATABASE_SCHEMA.md:210`): one `career_profiles` per `user_id` (unique), `resume_versions` append-only, `public_profiles.slug` immutable, every FK carries redundant `user_id` for RLS, `public_profiles` public reads via whitelisting view (never `select *`).

### 7.4 Authentication

Supabase Auth — `auth.users` managed, `users` row via `handle_new_user` trigger (`docs/architecture/02_DATABASE_SCHEMA.md:41`). `httpOnly` `sb-*` cookie via `@supabase/ssr` + PKCE, `Google OAuth` via `/auth/callback` (no `localStorage.setItem('access_token')` — lint-forbidden in `docs/implementation/01_PROJECT_FOUNDATION.md:1` §9). Auth-gated routes (`/dashboard`, `/career-profile`, `/video-resume/*`, `/interview/*`, `/resume-ai/*`, `/analytics*`, `/settings`) redirect to `/login?next=...` when `!user`; public pages bypass (`docs/product/04_INFORMATION_ARCHITECTURE.md:180`).

### 7.5 Storage

Three **private** buckets (`docs/architecture/05_STORAGE_AND_VIDEO.md:9`, migration `010_storage_buckets`):

| Bucket | Objects | Cap | Duration | Retention | Signed URL TTL |
|---|---|---|---|---|---|
| `resumes` | `resumes/{userId}/{versionId}.pdf` | 10 MB | — | forever (immutable) | 60s |
| `videos` | `videos/{userId}/{jobId}/{videoId}.webm` | 100 MB | ≤180s | until profile delete | 300s |
| `interview-answers` | `interview-answers/{userId}/{interviewId}/{questionId}.webm` | 100 MB/answer | ≤120s advisory | 30d rolling unless keep | 300s owner-only |

MIME: `resumes` `application/pdf` only (magic `%PDF`, not encrypted); `videos`/`interview-answers` `video/webm;codecs=vp9,opus` preferred, `video/mp4` fallback (Safari). Keys are UUIDv4 — never client filename (`../` canonicalizes). Storage RLS: `auth.uid() = (storage.foldername(name))[1]`.

### 7.6 AI

`docs/architecture/04_AI_ARCHITECTURE.md:17` — 9 services behind typed interfaces, provider-agnostic, no AI key in browser:

```
UI (never calls provider, never imports lib/ai/providers/*)
 ↓ fetch
Application Service (e.g., VideoService.matchResumeToJob)
 ↓ calls
AI Service Interface (e.g., ResumeJobMatcher: async match(args) => JobMatch)
 ↓ delegates to
Provider Adapter (GeminiProvider implements every interface via @google/generative-ai, MockProvider for CI)
 ↓ fetch with GEMINI_API_KEY (server env only)
Gemini API (or future OpenAI via lib/ai/providers/openai.ts)
```

Services: `ResumeParser`, `JobParser`, `ResumeJobMatcher`, `ScriptGenerator` (+`shorten`/`natural`), `InterviewQuestionGenerator`, `InterviewFollowupEngine`, `InterviewFeedbackEngine`, `ResumeAnalyzer`/`ResumeImprovement` — with shared `zod` output schemas, `MockProvider` for offline CI (`docs/implementation/05_TESTING.md:1` §3.2), anti-fabrication preamble `lib/ai/safety/nonFabrication.ts:1` (`[NEEDS_USER: …]` insertion when evidence missing, validator before persist, `docs/architecture/04_AI_ARCHITECTURE.md:130`), and rate limits per LLM endpoint (`docs/architecture/03_API_ARCHITECTURE.md:204`).

### 7.7 Video

Browser `MediaRecorder` (MVP) via `hooks/useMediaRecorder.ts:1` — `MediaRecorderState` machine `idle→acquiring→recording→previewing`, `bitsPerSecond: 2.5M`, auto-stop at 180s/120s, teleprompter scroll, `URL.createObjectURL` preview, `PUT` as `FormData` to `lib/storage/video.ts:1` helper, inline `<video controls>` playback on public page via short-lived signed URL. Fallback: `<input type="file" accept="video/*">` when unsupported or permission denied (typed fallback textarea for Interview Live). No transcoding/thumbnail in MVP (`docs/architecture/05_STORAGE_AND_VIDEO.md:164` deferred behind `videoProcessing` flag).

### 7.8 Analytics

Private analytics only: `GET /p/[slug]` mounts fire-and-forget `ViewBeacon` → `POST /api/public/:slug/view` (service-role insert into `public_profile_views`, not auth-scoped) → owner-only `GET /analytics?profileId=` aggregates by day/device/referrer/country (`docs/architecture/06_ANALYTICS_ARCHITECTURE.md:19`). No cookie, no third-party tracker, `ip_hash = sha256(ip + dailySalt + profileId)` (daily-rotated salt, 1h dedup window), `user_agent` truncated 512, referrer bucketed by family, 365-day retention, cascade on profile/user delete. Lazy aggregate under 10k rows; materialized `public_profile_view_daily` optional at ≥50k.

### 7.9 Deployment

`ARCHITECTURE.md:230` / `docs/architecture/01_SYSTEM_ARCHITECTURE.md:298`:

```
Developer push main → GitHub → Vercel (Next.js build, Node region iad1) → Edge
      Vercel env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (public)
                  SUPABASE_SERVICE_ROLE_KEY (secret — beacon + signed URLs only)
                  GEMINI_API_KEY (secret — provider), GEMINI_MODEL=gemini-1.5-pro, AI_PROVIDER=gemini
                  NEXT_PUBLIC_APP_URL
      Supabase: Postgres + Storage (same region as Vercel)
```

Domains: app `app.careerflow.ai` (or `careerflow-ai.vercel.app` until custom), public profiles same-domain `/p/[slug]` (no cross-domain split). No custom CDN — signed URLs via Supabase. No Python service in MVP (`docs/decisions/ADR-001:35`).

### 7.10 Shared Product Model (recall from §1)

```
Career Profile
      |
      +---- Video Resume (jobs → job_matches → scripts → videos → public_profiles)
      |         \
      |          +--► public_profiles slug → /p/[slug] (public, minimal)
      |
      +---- Interview Coach (jobs ↻ reuse → interviews → questions/answers → feedback)
      |
      +---- Resume AI (resume_versions + optional job → resume_analyses → resume_suggestions → new resume_version)
```

- **Shared services (invariants, `ARCHITECTURE.md:155`):** `CareerProfileService` (reads/writes profile + children), `JobService` (single creation + dedup + listing — used by all three modules), `StorageService` (private buckets + signed URLs), `AnalyticsService` (beacon + aggregates). Each module also owns local tables (`scripts`/`videos` vs `interviews` vs `resume_analyses`) but never reads another service's table except through the owning service's public method (`no-restricted-imports` lint in Phase 7).

---

## 8. ARCHITECTURE INVARIANTS

> Treat these as constraints. A PR that violates an invariant fails review even if it passes tests. Changing an invariant requires a superseding ADR (see §15).

1. **One authenticated user model.** `auth.users` + `users` (`users.id = auth.users.id` via `handle_new_user` trigger) — `docs/architecture/02_DATABASE_SCHEMA.md:41`, `GEMINI.md:21`. No `video_resume_users` / `interview_users`.
2. **One Career Profile per user.** `career_profiles.user_id` unique, children `career_profile_id`-scoped (`02_DATABASE_SCHEMA.md:54`). `GEMINI.md:17`, `docs/decisions/ADR-002:25`.
3. **One shared resume system.** `resumes` (logical) → immutable `resume_versions` (`version_number` monotonic, append-only `INSERT`) — `docs/architecture/02_DATABASE_SCHEMA.md:101`, `GEMINI.md:26`.
4. **One shared job system.** Single `jobs` table with `description_hash` app-layer dedup, `source` enum `video_resume|interview|resume_ai|manual` — `docs/architecture/02_DATABASE_SCHEMA.md:109`, `docs/decisions/ADR-002:27`, `ARCHITECTURE.md:182`.
5. **Modules share core data; no parallel stores.** Video Resume, Interview Coach, and Resume AI all read `career_profiles` + `jobs` + `resume_versions` via `JobService`/`CareerProfileService` (`GEMINI.md:7`, `docs/architecture/01_SYSTEM_ARCHITECTURE.md:242`).
6. **AI provider calls go through the AI service/provider abstraction.** `UI → Application Service → AI Service Interface → Provider Adapter → Gemini API` (`GEMINI.md:41`, `docs/decisions/ADR-003:18`, `docs/architecture/04_AI_ARCHITECTURE.md:17`). No `new GoogleGenerativeAI(...)` inside `route.ts` or `components/`.
7. **AI API keys remain server-side.** `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` never have `NEXT_PUBLIC_` prefix; `lib/ai/providers/*` asserts `typeof window === 'undefined'`; build env audit fails otherwise (`docs/architecture/07_SECURITY.md:30`).
8. **Public Profile data is separated from private user data.** Whitelist on `GET /p/[slug]` — exposed: name, title, location, summary, experiences, education, skills, video/resume signed URLs; never exposed: `jobs.description`, `job_matches`, `scripts`, `interviews`, `resume_analyses`, private analytics (`docs/architecture/07_SECURITY.md:98`, `docs/modules/02_PUBLIC_PROFILE.md:1` §4 table).
9. **Public analytics are private to the owner.** `public_profile_views` `SELECT` only when `public_profile_id in (select id from public_profiles where user_id = auth.uid())`; no anon read, no raw IP returned (`docs/architecture/07_SECURITY.md:82`, `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:155`).
10. **Resume changes create controlled versions.** New `resume_versions` row `versionNumber = max+1`, `hash` dedup, 409 no-net-change on apply; never `UPDATE` (`docs/architecture/02_DATABASE_SCHEMA.md:105`, `docs/modules/05_RESUME_AI.md:1`).
11. **AI cannot silently overwrite canonical user data.** Parser DTO is staged for the **Review extracted data** sheet; only user's `PATCH /api/profile` commits to `career_profiles` (`docs/product/02_USER_FLOWS.md:42`, `docs/PHASE_0_REVIEW.md:1` I-01). Resume AI is `pending → accepted → Apply` only.
12. **User approval is required for AI-generated resume changes.** Every `resume_suggestions` row needs `accept`/`reject`/`edit` before `POST .../apply` creates a version (`docs/product/03_FEATURES.md:224` F-40, `docs/modules/05_RESUME_AI.md:1` §4).
13. **AI must not fabricate user experience.** Shared preamble (`System rules: … ONLY facts present … DO NOT invent … else [NEEDS_USER: …]`) + `lib/ai/safety/nonFabrication.ts:1` validator + yellow-dashed UI prompt card (`GEMINI.md:86`, `docs/architecture/04_AI_ARCHITECTURE.md:130`).
14. **Database changes use migrations.** `supabase/migrations/001…010` in order, no `CREATE TABLE ... WITHOUT enable row level security` (`docs/architecture/02_DATABASE_SCHEMA.md:220`, `GEMINI.md:92`).
15. **Existing modules must not be broken by future modules.** Locked after gate (Phase 3c) unless bug/ADR; shared-code edits require `grep import.*<service>` + dependent `page.tsx` inspection, and re-run `npm run build && npm test && e2e` (`GEMINI.md:48`, `GEMINI.md:11`, `GEMINI.md:103`).
16. **RLS doubles handler checks.** Every handler derives `userId` from `auth.getUser()` (never body), re-checks `row.user_id === auth.uid()`, returns typed 403 on IDOR; RLS is the final line (`docs/architecture/07_SECURITY.md:32`, `docs/architecture/03_API_ARCHITECTURE.md:233`).
17. **File uploads are defense-in-depth validated.** Client `accept` + handler MIME/magic/size/duration + UUID key + private bucket `fileSizeLimit` (`docs/architecture/07_SECURITY.md:120`, `docs/architecture/05_STORAGE_AND_VIDEO.md:17`).
18. **Public profile is minimal by default.** No analytics, JD, match dashboard, skill matrix beyond one chip cloud, interview state, or chatbot without superseding `docs/decisions/ADR-004:67` + wireframe (`GEMINI.md:74`).

Additional invariants live in each `GEMINI.md:1` §1–25 rule and `docs/architecture/07_SECURITY.md:218` PR checklist.

---

## 9. DESIGN CONTINUITY

### 9.1 Source of Truth

- **Design location (immutable, do not move or rename):** `dising stitch/` — `Get-ChildItem` 2026-08-30 shows 15 inspected entries: `careerflow_ai/DESIGN.md:1` (tokens) + 14 screen folders each with `code.html` (Tailwind) + `screen.png` (see `PRODUCT_SPEC.md:81` inventory). Design docs must not be moved into `docs/` (`GEMINI.md:137`).
- **Executable design authority:** `DESIGN_SYSTEM.md:1` — audited translation of the Stitch tokens into Tailwind config + shadcn contracts. This file is the implementation reference for `tailwind.config.mjs:1` and `components/ui/*:1`. `dising stitch/careerflow_ai/DESIGN.md:1` is the single source of every color name (`surface…secondary…error…surface-variant`), typography token (Inter, tight `-0.02em` on display/headline), shape (`rounded` 0.25→9999px), spacing (`container-max 1280px`, `gutter 24px`), grid (desktop 12-col), and elevation (`level2` shadow `0 4px 20px rgba(15,23,42,.05)`).

### 9.2 Design System (summary from `DESIGN_SYSTEM.md:1` §2–3)

- **Brand:** "The Intelligent Partner" — Minimalism + Modern Corporate, slate/snow canvas (`background #f8f9ff` / `surface-container-lowest #ffffff`), deep navy `#0F172A` (~`primary-container`), **AI Indigo** `secondary #4648d4` (≈ narrative `#6366F1`) reserved strictly for AI semantics, error `##ba1a1a`.
- **Typography:** `Inter` exclusively, tight letter-spacing on `display 48px/700/-0.02em`, `headline-lg 32px/600/-0.01em` etc., plus Material Symbols Outlined (`FILL 0…1`).
- **Components prescribed as shared primitives:** `components/nav/SideNavBar.tsx:1` (fixed `w-64`, active `bg-secondary-container`),
  `TopNavBar.tsx:1` (`h-16`, wordmark + bell+avatar), `RecruiterNav.tsx:1` (wordmark + Save/Share only),
  `components/ui/{button,card,badge,input,textarea,label,dialog,sheet,skeleton,separator,tabs}.tsx:1`,
  `components/video-resume/MatchScoreRing.tsx:1` (SVG `r=45`, `dasharray 282.7`), `components/public-profile/{HeroVideo,ResumeCard}.tsx:1`, `components/shared/{ErrorAlert,EmptyState}.tsx:1`.
- **Import rule:** Reuse the prescribed import before inventing a second `VideoCard` when `HeroVideo` + `Card` covers it (`DESIGN_SYSTEM.md:1` §3). Second-generation copy-paste of `bg-surface-container-lowest rounded-xl p-md` inline instead of importing `Card` is drift.

### 9.3 Screens (what exists, what doesn't)

| Screen | Stitch folder | Status | Design ref |
|---|---|---|---|
| Landing | `careerflow_ai_landing_page/` | exists (code.html + screen.png) | `docs/product/04_INFORMATION_ARCHITECTURE.md:26` marketing shell |
| Signup / Login | `sign_up_careerflow_ai/` | exists (variant for both) | `docs/product/02_USER_FLOWS.md:18` Flow 0 |
| Dashboard | `user_dashboard_careerflow_ai/` | exists | `docs/product/02_USER_FLOWS.md:203` Flow 6 |
| Career Profile | `career_profile_careerflow_ai/` | exists | Flow 1a/1b |
| Video Resume — Match Job | `video_resume_match_job_careerflow_ai/` | exists (bento + stepper 1 active) | `docs/modules/01_VIDEO_RESUME.md:1` Step 1 |
| Video Resume — Match Results | `video_resume_match_results_careerflow_ai/` | exists (ring + chips) | Step 1 → Results |
| Video Resume — Recorder | `video_resume_recorder_careerflow_ai/` | exists (timeline + dark canvas) | Step 2 |
| Public Profile (4 variants) | `public_profile_careerflow_ai/`, `public_recruiter_profile_careerflow_ai/`, `simplified_public_profile_careerflow_ai/`, `simplified_resume_public_profile_careerflow_ai/` | **all 4 exist — reconciled to one** | `docs/decisions/ADR-004:18` (see 9.4) |
| Interview — Setup | `interview_coach_setup_careerflow_ai/` | exists | `docs/modules/04_INTERVIEW_COACH.md:1` Setup |
| Interview — Live | `interview_coach_live_session_careerflow_ai/` | exists | Live immersive shell |
| Interview — Results | `interview_coach_results_careerflow_ai/` | exists | Results bento |
| Resume AI | — | **no Stitch mock** | By-analogy two-pane editor (`DESIGN_SYSTEM.md:1` §9, O-003) |
| My Applications | — | **no dedicated mock** | Extended Dashboard table proposal (`O-001`) |
| Interview Progress | — | **no mock** | Trend chart proposal (`O-002`) |

### 9.4 Chosen Public Recruiter Profile — Intentionally Minimal

**Decision:** `docs/decisions/ADR-004-MINIMAL-PUBLIC-PROFILE.md:18` selects **Minimal Centered** variant only.

**References:** `dising stitch/simplified_resume_public_profile_careerflow_ai/{code.html,screen.png}` and layout-equivalent `simplified_public_profile_careerflow_ai/code.html`. The other two variants (`public_profile_careerflow_ai`, `public_recruiter_profile_careerflow_ai`) are **Rejected A/B** in the ADR with rationale — their richer bento patterns (left 8col video+AI insights + right 4col competencies/tools/projects) must not be imported into `app/p/[slug]/page.tsx:1`.

**Structure (spec, `docs/modules/02_PUBLIC_PROFILE.md:1` §2):**

```
Top bar: CareerFlow AI (left)   [Save Profile] [Share] (right)   h-16, border-b, bg-surface
Centered header: display name (display) + headline-sm subtitle (secondary) + centered action row (Play Video primary, Download Resume, LinkedIn optional)
Video hero: aspect-video, rounded-xl, prominent centered play CTA (w-24 h-24 bg-secondary + label "Play Introduction Video")
Single white resume card (p-8/md:p-12): Professional Experience → Education → Skills & Tools sections stacked vertically
max-w-4xl centered (not 12-col bento) — no sidebar
```

**Core content (only):** Candidate identity, professional title, video, resume access, Download CV, Share/copy public link. **No** analytics, JD, match dashboard, skill matrix beyond one chip cloud, interview state, or chatbot — adding any without product approval + superseding `ADR-004` fails review (`GEMINI.md:74`, `docs/architecture/07_SECURITY.md:98` boundary table).

### 9.5 Navigation & Responsive

- **Authenticated nav:** `components/nav/SideNavBar.tsx:1` fixed `w-64`, header unified as avatar(40)+name `label-md semibold` + `Active Career Profile` `label-sm` (`docs/product/04_INFORMATION_ARCHITECTURE.md:113` consistency fix). TopNav `h-16` wordmark + bell+avatar. Mobile: sidebar collapses to hamburger → `Sheet` + bottom-nav for focused workspaces (`DESIGN_SYSTEM.md:1` §6).
- **Public nav:** `components/nav/RecruiterNav.tsx:1` isolated shell (`§3.3`) — never reuse `SideNavBar`.
- **Responsive:** Desktop ≥1200 12-col / tablet 768–1199 8-col / mobile <767 4-col, `max-w-container-max 1280px` + `gutter 24px` tokens (`DESIGN_SYSTEM.md:1` §2.4–2.6).

---

## 10. DOCUMENTATION MAP

> Read the relevant doc before modifying a module (`GEMINI.md:55`). The `dising stitch/` folder is immutable assets, not prose.

```
E:\creare_ai
├── GEMINI.md:1                              ← Permanent agent rules (25, read first — survives OpenCode/Claude/Cursor)
├── ARCHITECTURE.md:1                        ← One-document system overview (diagrams, boundaries, phases)
├── PRODUCT_SPEC.md:1                        ← Condensed stakeholder spec (journeys J-1…J-4, modules table, success metrics)
├── DESIGN_SYSTEM.md:1                       ← Token + component audit (Tailwind + shadcn contract, §5 score math)
│
├── docs/
│   ├── PROJECT_CONTINUITY.md:1              ← This file (handoff)
│   ├── PHASE_0_REVIEW.md:1                  ← 2026-08-30 consistency audit (18/18 PASS, 0 blocker, I-01, N-01…N-03)
│   │
│   ├── product/                             ← Controls PRODUCT scope — change here flows to PRODUCT_SPEC
│   │   ├── 01_PRODUCT_OVERVIEW.md:1         ← Vision, Career Profile truth table, module summaries, metrics
│   │   ├── 02_USER_FLOWS.md:1               ← End-to-end flows 0–7 (happy + alternate + error + analytics events)
│   │   ├── 03_FEATURES.md:1                ← F-00…F-60 feature inventory + acceptance criteria (PR checklist)
│   │   └── 04_INFORMATION_ARCHITECTURE.md:1 ← Sitemap, route map, nav/stepper compositions, IA constraints
│   │
│   ├── modules/                             ← Controls MODULE behavior — extend stub is mandatory if page exists
│   │   ├── 01_VIDEO_RESUME.md:1             ← 3-step workflow (Match, Script+Video, Publish) + AC
│   │   ├── 02_PUBLIC_PROFILE.md:1           ← Minimal page spec + rejected variants + private/public table
│   │   ├── 03_PUBLIC_ANALYTICS.md:1         ← Beacon pipeline + owner-only dashboard spec
│   │   ├── 04_INTERVIEW_COACH.md:1          ← Setup/Live/Results state machine + bento spec
│   │   └── 05_RESUME_AI.md:1                ← Analyze→Editor→Apply→new version, non-fabrication emphasis
│   │
│   ├── architecture/                        ← Controls SYSTEM contract — migrations follow this verbatim
│   │   ├── 01_SYSTEM_ARCHITECTURE.md:1     ← Block diagram, frontend/backend, shared services, deployment, failure modes
│   │   ├── 02_DATABASE_SCHEMA.md:1         ← Conceptual tables/indexes/RLS + migrations 001…010
│   │   ├── 03_API_ARCHITECTURE.md:1        ← Route catalogue + envelope + rate limits + caching + security invariants
│   │   ├── 04_AI_ARCHITECTURE.md:1         ← 9 services + provider adapters + anti-fabrication + future Python option
│   │   ├── 05_STORAGE_AND_VIDEO.md:1       ← Buckets + MediaRecorder hook + signed URLs (60s/300s) + fallback
│   │   ├── 06_ANALYTICS_ARCHITECTURE.md:1  ← Beacon + aggregation + privacy + deferred product_events
│   │   └── 07_SECURITY.md:1                ← Threat model + auth/RLS/file/prompt/browser/headers + PR Review Checklist
│   │
│   ├── implementation/                      ← Controls HOW to build — task→file→verify tables per sub-phase
│   │   ├── 01_PROJECT_FOUNDATION.md:1      ← Phase 1 commands + Tailwind + Supabase clients + layouts + lint
│   │   ├── 02_VIDEO_RESUME.md:1            ← Phase 3a/3b/3c gates
│   │   ├── 03_INTERVIEW.md:1               ← Phase 5a/5b/5c
│   │   ├── 04_RESUME_AI.md:1               ← Phase 6a/6b/6c
│   │   ├── 05_TESTING.md:1                 ← Unit/AI corpus/RLS/Playwright/axe/load + coverage gates
│   │   └── 06_DEPLOYMENT.md:1              ← Phases 7–10 + Known Decisions (D-001…D-006) / Assumptions (A-001…A-005) / Open Questions (O-001…O-008)
│   │
│   └── decisions/                           ← Controls FROZEN decisions — supersession protocol in §15
│       ├── ADR-001-TECHNOLOGY-STACK.md:1            ← Next.js+TS+Tailwind+Supabase+Vercel, no Python in MVP
│       ├── ADR-002-SHARED-CAREER-PROFILE.md:1       ← One user/profile/resume/job system
│       ├── ADR-003-AI-SERVICE-LAYER.md:1            ← AI provider abstraction + MockProvider
│       └── ADR-004-MINIMAL-PUBLIC-PROFILE.md:1      ← Minimal centered recruiter page
│
└── dising stitch/  (immutable — 15 inspected entries)
    ├── careerflow_ai/DESIGN.md:1            ← Color/typography/shape/spacing tokens (single source)
    └── <14 screen folders>/*/code.html + screen.png  (see §9.3 table)
```

**Before modifying a module, read:** `GEMINI.md:1` §12 mapping (Auth/Profile → `01_PRODUCT_OVERVIEW` + `02_USER_FLOWS:1` Flow 0/1; Video Resume → `01_VIDEO_RESUME.md:1` + `05_STORAGE_AND_VIDEO.md:1`; Interview → `04_INTERVIEW_COACH.md:1` + `04_AI_ARCHITECTURE.md:1` Interview* services; Resume AI → `05_RESUME_AI.md:1`; Database → `02_DATABASE_SCHEMA.md:1` + `07_SECURITY.md:1`) plus the phase's `docs/implementation/0N_*.md:1` Task table and `ADR-00N` if затрагивает.

---

## 11. IMPLEMENTATION ROADMAP

> Phases from `docs/implementation/06_DEPLOYMENT.md:1` + `ARCHITECTURE.md:248`. Each phase is independently shippable behind a feature flag (`VIDEO_RESUME_MATCH_MOCK`, `VIDEO_RESUME`, `INTERVIEW`, `RESUME_AI`) — `GEMINI.md:133`. Do **not** bundle the entire SaaS into one PR; do not implement a future phase automatically.

### Phase 1 — Foundation (`docs/implementation/01_PROJECT_FOUNDATION.md:1`)

- **Purpose:** Bootable Next.js app with auth-gated shell (stub data acceptable).
- **Dependencies:** None (docs-only today).
- **Expected result:** `npm install && npm run dev && npm run build` + authenticated routes render shell; `middleware.ts:1` covers `/dashboard|/career-profile|/video-resume|/interview|/resume-ai|/analytics|/settings`; Supabase clients split (`client`/`server`/`service`); Tailwind tokens from `DESIGN.md:1`; shadcn primitives; `zod` shared validation; lint `no-restricted-imports` for `service` client; env audit (`NEXT_PUBLIC` prefix check).
- **Gate:** `npm run build` + auth smoke (unauth redirect to `/login?next=...`); no Python, no AI keys in bundle.

### Phase 2 — Career Profile (`docs/implementation/06_DEPLOYMENT.md:1` future spec + `docs/product/02_USER_FLOWS.md:42` + `docs/architecture/02_DATABASE_SCHEMA.md:54`)

- **Purpose:** One upload → `ResumeParser` → Review sheet → `PATCH /api/profile` → editable profile.
- **Dependencies:** Phase 1.
- **Expected result:** Upload text PDF (10 MB) hydrates name/title/summary/experiences/education/skills + profile completion % (e.g., 82%) → dashboard wiring.
- **Relevant documentation:** `docs/product/01_PRODUCT_OVERVIEW.md:42`, `docs/architecture/04_AI_ARCHITECTURE.md:53` ResumeParser, `docs/architecture/05_STORAGE_AND_VIDEO.md:24`.

### Phase 3 — Video Resume (`docs/implementation/02_VIDEO_RESUME.md:1`)

- **Purpose:** Turn `resume_version` + `jobs` → match → script → video → share link (first module to ship).
- **Dependencies:** Phase 2.
- **Expected result:** `3a` Match (picker + Job JD → alignment score + ring + chips + talking points), `3b` Script+Video (timeline + `useMediaRecorder`), `3c` Publish (nanoid slug, `/p/[slug]` anon 200, non-fabrication corpus pass). Split-shippable `3a→3b→3c`.
- **Gate:** End-to-end `upload→match→script→15s record→save→publish→anon GET /p/[slug]` in second window.

### Phase 4 — Public Profile (included in 3c; governance via `docs/decisions/ADR-004:18`)

- **Purpose:** Minimal recruiter page as spec (`docs/modules/02_PUBLIC_PROFILE.md:1`).
- **Expected result:** Centered hero + single resume card, axe + Lighthouse ≥95 a11y/ ≥90 perf, signed URLs (see §7.5).

### Phase 5 — Public Analytics (`docs/modules/03_PUBLIC_ANALYTICS.md:1` + `docs/implementation/06_DEPLOYMENT.md:1` Phase 4)

- **Purpose:** Owner-only analytics for published slugs (ingest already in 3c, dashboard now).
- **Dependencies:** Phase 3c.
- **Expected result:** `GET /analytics?profileId=` series + device/referrer/country breakdowns, dedup 1h, 500-view p95 <500ms.

### Phase 6 — Interview Coach (`docs/implementation/03_INTERVIEW.md:1` Phases 5a/5b/5c)

- **Purpose:** Dynamic `Setup → Live (Q→video answer→Follow-up LLM→next) → Results` (bento: 78/100 + 5 bars + AI recommendation).
- **Dependencies:** Career Profile + Jobs (reuses `JobService` picker, no JD re-paste).
- **Expected result:** `5a` Setup (Focus/Difficulty/Length radios), `5b` Live (progress `3 of 10`, REC badge, abandon→resume, typed fallback), `5c` Results (feedback labels, `Retry` + `Practice Weak Areas` filtered).

### Phase 7 — Resume AI (`docs/implementation/04_RESUME_AI.md:1` Phases 6a/6b/6c)

- **Purpose:** `Analyze` → per-bullet diff editor (Accept/Reject/Edit) → `Apply` → new `resume_versions` (immutable).
- **Dependencies:** `resume_versions` + optional `jobs`.
- **Expected result:** 8–16 `resume_suggestions` (ATS…evidence), no fabrication (`prompt` question not hallucinated `+30%`), 409 no-net-change.

### Phase 8 — Cross-module integration (`docs/implementation/06_DEPLOYMENT.md:1` Phase 7)

- **Purpose:** Job reuse sweep (no duplicate `jobs` rows via grep), deep-link `?jobId=` canonicalization, nav shell normalization, `My Applications` table + `Settings` danger zone.
- **Dependencies:** Phases 3, 6, 7 (Resume AI).
- **Expected result:** Create Job via Video Resume → start Interview for same Job without JD re-entry; chained `video→interview→resumeAi` e2e passes.

### Phase 9 — Security hardening (`docs/implementation/06_DEPLOYMENT.md:1` Phase 8)

- **Purpose:** RLS audit script, Storage policies, headers (`next.config.mjs:1` `headers()`), upload fuzz, IDOR sweep, signed URL expiry, rate-limit audit (`docs/architecture/07_SECURITY.md:218` checklist).
- **Expected result:** Single checkbox: Security Review Checklist ticks on review of this PR.

### Phase 10 — Testing and production (`docs/implementation/05_TESTING.md:1` + `06_DEPLOYMENT.md:1` Phases 9–10)

- **Purpose:** Coverage ≥85% for `lib/*`, axe critical 0, Lighthouse thresholds, final Vercel migrations `001…010` in order (`docs/architecture/02_DATABASE_SCHEMA.md:220`), buckets + limits, smoke `signup→upload→match→publish→anon view→analytics`.
- **Expected result:** `npm run build` on prod preview, rollback via Vercel instant rollback + Supabase PITR.

---

## 12. CURRENT NEXT STEP

> Derive from actual repo state (see §2). Do not advance automatically beyond the current phase gate.

**CURRENT NEXT STEP:**

**Phase 2 — Career Profile — COMPLETE 2026-08-30** ✓

**What was implemented (Phase 2):**
- Database migrations: `001_init_users_and_trigger.sql` through `010_storage_buckets.sql` under `supabase/migrations/` preserving full documented schema & RLS invariants.
- Storage & Validation: `lib/storage/pdfValidation.ts` (MIME, magic bytes `%PDF`, 10 MB limit, encryption detection), `lib/storage/signedUrl.ts` (60s resume / 300s video TTLs), `lib/storage/resume.ts` (private `resumes/{userId}/{versionId}.pdf`).
- AI Service Layer: `lib/ai/safety/nonFabrication.ts` (preamble, placeholder detection `[NEEDS_USER: ...]`), `lib/ai/services/resumeParser.ts` (Zod schemas & interface), `lib/ai/providers/gemini.ts` (Gemini 1.5 Pro adapter with JSON schema & retry), `lib/ai/providers/mock.ts` (deterministic MockProvider for CI/testing), `lib/ai/provider.ts` factory.
- Application Services & Boundary: `lib/services/careerProfileService.ts` (`getProfileByUserId`, `saveProfile`, `calculateCompletionScore`, `parseAndStageResume`, `listResumeVersions`).
- Critical Data Flow Boundary: AI parser output is strictly STAGED in `resume_versions.parsed_data` and never overwrites `career_profiles` until explicit user confirmation (`PATCH /api/profile`).
- API Routes: `GET/PATCH /api/profile`, `POST /api/profile/resume` (staging parse DTO), `GET /api/profile/resume-versions`.
- UI Integration: Live `app/(dashboard)/career-profile` client + server loading, `components/career-profile/ReviewExtractedDataSheet.tsx` ("AI extracted this information... review before saving"), `ResumeUploadModal.tsx`, `EditProfileModal.tsx`, and interactive `app/(dashboard)/onboarding`.
- Tests: `tests/phase2.test.ts` (PDF validation, encryption, placeholders, schema adherence, completion score, input validation).

**What remains incomplete:**
- Video Resume (3a Match -> 3b Script+Video -> 3c Publish) — Phase 3
- Public Profile minimal page hydration & signed URLs — Phase 3c / 4
- Public Analytics owner dashboard — Phase 5
- Interview Coach (Setup/Live/Results) — Phase 6
- Resume AI (Analyze/Editor/Apply) — Phase 7
- My Applications dedicated table & cross-module sweep — Phase 8

**Recommended next phase:**
- **Phase 3 — Video Resume** per `docs/implementation/02_VIDEO_RESUME.md:1` and `docs/modules/01_VIDEO_RESUME.md:1`.
  - Phase 3a: Target Job form + JobParser + ResumeJobMatcher + Match Score Ring + breakdown chips + talking points.
  - Phase 3b: ScriptGenerator (4 sections + shorten/natural) + useMediaRecorder hook.
  - Phase 3c: Publish nanoid slug to public_profiles + minimal `/p/[slug]`.

**Previous Phase 2 read list (for audit):** GEMINI.md, PROJECT_CONTINUITY, 02_DATABASE_SCHEMA, 03_API_ARCHITECTURE, 04_AI_ARCHITECTURE, 05_STORAGE_AND_VIDEO, 07_SECURITY, 02_USER_FLOWS, ADR-002, ADR-003, PHASE_0_REVIEW — all consumed.

---

## 13. SAFE CONTINUATION PROTOCOL

> Every agent session that writes or reviews code must follow these 14 steps. Skipping repo inspection is never excused by "already verified."

| Step | Action | How to verify |
|------|--------|---------------|
| 1 | **Read `GEMINI.md:1`.** | Open and note §1–25 (especially §11 shared-code dependency scan, §17 non-fabrication). |
| 2 | **Read `docs/PROJECT_CONTINUITY.md:1`.** | This file — confirms current phase, what's built, what's deferred, and invariants (§8). |
| 3 | **Inspect the current repository.** | `Read` directory `E:\creare_ai` + `Get-ChildItem -Recurse` — confirm `package.json`/`app/` existence vs NOT_STARTED in §2. |
| 4 | **Read the relevant module documentation.** | `docs/modules/0N_*.md:1` for the owned module + `docs/product/03_FEATURES.md:1` F-rows for its AC. |
| 5 | **Read relevant architecture documentation.** | `docs/architecture/02_DATABASE_SCHEMA.md:1` (tables), `03_API_ARCHITECTURE.md:1` (routes), `04_AI_ARCHITECTURE.md:1` (services), `05_STORAGE_AND_VIDEO.md:1`, `06_ANALYTICS_ARCHITECTURE.md:1`, `07_SECURITY.md:1` (checklist). |
| 6 | **Inspect existing implementations.** | `Read` every file listed in that module's `docs/implementation/0N_*.md:1` Task table *before* scaffolding. If the target page was stubbed in Phase 1, extend the stub — do not create a shadow directory (`GEMINI.md:70`). |
| 7 | **Identify dependencies.** | For shared code (`CareerProfileService`, `JobService`, `StorageService`, `lib/validation/*`, `components/nav/*`), run `grep -R 'import.*<service>' app components lib` and `Read` dependent `page.tsx:1` files. |
| 8 | **Define the smallest safe implementation.** | One phase's Task rows, one PR. Feature-flag (`VIDEO_RESUME`, `INTERVIEW`, `RESUME_AI`) if needed (`GEMINI.md:133`). |
| 9 | **Implement only the requested scope.** | No deferred feature from §5, no `DO NOT BUILD NOW` (§6) violation, no second resume system. |
| 10 | **Run tests and validation.** | `npm test` (85% gate `lib/*`, non-fabrication corpus 12 cases), `npm run lint` (no-restricted-imports), `npm run build`, `npx tsc --noEmit`. |
| 11 | **Check for regressions.** | Re-run active `e2e/*.spec.ts:1` (videoResume, public boundary, interview if shipped) + `axe` critical 0 (`docs/implementation/05_TESTING.md:1` §3.6–3.7). Confirm no IDOR via other `userId`. |
| 12 | **Update documentation if architecture or behavior changed.** | Per `GEMINI.md:121` table: new `lib/ai/services/*`→`04_AI_ARCHITECTURE.md:1`, new migration→`02_DATABASE_SCHEMA.md:1`, new route→`03_API_ARCHITECTURE.md:1`+`04_INFORMATION_ARCHITECTURE.md:1`, new public field→`07_SECURITY.md:1`§4. |
| 13 | **Update `docs/PROJECT_CONTINUITY.md:1`.** | Bump §2 Status rows for the shipped phase, move §12 to the next phase, append to Decision History if ADR superseded. |
| 14 | **Report exactly what changed.** | PR description cites Task IDs, files, and gates ticked. No "already verified" without evidence. |

**Do NOT skip repository inspection** — even if this file says NOT_STARTED, verify by `Read` that no out-of-band `package.json` appeared.

---

## 14. HANDOFF RULE

> A future agent must be able to continue without asking the previous agent what it did. Therefore the repository + docs must contain:

- **Current status** — `§2` table (verified 2026-08-30) + `§12` CURRENT NEXT STEP (Phase 1).
- **Completed work** — `§3` (30 blueprint docs + 4 root briefs + 15 inspected Stitch entries; no code). Built capabilities are prose contracts, not running services.
- **Incomplete work** — `§4` P0/P1/P2 list (all features PLANNED, Phase 1 NOT_STARTED). Deferred list is §5, not implicit.
- **Known bugs** — None in blueprint (code does not exist). `docs/PHASE_0_REVIEW.md:1` found 0 BLOCKER, 1 IMPORTANT wording (I-01 staged hydration), 3 NON-BLOCKING (N-01…N-03) — all tracked in §16 and `06_DEPLOYMENT.md:1` O-001…O-008.
- **Known limitations** — `§18` (PDF parsing, scanned PDFs, video, AI, analytics, browser, storage).
- **Deferred features** — `§5` table (Python sidecar, Whisper, HTML→PDF, etc.) + `§6` DO NOT BUILD NOW (12+ explicit prohibitions).
- **Architecture decisions** — `§15` + `docs/decisions/ADR-001…004:1` (frozen; supersession protocol).
- **Open questions** — `§16` (O-001…O-008, owners + blocked phases).
- **Current next step** — `§12` Phase 1 with ordered read list and gate.

The repository at `E:\creare_ai` plus this file is sufficient to resume from any machine without prior context.

---

## 15. DECISION HISTORY

### 15.1 Frozen Decisions (do not silently reverse)

| ADR | Title | Status | What is frozen | File |
|-----|-------|--------|----------------|------|
| ADR-001 | Technology Stack | Accepted 2026-08-30 | Next.js 14+ App Router + TS strict + Tailwind + shadcn/ui + zod + react-hook-form + Supabase (Postgres+Auth+Storage) + Vercel + npm + Node≥20; Gemini behind `lib/ai/providers/gemini.ts:1` via `getAIProvider():1`; MediaRecorder MVP; **no Python/FastAPI in MVP** | `docs/decisions/ADR-001-TECHNOLOGY-STACK.md:1` |
| ADR-002 | Shared Career Profile | Accepted 2026-08-30 | One `users`/`career_profiles` (+children)/`resumes→resume_versions`/`jobs` system; `CareerProfileService` + `JobService` (hash dedup) shared; no `video_*_users` / `*_profiles` / `*_resumes` clones (CI grep fails) | `docs/decisions/ADR-002-SHARED-CAREER-PROFILE.md:1` |
| ADR-003 | AI Service Layer | Accepted 2026-08-30 | 3 layers `Application Service → AI Service Interface (lib/ai/services/*:1) → Provider Adapter (lib/ai/providers/gemini.ts:1)` + `MockProvider` + `lib/ai/safety/nonFabrication.ts:1`; no `new GoogleGenerativeAI` in `route.ts:1`/`components/`; swap needs one new `providers/openai.ts:1` + switch branch | `docs/decisions/ADR-003-AI-SERVICE-LAYER.md:1` |
| ADR-004 | Minimal Public Profile | Accepted 2026-08-30 | Public recruiter page is **Minimal Centered** (`simplified_resume_public_profile_careerflow_ai`); 2 richer bento variants rejected with rationale; public field = chunk + whitelisting; no rich variant without superseding ADR + wireframe | `docs/decisions/ADR-004-MINIMAL-PUBLIC-PROFILE.md:1` |

All four are **frozen**. Any future agent that needs to change them must not edit the file silently.

### 15.2 Changeable Decisions (normal evolution, no ADR required)

- Color token tweaks within the audited palette (same `secondary=#4648d4`, no `custom-indigo`) — `DESIGN_SYSTEM.md:1` §8 checklist.
- Adding a `jsonb` extensions column to a shared table for experimental fields (post-ADR debate, `docs/decisions/ADR-002:52`).
- Tuning rate-limit thresholds (`docs/architecture/03_API_ARCHITECTURE.md:204`) and signed URL TTLs (60s/300s) before prod via `06_DEPLOYMENT.md:1` O-006.

### 15.3 How to Supersede an ADR

If a change is necessary (per `GEMINI.md:121`, `docs/decisions/ADR-001:59`, `docs/decisions/ADR-002:57`):

1. **Explain why** in the PR description with measured cause (latency/accuracy/load/security) and link the triggering issue.
2. **Create a new ADR** `docs/decisions/ADR-00N-*.md:1` (increment number, title, `Status: Accepted`, `Supersedes: ADR-00X`, date, deciders, context, decision, alternatives, consequences, compliance).
3. **Mark the old decision as superseded:** edit its header to `Status: Superseded by ADR-00N — <title>` + add `Superseding rationale: <link>` at top; do not delete it.
4. **Update architecture documentation** in the same PR: e.g., new `lib/ai/services/*:1` → `docs/architecture/04_AI_ARCHITECTURE.md:1`, new migration → `docs/architecture/02_DATABASE_SCHEMA.md:1`, new route → `docs/architecture/03_API_ARCHITECTURE.md:1` + `docs/product/04_INFORMATION_ARCHITECTURE.md:1`, new public field → `docs/architecture/07_SECURITY.md:1` §4 + `docs/modules/02_PUBLIC_PROFILE.md:1` §4.
5. **Update affected module documentation** and this file's §15 and §2 Status if the roadmap shifts.

---

## 16. OPEN QUESTIONS

> Imported from `docs/implementation/06_DEPLOYMENT.md:1` + `docs/PHASE_0_REVIEW.md:1` I-01. Do **not** silently resolve product decisions — the owner/designer must decide before the blocked phase's PR merges. The authoritative tracker is `06_DEPLOYMENT.md:1`; this section is a snapshot at continuity time.

| ID | Question | Why it matters | Blocked phase | Owner decision required | Tracking note |
|---|---|---|---|---|---|
| I-01 | Clarify that resume-parser hydration is **staged for Review**, not auto-committed to `career_profiles` | Prevents AI auto-overwrite of canonical data (violates invariant 11) | RESOLVED (Phase 2) | Staged output returned in DTO and confirmed via user's `PATCH /api/profile` | Implemented in `CareerProfileService.parseAndStageResume` + `ReviewExtractedDataSheet` |
| O-001 | **My Applications** dedicated table — no Stitch mock. Is the proposed table view (mirroring Dashboard Recent Applications slice) the correct density? | Blocked polish gate | Phase 7/8 cross-module | Designer + Product | `docs/product/04_INFORMATION_ARCHITECTURE.md:190` + `docs/implementation/06_DEPLOYMENT.md:1` |
| O-002 | **Interview Progress** trend visualization — no Stitch mock. Is `recharts` vs custom sparkline correct? | Blocked polish gate | Phase 5 polish | Designer | `docs/modules/04_INTERVIEW_COACH.md:1` §5.2, `docs/implementation/06_DEPLOYMENT.md:1` |
| O-003 | Resume AI re-render: pixel-perfect **HTML→PDF** (`puppeteer`) vs **text-only viewer** in MVP? | Adds `puppeteer` + template decision | Phase 6a (Resume AI) | Product | `docs/modules/05_RESUME_AI.md:1` §5, `docs/implementation/04_RESUME_AI.md:1` §6 |
| O-004 | Browser silence detection / VAD trimming for interview answers? | Marginal UX; extra client complexity | Phase 5 perf tuning (after Live) | AI Eng | `docs/implementation/06_DEPLOYMENT.md:1` |
| O-005 | Who maintains the TLD list for `referrerFamily(host)` bucketing? | Accuracy of Analytics by Source | Phase 4 accept | Infra | Same |
| O-006 | Confirm short-lived signed URL TTLs: resume 60s, video 300s — balances/stream failover vs link reuse — legal? | TTLs gate prod buckets | Before prod (Phase 10 `010_storage_buckets`) | Security | Same |
| O-007 | At what STT/processing latency do we justify introducing the Python sidecar vs staying on Gemini only? | Triggers `ADR-001` supersession | Phase 9 | Arch | `docs/architecture/04_AI_ARCHITECTURE.md:254` |
| O-008 | **Overall Readiness A-** — how to compute (profile completion + recent interview + resume score) until Phase 6? | Dashboard header is derived, not fabricated | Before Phase 1b seed (Phase 2 dashboard polish) | Product | `docs/product/02_USER_FLOWS.md:204`, `docs/product/03_FEATURES.md:54` |

---

## 17. KNOWN TECHNICAL DEBT

> Inspected repository + docs. No code debt exists yet (no app). Items below are **planned** debt — design gaps or deferred hardening already tracked. Do not create unnecessary items.

| Description | Impact | Severity | Suggested future phase | Evidence |
|---|---|---|---|---|
| **`POST /api/profile/resume` staged-hydration wording** — current line can be misread as auto-commit to `career_profiles` | If misimplemented, violates invariant 11; requires small rework before Career Profile ships | **Medium** — docs-only, pre-code | Before Phase 2 (I-01) | `docs/PHASE_0_REVIEW.md:1` I-01, `docs/architecture/03_API_ARCHITECTURE.md:92` |
| **Missing Stitch mocks for Resume AI two-pane editor** — diff highlight colors not frozen | Editor can ship but needs product sign-off on highlight palette before polish | **Low** — by-analogy spec is sufficient for MVP | Phase 6a, O-003 | `DESIGN_SYSTEM.md:1` §9, `docs/modules/05_RESUME_AI.md:1` §5 |
| **Missing Stitch mock for My Applications dedicated table** — density/filters not frozen | Table proposal exists (extended Dashboard Recent Applications + filters) but polish gate is designer-dependent | **Low** — functional ship unaffected | Phase 7, O-001 | `docs/product/04_INFORMATION_ARCHITECTURE.md:190` |
| **Missing Stitch mock for Interview Progress trend** — chart lib not chosen | Progress page deferred polish; line chart vs sparkline undecided | **Low** | Phase 5 polish, O-002 | `docs/modules/04_INTERVIEW_COACH.md:1` §5.2 |
| **Analytics materialization deferred** — lazy `GROUP BY` on `public_profile_views` is fine at <10k rows, but needs `public_profile_view_daily` at ≥50k | Query p95 could exceed 500ms under viral sharing if not materialized | **Low** — optional day-one | Phase 8 / when ≥50k views | `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:77` |
| **Overall Readiness formula not frozen** — header would be placeholder derived from completion % only | Minor — Dashboard header would be less expressive until Phase 2 polish | **Low** | Phase 2, O-008 | `docs/product/03_FEATURES.md:54` |

---

## 18. KNOWN LIMITATIONS

> Only limitations supported by actual implementation assumptions or documented decisions. No invented constraints.

| Limitation | Evidence & Mitigation |
|---|---|
| **PDF parsing: text-based PDFs only.** Scanned-image-only PDFs are flagged: "This PDF looks scanned — text extraction may be limited. Please export a text-based PDF for best results." but still accepted. Resume parser is LLM-based, not OCR-heavy. | `docs/product/01_PRODUCT_OVERVIEW.md:143`, `docs/architecture/05_STORAGE_AND_VIDEO.md:45` checklist (scanned flag) |
| **Scanned PDFs not OCR'd in MVP.** No Tesseract step; user is asked to re-export. | Same; `docs/architecture/04_AI_ARCHITECTURE.md:53` ResumeParser constraints |
| **Video: Max 180s (Video Resume) / 120s per answer (Interview), 100 MB cap, no transcoding/thumbnail/HLS.** `video/webm;codecs=vp9,opus` preferred, `video/mp4` Safari fallback; inline playback via signed URL. | `docs/architecture/05_STORAGE_AND_VIDEO.md:9`, `docs/architecture/07_SECURITY.md:152` |
| **Browser compatibility:** Requires `MediaRecorder` + `getUserMedia` available; `MediaRecorder.isTypeSupported` fallback to `video/mp4`. Typed fallback textarea for Interview Live when camera denied. | `docs/architecture/05_STORAGE_AND_VIDEO.md:154` §4 fallbacks |
| **AI accuracy:** Gemini 1.5-pro pinned (`GEMINI_MODEL=gemini-1.5-pro`); latency targets ≤8s match / ≤6s script / ≤4s next-question. After two retries, returns `503 AI_UNAVAILABLE` with safe UX — no hallucinated fallback. | `docs/architecture/04_AI_ARCHITECTURE.md:109`, `docs/architecture/03_API_ARCHITECTURE.md:204` rate limits + retry wrapper |
| **Analytics granularity:** No raw IP, no full `user-agent`, no IP city precision — only buckets (direct/LinkedIn/Indeed/Google/other; desktop/mobile/tablet; Top-5 countries). 1h dedup window per `ip_hash`. | `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:42`, `docs/architecture/07_SECURITY.md:110` |
| **Storage quotas per user:** Soft cap 500 MB combined (resumes+videos+answers); checked before accept in Phase 8; interview answers 30d rolling unless `keep = true`. | `docs/architecture/05_STORAGE_AND_VIDEO.md:13`, `docs/architecture/07_SECURITY.md:152`, `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:95` |
| **Resume re-render:** No `puppeteer` HTML→PDF in MVP — text-only viewer is acceptable (see O-003). | `docs/modules/05_RESUME_AI.md:1` §5, `docs/implementation/04_RESUME_AI.md:1` §6 |
| **No team / enterprise / ATS integrations in MVP.** Single user, free, no Greenhouse/Lever, no bulk management. | `PRODUCT_SPEC.md:73` Non-Goals, `docs/product/01_PRODUCT_OVERVIEW.md:126` |
| **No chat / real-time recruiter interaction on public page.** No chat route, model not exposed as chatbot. | `docs/architecture/07_SECURITY.md:165`, `docs/decisions/ADR-004:67` |

---

## 19. TESTING AND QUALITY GATES

> Spec: `docs/implementation/05_TESTING.md:1` (authoritative). Every phase is shippable only behind its gates; shared edits and Phases 7–8 must re-run the triad.

### How to run

| Check | Command (after Phase 1 scaffolds `package.json:1`) | When it runs |
|---|---|---|
| **Type checking** | `npx tsc --noEmit` (TS strict, `strictNullChecks`, `noImplicitAny`) | Every PR |
| **Lint** | `npm run lint` — includes `eslint` `no-restricted-imports` (forbids `createServiceClient` outside `app/api/public/*` + `lib/storage/signedUrl.ts:1` and `localStorage.setItem('access_token')`) | Every PR |
| **Build** | `npm run build` — Next.js App Router production build | Every PR (Vercel preview) |
| **Unit: validation** | `npm test` (vitest) on `lib/validation/*:1` — every `zod` schema rejects invalid + accepts boundary | CI |
| **Unit: AI output schema** | Fixtures `tests/ai/fixtures/<service>.json:1` (50+ per service) → `zod` output schema parse | CI (MockProvider offline) |
| **Non-fabrication corpus** | `tests/ai/nonFabrication.test.ts:1` — 12 synthetic resumes+profiles deliberately missing a metric → assert no hallucinated `+30%` / tech | CI; `npm run test:live` spot-check with real Gemini (human QA) |
| **Storage & rate limit unit** | `tests/storage/*:1`, `lib/rateLimit.ts:1` — MIME traversal, `413 FILE_TOO_LARGE`, 11th request 429 | CI |
| **RLS / IDOR probes** | `tests/api/idore2e.test.ts:1` — Alice vs Bob read/patch 403 (career_profiles, jobs, matches, interviews, analyses, analytics) | CI (local Supabase) or preview tenant |
| **E2E (Playwright)** | `npx playwright test` — `e2e/auth.spec.ts:1`, `e2e/videoResume.spec.ts:1` (3a+3b+3c chain with mock blob), `e2e/public.spec.ts:1` (beacon dedup + signed URL expiry + no private leakage), `e2e/interview.spec.ts:1` (abandon→resume, typed fallback), `e2e/resumeAi.spec.ts:1`, `e2e/accessibility.spec.ts:1` | Preview/CI (disposable test tenant, never prod) |
| **RLS** | Done via IDOR probes + `supabase/migrations/*.sql:1` never without `enable row level security` (CI `grep` fails) | Every PR |
| **AI evaluation** | Mock-provider shape tests + live spot-check on the corpus | Weekly `test:live` cron on `main` when `GEMINI_API_KEY:1` present |
| **Accessibility** | `axe-core` on landing, dashboard, career-profile, public page — **critical 0** (`docs/implementation/05_TESTING.md:1` §3.7) | Every PR (`accessibility` job) |
| **Visual regression** | `playwright screenshot` at 1440/1024/375 vs Stitch fixtures, threshold 3% | Pre-release |

### What must pass before a phase is considered complete

- **Every page:** Loading → Empty → Error → Happy triad implemented (`GEMINI.md:103` §20).
- **Every PR:** `npm run build` + `npm test` (85% gate `lib/*`) + `npm run lint` pass.
- **Shared edits (modules §2–5) and Phase 7–8:** Re-run the three e2e happy paths if their modules shipped (videoResume chain, public boundary, interview abandon+typed fallback) — no regressions.
- **Security gate:** `docs/architecture/07_SECURITY.md:218` checklist ticks in the PR description (userId from auth not body, RLS or documented anon, signed URL TTLs, file triple-check, prompt data-channel, public/private whitelist, `axe` critical 0).

---

## 20. ENVIRONMENT AND SECRETS

> **Names only. Never write real secret values into Markdown.** Every phase must keep `.env.local:1` gitignored and `.env.example:1` committed with empty placeholders (`docs/implementation/01_PROJECT_FOUNDATION.md:1` §5).

| Variable | Public? | Where it belongs | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Public** (`NEXT_PUBLIC_` prefix) | `.env.local:1`, `NEXT_PUBLIC_APP_URL:1` etc. (public) — safe to embed in client bundle | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Public** | Same — anon key is RLS-scoped, cannot read un-policed tables | Client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** — never `NEXT_PUBLIC_` | `.env.local:1` server-only; build env audit fails if prefixed `NEXT_PUBLIC_` | Beacon insert + signed URL minting (`lib/supabase/service.ts:1`) — only imported in `app/api/public/*:1` + `lib/storage/signedUrl.ts:1` |
| `GEMINI_API_KEY` | **Server-only** | Same — never `NEXT_PUBLIC_`; `lib/ai/providers/*:1` asserts `typeof window === 'undefined'` | Gemini provider; never forwarded in response nor logged |
| `GEMINI_MODEL` | Server-only (pinned `gemini-1.5-pro` in MVP) | `.env.local:1` | Model pin for audit + fixture revalidation |
| `AI_PROVIDER` | Server-only (`gemini`\|`openai`\|`mock`) | Same — switch branch in `lib/ai/provider.ts:1` | Provider selector |
| `IP_HASH_SALT` | **Server-only** | `.env.local:1` server-only | `ip_hash = sha256(ip + dailySalt + profileId)` secret pepper (`docs/architecture/06_ANALYTICS_ARCHITECTURE.md:42`) |
| `NEXT_PUBLIC_APP_URL` | **Public** | Public | Canonical `https://app.careerflow.ai` vs preview URL for `Copy Link` |
| `SENTRY_DSN` | Server-only | Optional, future — redacts `authorization` header | Error tracking (Phase 8) |

**Rules:** `lib/env.ts:1` build-time audit checks that `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` never have `NEXT_PUBLIC_` prefix; `lib/supabase/service.ts:1` throws if imported in browser; `lib/ai/providers/*:1` throws if `window !== undefined`. No handler logs `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, raw JD/PDF, or raw IP (`docs/architecture/07_SECURITY.md:200`).

---

## 21. CHANGE MANAGEMENT

### Small changes (feature, fix, polish)

```
Small change
   ↓  grep deps + read module doc + read arch doc
Implement (smallest safe slice — one phase's Task rows, one PR)
   ↓  npm test + lint + build + relevant e2e
Review (must tick docs/architecture/07_SECURITY.md:218 checklist)
   ↓
Document (if arch/behavior changed — see table below)
   ↓
Merge → update docs/PROJECT_CONTINUITY.md:1 §2/§12
```

### Architectural changes (schema, provider, public surface, stack)

```
Proposal (PR description: Why, measured cause, alternatives considered)
   ↓
ADR (docs/decisions/ADR-00N-*.md:1 — Status Accepted, Supersedes if needed)
   ↓
Implementation (migrations, routes, provider adapter, UI)
   ↓
Tests (validation + corpus + RLS/e2e + axe + build gates)
   ↓
Documentation update (same PR — per GEMINI.md:121 table):
  New lib/ai/services/*      → docs/architecture/04_AI_ARCHITECTURE.md:1 + ADR-003 if contract
  New supabase/migrations/*  → docs/architecture/02_DATABASE_SCHEMA.md:1 + RLS audit
  New lib/storage/* caps     → docs/architecture/05_STORAGE_AND_VIDEO.md:1 + rate table
  New route /api/* or page   → docs/architecture/03_API_ARCHITECTURE.md:1 + docs/product/04_INFORMATION_ARCHITECTURE.md:1
  New public field           → docs/architecture/07_SECURITY.md:1 §4 + docs/modules/02_PUBLIC_PROFILE.md:1
  Re-stacking / library swap → docs/decisions/ADR-001:1 supersession
   ↓
Merge → update docs/PROJECT_CONTINUITY.md:1 (this file) — bump §2, move §12, append §15
```

**Avoid uncontrolled rewrites.** `GEMINI.md:48` locks completed modules (Phase 3c) unless bug/ADR; `GEMINI.md:115` §21 forbids rename-only PRs without bug/ADR; keep PRs small and feature-flagged (`GEMINI.md:133` §24).

---

## 22. FUTURE AI PROVIDER MIGRATION

> Coding agent ≠ Application AI provider. Changing one does not require changing the other (`GEMINI.md:3`).

```
                                                          SEPARATE
                                                         ─────────
OpenCode                                                    Gemini
Gemini CLI    ── Coding Agent: writes code, reads docs ──  OpenAI
Claude Code                                                 Azure OpenAI
Cursor                        (AGENT LAYER)                 (APP AI PROVIDER LAYER)
Human dev       ════════════════════════════════════        lib/ai/providers/*
                              ↕ docs/PROJECT_CONTINUITY is
                              the bridge — both read it
                              ↕
                         lib/ai/services/* (9 typed interfaces)
                         lib/ai/provider.ts:getAIProvider()
```

- **Future coding agent may change** (Gemini CLI → OpenCode → Claude Code → Cursor) without changing the application architecture — `GEMINI.md:1` is agent-portable by design (`GEMINI.md:3` "survives provider changes").
- **Future application AI provider may change** (Gemini → OpenAI → Azure) through the **provider adapter** — add `lib/ai/providers/openai.ts:1` implementing the 9 `lib/ai/services/*:1` interfaces + add the branch in `lib/ai/provider.ts:1` (`AI_PROVIDER=openai`) — **no** handler or UI rewrite (`docs/decisions/ADR-003:18`, `docs/architecture/04_AI_ARCHITECTURE.md:124`). Every LLM route remains mocked via `MockProvider` for offline CI.

---

## 23. FUTURE FEATURE ADDITION PROTOCOL

> Never create a parallel implementation when an existing abstraction can be extended safely (`GEMINI.md:21`).

When a product request asks for a new feature:

1. **Determine which module owns it.** Is it Video Resume, Interview Coach, Resume AI, or a new `docs/modules/0N_*.md:1` entry? If new, number it 06+ and keep `docs/decisions/ADR-00N:1` if architectural.
2. **Check whether existing shared data can support it.** Can `career_profiles`/`jobs`/`resume_versions`/`public_profiles` hold it via a column or `jsonb` extension, per `docs/decisions/ADR-002:52`? Prefer extension over a parallel table.
3. **Reuse existing services.** Can `CareerProfileService`/`JobService`/`StorageService`/`AnalyticsService` serve it, or does it need a new method on an existing service? Only create a new `lib/services/*:1` file when the domain is truly distinct.
4. **Reuse existing UI components.** Can `components/ui/*:1` + `components/nav/*:1` + `DESIGN_SYSTEM.md:1` §3 cover it? Only add a new component when the pattern is not in the audit table.
5. **Check security implications.** Does it touch auth, RLS, public/private boundary, file uploads, prompt injection, signed URLs, analytics PII? Tick `docs/architecture/07_SECURITY.md:218` checklist in the PR.
6. **Check database implications.** Does it need a new table/column? If so, create `supabase/migrations/0NN_*.sql:1` with `enable row level security` + owner policy, and update `docs/architecture/02_DATABASE_SCHEMA.md:1`.
7. **Check API implications.** Does it need a new route or DTO? If so, add to `docs/architecture/03_API_ARCHITECTURE.md:1` catalogue + validation in `lib/validation/*:1` + rate limit row.
8. **Check AI implications.** Does it add a 10th AI behavior? If so, add `lib/ai/services/<name>.ts:1` interface + `lib/ai/providers/{gemini,mock}.ts:1` methods + `lib/ai/provider.ts:1` entry + output `zod` schema + `lib/ai/safety/nonFabrication.ts:1` preamble if it emits candidate facts (`GEMINI.md:41` §9).
9. **Update documentation.** Same PR — per `GEMINI.md:121` table (see §21 above).
10. **Implement the smallest safe version.** One phase's Task rows, feature-flagged, with the triad (loading/empty/error) and the `DO NOT BUILD NOW` (§6) respected.
11. **Test it.** Validation + AI corpus + RLS/e2e + axe + build gates (`docs/implementation/05_TESTING.md:1`).
12. **Update continuity documentation.** Bump `§2` Status, move `§12` to the next phase, append `§15` if ADR, and link the code PR hash in `docs/implementation/06_DEPLOYMENT.md:1` per its "How to use this file" footer.

---

## 24. FINAL HANDOFF CHECKLIST

> Copy-paste into every implementation PR or handoff session and tick. A PR that cannot tick a gating item is not mergeable.

- [ ] Read `GEMINI.md:1` (all 25 rules — especially §11 shared-code dependency scan, §17 non-fabrication, §18 migrations)
- [ ] Read `docs/PROJECT_CONTINUITY.md:1` (this file — especially §2 Status, §5 deferred, §6 DO NOT BUILD NOW, §8 invariants, §15 ADRs, §16 open questions)
- [ ] Read `ARCHITECTURE.md:1` (system overview, boundaries, phases)
- [ ] Read `PRODUCT_SPEC.md:1` (journeys J-1…J-4, modules table, §5 Non-Goals)
- [ ] Read `DESIGN_SYSTEM.md:1` (tokens, components, score ring math, responsive)
- [ ] Inspect repository (`Read` `E:\creare_ai` + `Get-ChildItem -Recurse`) — verify `NOT_STARTED` vs `COMPLETE` on disk vs documentation
- [ ] Inspect current implementation (e.g., `Get-ChildItem -Recurse -File` confirms no `package.json` drift)
- [ ] Identify current phase — `§12` CURRENT NEXT STEP is **Phase 1 — Project Foundation** (`docs/implementation/01_PROJECT_FOUNDATION.md:1`)
- [ ] Read relevant module documentation (`docs/modules/0N_*.md:1` + `docs/product/03_FEATURES.md:1` F-rows for its AC)
- [ ] Check ADRs (`docs/decisions/ADR-001…004:1` — is the change superseding a frozen decision?)
- [ ] Check open questions (`§16` O-001…O-008 / `docs/PHASE_0_REVIEW.md:1` I-01/N-01…N-03)
- [ ] Check technical debt (`§17` table — I-01 staged-hydration wording, missing mocks)
- [ ] Implement **only** requested scope (no deferred feature from §5, no `§6` violation)
- [ ] Run tests — `npm test` (85% gate `lib/*`, 12-case non-fabrication corpus), `npm run lint` (no-restricted-imports), `npx tsc --noEmit`, `npm run build`
- [ ] Run lint — `npm run lint` passes (no `createServiceClient` outside allowed paths)
- [ ] Run type checking — `npx tsc --noEmit` passes (`strictNullChecks` etc.)
- [ ] Run build — `npm run build` passes; Vercel preview green if pushed
- [ ] Check regressions — re-run `e2e/videoResume|public|interview|resumeAi|accessibility.spec.ts:1` if their modules shipped; `axe` critical 0
- [ ] Update documentation — per `GEMINI.md:121` table (new service → `04_AI_ARCHITECTURE.md:1`, new migration → `02_DATABASE_SCHEMA.md:1`, new public field → `07_SECURITY.md:1` §4)
- [ ] Update `docs/PROJECT_CONTINUITY.md:1` — bump `§2` Status rows for the shipped phase, move `§12` to the next phase, link code PR hash
- [ ] Report changes — PR description cites Task IDs, files, and gates ticked (evidence-before-synthesis, not "already verified")

---

## 25. FINAL RULE

> **The most important rule in this entire document.**

**NEVER assume that a feature should be built simply because it appears in the long-term product vision.**

Distinguish between:

| Bucket | Meaning | Examples from this project | Build when? |
|---|---|---|---|
| **CURRENT** | Active phase's scope — must ship now | Phase 1 Foundation (`docs/implementation/01_PROJECT_FOUNDATION.md:1` — Next.js+Tailwind+shadcn+Supabase clients, nav shells) | **Now** — this is the only bucket an agent may implement without extra product request |
| **PLANNED** | Next phases' P0 — specced, ordered, not yet started | Career Profile → Video Resume (Match/Script/Video/Publish) → Interview Coach → Resume AI → My Applications (see `§4` P0 table) | Only when `§12` CURRENT NEXT STEP reaches it (do not pull forward) |
| **DEFERRED** | Intentionally **not** in MVP; tracked so it is not invented | Python/FastAPI sidecar, Whisper STT, thumbnails/transcoding, `puppeteer` render, advanced analytics, recruiter fingerprinting (§5) | Only if **product owner** explicitly requests **and**, where marked, a superseding ADR is accepted |
| **OPTIONAL** | Nice-to-have with no product request | Custom public themes, avatar generation, workspace gift sprinkle | Only if owner + design approve + wireframe exists |
| **BLOCKED** | Cannot ship until a question is answered | Resume AI re-render choice O-003, My Applications density O-001 (see `§16`) | Owner decides before the blocked phase's PR |

**Only implement CURRENT scope unless the product owner explicitly requests a future feature.** The long-term vision exists to give direction, not to authorize a mega-PR that implements the entire SaaS at once (`docs/implementation/06_DEPLOYMENT.md:1` "Build progressively" + `GEMINI.md:48` "Do not modify completed modules unnecessarily").

---

*After creating the document:*

1. *Validated against the actual repository — `Get-ChildItem` 2026-08-30 confirms 30 docs (4 root + 26 `docs/`) + 15 `dising stitch/` entries, no `package.json`/`app/`/`supabase/` on disk — `§2` Status uses `NOT_STARTED`/`PLANNED`/`COMPLETE`/`PARTIALLY_COMPLETE` per inspection, not guess.*
2. *Removed assumptions not supported — e.g., no claim that `package.json` exists, no claim that migrations are on disk, no invented deferred features beyond `§5` table.*
3. *Ensured no contradictions with `GEMINI.md:1` (25 rules preserved verbatim as invariants, especially §8 secrets, §9 service layer, §15 do-not-invent-requirements, §17 non-fabrication).*
4. *Ensured no contradictions with `ARCHITECTURE.md:1` (same ASCII diagrams, same phases 1→10, same stack Next.js+Supabase+Gemini+MediaRecorder+Vercel).*
5. *Ensured the current next step is accurate — `§12` CURRENT NEXT STEP is Phase 1 — Project Foundation, with ordered read list and gate, matching the actual `NOT_STARTED` state.*
6. *No application code was modified (this is the only file created by this task).*

**Final file:** `docs/PROJECT_CONTINUITY.md:1` (25 sections, permanent handoff).
