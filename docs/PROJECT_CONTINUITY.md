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

**Inspection method:** `Get-ChildItem` + `git log` + `npm run build` of `E:\creare_ai` (2026-08-30 — **updated 2026-08-30 Phase 3 complete**). Foundation + Career Profile + Video Resume (3A/3B/3C) code now exists: `package.json` (Next 14.2.35 + `@google/generative-ai`), `app/(dashboard)/video-resume/*`, `app/p/[slug]`, `app/api/video-resume/*`, `app/api/public*`, `lib/services/videoResumeService.ts`, `lib/services/jobService.ts`, `lib/ai/services/*`, `hooks/useMediaRecorder.ts`, `components/video-resume/*`, `supabase/migrations/011_phase3_fixes.sql`. Previous antigravity session completed Phase 2 and started 3A (JobService + AI stubs + JobForm); this session completed 3B/3C (match results, script+recording, publish, minimal public). Build+lint+tsc PASS 2026-08-30. No Interview/ResumeAI/PublicAnalytics dashboard.

| Area | Status | Notes |
|------|--------|-------|
| Product Blueprint | COMPLETE | `docs/product/01_PRODUCT_OVERVIEW.md:1`, `02_USER_FLOWS.md:1`, `03_FEATURES.md:1` (F-00…F-60), `04_INFORMATION_ARCHITECTURE.md:1` — flows 0–7 + acceptance criteria |
| Design System & Audit | PARTIALLY_COMPLETE | `DESIGN_SYSTEM.md:1` tokens/components + `PRODUCT_SPEC.md:81` 14 screen folders + `careerflow_ai/DESIGN.md:1` tokens — but Resume AI, My Applications dedicated table, Interview Progress chart, and detailed Analytics dashboard have no Stitch mock (tracked as `docs/implementation/06_DEPLOYMENT.md:1` O-001…O-003) |
| Design Assets | COMPLETE | `dising stitch/` — 15 inspected entries (14 screen `code.html`+`screen.png` + `careerflow_ai/DESIGN.md:1`) — see §9 |
| Project Foundation | COMPLETE | Next 14.2.35 App Router + TS strict + Tailwind 3 (DESIGN.md tokens verbatim) + shadcn primitives (Button/Card/Badge/Input/Textarea/Label/Dialog/Sheet/Skeleton/Separator/Tabs) + Supabase clients (`client.ts`/`server.ts`/`service.ts` with server-only guard) + `middleware.ts` auth gate + `(dashboard)` shell (SideNav w-64 + TopNav h-16 + MobileDrawer) + marketing/auth/public shells + `lib/validation/*` (zod) + `lib/env.ts` audit + lint `no-restricted-imports`. Build+lint+typecheck PASS 2026-08-30. |
| Authentication | COMPLETE | Supabase Auth PKCE + Google OAuth via `lib/supabase/*` + `middleware.ts` + `/auth/callback` + `/auth/signout` + `(auth)/login|signup` + `(dashboard)/layout.tsx` server guard. `001_init_users_and_trigger.sql` + RLS. |
| Career Profile | COMPLETE | Migrations 001–010 + `011_phase3_fixes.sql`; `CareerProfileService` + `ResumeParser` + `ReviewExtractedDataSheet` + `GET/PATCH /api/profile` + `POST /api/profile/resume` + live `/career-profile` and `/onboarding` |
| Video Resume (Match) — 3A | COMPLETE | `JobService` (hash dedup 7-day window) + `JobParser` + `ResumeJobMatcher` (Gemini + Mock, non-fab preamble, `breakdown`+talkingPoints) + `POST /api/video-resume/match` + `VideoResumeStepper` + `JobForm` + results page `match/[jobId]` (`MatchScoreRing`, `SkillsBreakdown`, `TalkingPoints`). Score as alignment indicator, traceable to profile. |
| AI Resume/Job Match | COMPLETE | Same — 3A pipeline; `resumeJobMatchResultSchema` zod validated, rate-limit 10/h/user planned, dedup via `computeJobHash` |
| AI Script Generation — 3B | COMPLETE | `ScriptGenerator` (initial/regenerate/shorten/natural) via `lib/ai/services/scriptGenerator.ts` + `MockScriptGenerator` + Gemini `NON_FABRICATION_PREAMBLE` + `GET/POST/PATCH /api/video-resume/script` + `ScriptAndRecorderClient` (4-section cards, placeholder `[NEEDS_USER]` yellow dashed, wordCount) |
| Video Recording — 3B | COMPLETE | `hooks/useMediaRecorder.ts` (requesting/ready/recording/recorded/error, 180s auto-stop, mimeType fallback) + `components/video-resume/ScriptAndRecorderClient.tsx` recorder canvas (dark `neutral-900`, REC pill, live preview, fallback `<input type=file>`) + `POST /api/video-resume/video` → `lib/storage/video.ts` (magic bytes, 100MB, private `videos` bucket, `fileSize`/`durationSec`) + `lib/storage/videoValidation.ts` |
| Public Profile — 3C | COMPLETE | Minimal ADR-004 `app/p/[slug]/page.tsx` (SSR, `revalidate=300`, centered name/title, hero `aspect-video` with inline `<video controls>`, single resume card Experience/Education/Skills+summary, no JD/match/analytics) + slug `nanoid(10).toLowerCase()` immutable via `VideoResumeService.saveRecordedVideo` (preserve publish), signed URLs 300s video / 60s resume via `lib/storage/signedUrl.ts` (alias `createSignedUrl`), RLS whitelisting. |
| Public Analytics | COMPLETE (2026-09-01) | `docs/modules/03_PUBLIC_ANALYTICS.md:1` + `06_ANALYTICS_ARCHITECTURE.md:19` — `AnalyticsService` + `analytics_events` (013) + `public_profile_views` beacon (1h dedup, `ip_hash` hashed, no PII) + `POST /api/public/[slug]/view|video-play|resume-download` + `GET /api/analytics/overview|trends` + `/analytics` dashboard (overview 6 KPIs, engagement rates, trends 7/30d) + `ViewBeacon` on `app/p/[slug]` (privacy-safe, no raw IP). |
| Interview Coach | COMPLETE (2026-09-01) | `docs/modules/04_INTERVIEW_COACH.md:1` (Setup → Live → Results) — Sessions, AI questions, answer/evaluate, progress, final summary. `app/(dashboard)/interview/*`, `lib/services/interviewService.ts`, `lib/ai/services/*`, mock+gemini providers, 4 API routes, 012 migration |
| Dynamic Interview Follow-up | COMPLETE | `InterviewAnswerEvaluator` via `lib/ai/services/interviewAnswerEvaluator.ts` + `InterviewService.submitAnswer` → per-answer `interview_answer_feedback` + status flow |
| Interview Feedback | COMPLETE | Session-level `interview_feedback` bento (overallScore/label/dimensions/strengths/weaknesses/aiRecommendation) + per-question feedback via `InterviewAnswerEvaluator` |
| Interview Progress | PLANNED | Deferred polish — trend chart still no Stitch mock (`O-002`); basic progress (answered/total/avgScore/strongest/weakest) ships in Phase 4 |
| Resume AI | COMPLETE (2026-09-01) | `docs/modules/05_RESUME_AI.md:1` — `ResumeAnalyzer` via `lib/ai/services/resumeAnalyzer.ts` + `lib/services/resumeAiService.ts` + `POST /api/resume-ai/analyze` (job optional, IDOR-safe) + `/resume-ai` dashboard (resume/version + optional job picker, overall/score, section scores, strengths/issues/recommendations, keyword/jobAlignment) + Mock+Gemini with `NON_FABRICATION_PREAMBLE` + Zod + 013 analytics events for `resume_analysis` |
| Resume Versioning | COMPLETE | Immutable `resume_versions` append-only `003_resumes_and_versions.sql` + `011_phase3_fixes` (nullable, `breakdown` jsonb) + `CareerProfileService` |
| My Applications | PLANNED | Table over shared `jobs` (`PRODUCT_SPEC.md:45`); not implemented — no dedicated Stitch (`O-001`) |
| Advanced analytics | PLANNED | Product events + AI cost (`docs/architecture/06_ANALYTICS_ARCHITECTURE.md:100`) deferred to Phase 8 |
| Advanced video processing | PLANNED | Thumbnail/transcode/HLS deferred (`docs/architecture/05_STORAGE_AND_VIDEO.md:164`) |
| Speech-to-text | PLANNED | Whisper sidecar deferred (`docs/architecture/04_AI_ARCHITECTURE.md:254`) |
| Additional AI providers | PLANNED | OpenAI adapter deferred — interface ready (`docs/decisions/ADR-003:36`) |
| Testing | PARTIALLY_COMPLETE | Phase 1–5 gates PASS: `npm run build` ✓ (30 routes incl. 4 interview + 1 resume-ai + 3 analytics + 3 public beacon), `npm run lint` ✓ (0 errors, 3 img warnings), `npx tsc --noEmit` ✓, `npx tsx scripts/run-test.mjs` ✓ 40/40 (12 Phase2 + 16 Phase4 + 12 Phase5), `npx tsx tests/phase5.test.ts` ✓ 26/26. Phase 3 manual checklist 17 items PASS, Phase 4 15 items PASS, Phase 5 22 items PASS (Resume AI 12 + Analytics 10). No full e2e corpus yet — planned Phase 9. |
| Deployment | PLANNED | Vercel + Supabase same region (`ARCHITECTURE.md:230`); Phase 10 checklist not yet executed |
| Phase 0 Consistency Review | COMPLETE | `docs/PHASE_0_REVIEW.md:1` — 18/18 PASS, 0 BLOCKER, 1 IMPORTANT (I-01 staged hydration clarified by Phase 2/3 impl), 3 NON-BLOCKING |
| Phase 3 Video Resume | COMPLETE | **This session**: 3A + 3B + 3C delivered. Bus 3 (Video Resume) antigravity stopped after `JobForm` + services stubs; continued to `match/[jobId]` results, `script/[jobId]` recorder, `publish/[jobId]`, dynamic `p/[slug]`, slug immutability fix, signed URLs, security boundaries. Gates: build+lint+tsc PASS, 17-item checklist PASS. |

Allowed values used: `COMPLETE`, `PARTIALLY_COMPLETE`, `PLANNED`, `NOT_STARTED`. Phase 5 COMPLETE 2026-09-01 — Phase 1–5 gates PASS (build 30 routes, lint 0 errors, tsc ✓, 40/40 tests). Next: Phase 6 My Applications / Polish — see §12. No production Supabase integration / deploy / GitHub push performed per STOP.

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

**What is ALREADY built (2026-08-30 Phase 3):** Foundation + Auth + Career Profile (Phases 1–2 via antigravity + this session). Video Resume 3A/3B/3C now exists: `JobService`, `JobParser`, `ResumeJobMatcher`, `ScriptGenerator` (Mock+Gemini), `hooks/useMediaRecorder.ts`, `components/video-resume/*` (JobForm, MatchScoreRing, SkillsBreakdown, TalkingPoints, VideoResumeStepper, ScriptAndRecorderClient, PublishClient), routes `app/(dashboard)/video-resume/*` (page, match/[jobId], script/[jobId], publish/[jobId]), `app/p/[slug]` dynamic minimal, `app/api/video-resume/*` (match, script, video), `app/api/public*/public-profile`, `lib/storage/video*`, `supabase/migrations/011_phase3_fixes.sql`. See §2 Status and §11 Roadmap.

---

## 4. WHAT IS NOT BUILT YET

Detailed list by implementation priority. Status is from the actual repo (all `PLANNED`/`NOT_STARTED`), **not** from the plan's ambition. Phases are from `docs/implementation/06_DEPLOYMENT.md:1` and `ARCHITECTURE.md:248`.

### P0 — Required for MVP (must ship before the product is usable)

| Feature | What it is | Depends on | Blueprint ref | Current status |
|---|---|---|---|---|
| **Career Profile** | One `career_profiles` row per user + children; upload PDF → `ResumeParser` → Review sheet → `PATCH /api/profile` commit | Project Foundation (Phase 1) | `docs/product/01_PRODUCT_OVERVIEW.md:42`, `docs/architecture/02_DATABASE_SCHEMA.md:54`, `docs/modules/01_VIDEO_RESUME.md:1` foundation | COMPLETE |
| **Video Resume — AI Resume/Job Match** | Picker + `jobs` dedup (`description_hash`) → `JobParser` + `ResumeJobMatcher` → `job_matches` (score as alignment indicator) + ring + chips + talking points | Career Profile + Jobs | `docs/modules/01_VIDEO_RESUME.md:1` Step 1, `docs/architecture/04_AI_ARCHITECTURE.md:53` | COMPLETE |
| **AI Script Generation** | `ScriptGenerator` (+ `shorten`/`natural` variants) → 4-section script, `[NEEDS_USER: …]` placeholder on missing evidence | Career Profile + Job + Match | Same, Step 2 | COMPLETE |
| **Video Recording** | `useMediaRecorder` → `video/webm` blob (≤180s, ≤100MB) → private `videos` bucket → `videos` row → draft `public_profiles` slug | Script | `docs/architecture/05_STORAGE_AND_VIDEO.md:54` | COMPLETE |
| **Public Profile** | Minimal centered page `/p/[slug]` — name+title, hero video (300s signed URL), single resume card, actions (Play/Download/LinkedIn/Copy) | Video + Storage | `docs/modules/02_PUBLIC_PROFILE.md:1`, `docs/decisions/ADR-004:18` | COMPLETE |
| **Public Analytics (ingest)** | Beacon `POST /api/public/:slug/view` (dedup 1h, `ip_hash` hashed, no PII) + `public_profile_views` + `analytics_events` | Public Profile | `docs/modules/03_PUBLIC_ANALYTICS.md:1`, `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:19` | COMPLETE |
| **Resume Versioning** | Immutable `resume_versions` (append-only), `hash` dedup, `parent_analysis_id` link | Career Profile | `docs/architecture/02_DATABASE_SCHEMA.md:101` | COMPLETE |
| **Interview Coach — Setup + Live + Feedback** | Job picker reuse → `POST /api/interviews` → immersive Live loop (Q→typed answer→followup→next) → `InterviewFeedbackEngine` bento | Career Profile + Jobs + Storage | `docs/modules/04_INTERVIEW_COACH.md:1`, `docs/architecture/04_AI_ARCHITECTURE.md:53` | COMPLETE |
| **Resume AI — Analyze + Editor + Apply** | `ResumeAnalyzer` → overall/section scores + strengths/issues/recommendations/keywords/jobAlignment (Mock+Gemini, `NON_FABRICATION_PREAMBLE`) | Jobs (optional), resume_versions | `docs/modules/05_RESUME_AI.md:1` | COMPLETE (Analyze shipped; Editor/Apply per-bullet pending polish) |
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

**Phase 3 — Video Resume — COMPLETE 2026-08-30** ✓ (antigravity 3A start + this session 3A/3B/3C finish)

**What was implemented (Phase 3 — this session + antigravity):**
- **Antigravity (bus 3 start):** `lib/services/jobService.ts` (hash dedup 7-day, `computeJobHash`), `lib/types` Match/Script/Video/Public DTOs, `lib/validation/jobs.ts` + `videoResume.ts` (zod), `lib/ai/services/{jobParser,resumeJobMatcher,scriptGenerator}.ts` + `lib/ai/providers/{gemini,mock}.ts` (NON_FABRICATION_PREAMBLE, JSON schema), `lib/ai/provider.ts` (mock fallback), `lib/storage/video.ts` + `videoValidation.ts` (100MB, magic bytes `EBML`/`ftyp`), `hooks/useMediaRecorder.ts` (states, mime fallback, 180s auto-stop), `components/video-resume/*` (JobForm, MatchScoreRing, SkillsBreakdown, TalkingPoints, VideoResumeStepper), `supabase/migrations/004_jobs.sql` + `005_video_resume.sql` + `011_phase3_fixes.sql` (nullable `resume_version_id`, `breakdown` jsonb), routes `app/api/video-resume/{match,script,video}`, `app/api/public*`.
- **This session continuation (bus 3 — place of video):** Completed **3A** results page `app/(dashboard)/video-resume/match/[jobId]/page.tsx` (Bento: ring  `r=45` `dasharray 282.7`, chips strong/partial/missing, talking points, `Create My Introduction` CTA), **3B** script page `app/(dashboard)/video-resume/script/[jobId]/page.tsx` + `components/video-resume/ScriptAndRecorderClient.tsx` (4-section cards, Regenerate/Shorten/Natural via `POST /api/video-resume/script`, `PATCH` save, teleprompter, `useMediaRecorder` dark canvas `neutral-900` REC pill, preview/retake, upload fallback + `POST /api/video-resume/video` private `videos/{userId}/{jobId}/{id}.webm` + draft `public_profiles` slug immutable fix), **3C** publish page `app/(dashboard)/video-resume/publish/[jobId]/page.tsx` + `components/video-resume/PublishClient.tsx` (slug immutable `nanoid(10)`, Copy Link, Publish/Unpublish `PATCH /api/public-profile/[id]`, preview video `createSignedDownloadUrl` 300s), **3C public** minimal `app/p/[slug]/page.tsx` (SSR `revalidate=300`, `VideoResumeService.getPublicProfileBySlug` whitelisting, signed URLs 60s/300s, 404 for unpublished, no JD/match/analytics). Fixes: `supabase/migrations/011_phase3_fixes.sql`, `lib/storage/signedUrl.ts` alias + `eslint-disable`, `lib/ai/providers/mock.ts` unused vars, `app/(dashboard)/video-resume/page.tsx` typed, `lib/services/videoResumeService.ts` slug preservation.
- **Verification:** `npm run build` ✓ (18 static + 21 dynamic, 3 new video-resume routes), `npm run lint` ✓ (0 errors, 3 img warnings), `npx tsc --noEmit` ✓, `npx tsx scripts/run-test.mjs` ✓ 12/12.

**What remains incomplete (intentionally per scope):**
- Public Analytics owner dashboard (`GET /analytics?profileId=`) — Phase 5 — structure reserved, beacon POST deferred
- Interview Coach (Setup/Live/Results, dynamic follow-up, feedback 5-bar) — Phase 6
- Resume AI (Analyze/Editor/Apply, versioning) — Phase 7
- My Applications dedicated table & cross-module sweep — Phase 8

**Recommended next phase:**
- **Phase 5 Public Analytics — deferred per task** (beacon `POST /api/public/[slug]/view` + dashboard). **Next engineering task is Phase 6 — Interview Coach** per `docs/implementation/03_INTERVIEW.md:1` (reuses `jobs` + `CareerProfile`, no JD re-paste). Read: `GEMINI.md:1`, `docs/PROJECT_CONTINUITY.md:1`, `docs/modules/04_INTERVIEW_COACH.md:1`, `docs/architecture/04_AI_ARCHITECTURE.md:1` Interview* services, `docs/implementation/03_INTERVIEW.md:1`, `docs/architecture/07_SECURITY.md:1`.
- Do not start Phase 7 (Resume AI) or Phase 5 full beacon until Phase 6 gate passes; respect §6 DO NOT BUILD NOW.

**Phase 3 read list (this session):** GEMINI.md, PROJECT_CONTINUITY, 01_VIDEO_RESUME, 02_PUBLIC_PROFILE, 02_DATABASE_SCHEMA, 03_API_ARCHITECTURE, 04_AI_ARCHITECTURE, 05_STORAGE_AND_VIDEO, 07_SECURITY, 02_VIDEO_RESUME (implementation), ADR-002/003/004 — plus inspection of actual Phase 2 (`app/(dashboard)/video-resume/page.tsx`, `lib/services/*`, `hooks/`, `app/api/*`, `supabase/migrations/004…011`).

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

## 25. PHASE 4 — INTERVIEW COACH: IMPLEMENTATION (2026-09-01)

> **Status: COMPLETE** — All 15 Definition-of-Done items ticked. No Phase 5 work started, no production Supabase integration, no deploy, no GitHub push (per STOP).

### 25.1 Objective & User Flow Shipped

Dashboard → Interview Coach (`/interview`) → Select Job (shared `jobs` via `JobService.listJobs`) → Interview Preparation (type/difficulty/count) → AI-generated questions → Practice (answer/review) → Final preparation summary. Reuses canonical Career Profile + selected Job; no resume re-upload.

Empty states: no career profile → CTA to `/career-profile`; no jobs → CTA to `/video-resume` (shared job creation); invalid/unauthorized session → `404` / `400` with safe IDOR message; question generation / answer evaluation failures → `500`/`503` with `ApiError`.

### 25.2 Data Model & Migration

Reuses `007_interviews.sql` tables (`interviews`, `interview_questions`, `interview_answers`, `interview_feedback`, `interview_answer_feedback`) with RLS `user_id=auth.uid()` from `009_rls_policies.sql:143-171` and storage `interview-answers` bucket from `010_storage_buckets.sql:33`.

**New `012_interview_coach_phase4.sql`:**
- `interviews` add `updated_at` + expanded `status` check (`creating|active|abandoned|completed|feedback_ready|draft|in_progress`) + trigger `handle_interview_updated_at`
- `interview_questions` add `category` (`behavioral|technical|role_specific|company|resume_based|situational`), `difficulty` (`easy|medium|hard`), `ideal_focus` (spec STEP 3) + indexes `idx_interview_questions_category`, `idx_interview_answers_question_score`
- `interview_answers` add `answer`, `feedback`, `score` (0–100 check), `updated_at` + trigger `handle_interview_answer_updated_at`
- Follows `001–011` naming, `enable row level security` already on, no rewrite of prior migrations. Intentionally deferred production `supabase db push` (per IMPORTANT RULE).

**DTOs:** `lib/types/interview.ts:1` — `InterviewSessionDTO`, `InterviewQuestionDTO` (question/category/difficulty/order/idealFocus), `InterviewAnswerDTO` (answer/feedback/score), `InterviewFeedbackDTO` (overallScore/label/dimensions/strengths/weaknesses), `InterviewSessionDetailDTO` with `progress` (total/answered/avgScore/strongest/weakest).

### 25.3 AI Interview Service

**New interfaces** `lib/ai/services/interviewQuestionGenerator.ts:1` and `lib/ai/services/interviewAnswerEvaluator.ts:1` with Zod `interviewQuestionsResultSchema` (3–15 questions) and `interviewFeedbackSchema` (score 0–100, strengths/weaknesses/improvement/betterAnswer/feedback).

Extended `lib/ai/provider.ts:12` `AIProvider` to include `interviewQuestionGenerator` + `interviewAnswerEvaluator`; `getAIProvider()` still `mock` when `NODE_ENV=test` or no `GEMINI_API_KEY`.

**Gemini** `lib/ai/providers/gemini.ts:1` — `GeminiInterviewQuestionGenerator` (temp 0.4, `NON_FABRICATION_PREAMBLE`, JD+Profile JSON, `responseMimeType: application/json`) and `GeminiInterviewAnswerEvaluator` (temp 0.3, rubric 90-100 strong / 70-89 proficient / 50-69 developing / <50 needs_work).

**Mock** `lib/ai/providers/mock.ts:196-399` — `MockInterviewQuestionGenerator` deterministic pool per `type` (behavioral→behavioral/resume_based/situational, technical→technical/resume_based, mixed→balanced) + `[NEEDS_USER]` when profile empty; `MockInterviewAnswerEvaluator` deterministic length/keyword scoring + strengths/weaknesses/improvement. Both validate against Zod; no live Gemini required.

Non-fabrication enforced via `lib/ai/safety/nonFabrication.ts:9` preamble + mock `[NEEDS_USER]` fallback, never invents metrics/companies/tech.

### 25.4 Validation (Zod)

Extended `lib/validation/interviews.ts:1`:
- `interviewSetupSchema` (existing: jobId uuid, type mixed/behavioral/technical, difficulty easy/medium/hard, questionCount 3–15)
- `interviewQuestionGenerateSchema` (sessionId uuid)
- `interviewAnswerSchema` (sessionId uuid, questionId uuid, answer 1–5000 trimmed)
- `interviewSessionPatchSchema` (status enum including draft/in_progress/completed)
- `interviewAnswerFeedbackSchema` (score 0–100)

Scores clamped `0–100` in both AI schemas (`interviewFeedbackSchema` + column check `score >=0 AND <=100`); input length limits enforced (answer max 5000, question 10–500, category enum, etc.).

### 25.5 API Routes (Thin validator → Service → apiOk/apiErr)

All `dynamic="force-dynamic"`, auth via `supabase.auth.getUser()` (never trust `user_id` body), ownership via `JobService.getJobById(userId, jobId)` + `InterviewService.getSessionById(userId, id)` (IDOR 404 on mismatch), Zod `safeParse` → `VALIDATION_ERROR` 400, `UNAUTHORIZED` 401, `NOT_FOUND` 404, `AI_UNAVAILABLE` 503.

- `POST /api/interview/sessions` `app/api/interview/sessions/route.ts:1` — `interviewSetupSchema` → `InterviewService.createSession` → 201 + `InterviewSessionDTO` (also aliased `POST /api/interviews` for spec variance)
- `GET /api/interview/sessions` (list recent for dashboard)
- `GET /api/interview/sessions/[id]` `app/api/interview/sessions/[id]/route.ts:1` — UUID regex check, `getSessionById` with questions/answers/feedback/progress
- `PATCH /api/interview/sessions/[id]` — `interviewSessionPatchSchema` → `patchSession` (auto `completed_at` + `generateSessionFeedbackIfNeeded` on completed)
- `POST /api/interview/questions` `app/api/interview/questions/route.ts:1` — `sessionId` → `generateQuestionsForSession` (idempotent)
- `POST /api/interview/answers` `app/api/interview/answers/route.ts:1` — `interviewAnswerSchema` → `submitAnswer` → `evaluate` → insert `interview_answers` + `interview_answer_feedback`, update question status (`answered` → next `active`), auto-complete when all answered and create `interview_feedback` bento

Plural aliases `app/api/interviews/route.ts` + `app/api/interviews/[id]/route.ts` mirror singular to satisfy `docs/architecture/03_API_ARCHITECTURE.md` plural naming.

### 25.6 Interview Coach UI (Polished, Design-System Consistent)

- `app/(dashboard)/interview/page.tsx:1` — RSC fetch `CareerProfileService.getProfileByUserId` + `JobService.listJobs` + `InterviewService.listSessions`; renders `InterviewSetupClient`
- `components/interview/InterviewSetupClient.tsx:1` — Job dropdown (shared jobs), `selectedJob` detail card, Session Settings radio-cards (type behavioral/technical/mixed + difficulty easy/medium/hard + count 5/10/15), completion <60 warning, `Start Interview` → `POST /api/interview/sessions` → `router.push(/interview/[id])`, Recent Sessions list (6) with status badge + company, “How it works” card; empty states for no profile / no jobs
- `app/(dashboard)/interview/[sessionId]/page.tsx:1` — RSC guard `auth.getUser()` → `InterviewService.getSessionById` → `notFound()` on IDOR, UUID validation, 0-questions error; renders `InterviewSessionClient`
- `components/interview/InterviewSessionClient.tsx:1` — Header (role/company badges, progress answered/total + avgScore), Preparation overview (Job card, Questions count + categories, Progress bar + strongest/weakest), Question card (category/difficulty badge, `w-1 bg-secondary` accent, `Question 3 of 10`, idealFocus lightbulb, status), Answer area (Textarea 6 rows + 5000 counter, Submit/Skip/Next, never auto-submit), Feedback after submit (Score circle 14, strengths/weaknesses 2-col, `betterAnswer` + `improvement` amber card), Progress dots (secondary active, success answered), Final Preparation Summary bento when `feedback_ready`/`completed` (overallScore 78/100 + label + 5 bars secondary≥70 tertiary<70 + strengths/weaknesses + gradient AI Recommendation + Retry/Back actions), typed textarea fallback for camera-denied (no video required per MVP)

Tokens: `Card` (`rounded-xl border-outline-variant bg-surface-container-lowest`), `Button` (`secondary` indigo, `outline`, `ghost`), `Badge`, `Textarea`, `secondary #4648d4`, `surface-container`, `rounded-xl`, `gutter` spacing — consistent with `DESIGN_SYSTEM.md` and `components/ui/*`.

### 25.7 Security

Same standard as Phase 3 `docs/architecture/07_SECURITY.md:218`:
- Auth: every route `auth.getUser()` 401; middleware `PROTECTED_PREFIXES` includes `/interview`
- Ownership/IDOR: `JobService.getJobById(userId, jobId)` + `select ... eq user_id eq id` for interviews/questions/answers/feedback; `interview_answer_feedback` policy checks `interview_id in (select id from interviews where user_id=auth.uid())`; RLS `enable row level security` already on `012` tables
- Input validation: Zod on all bodies + UUID regex on params + length caps (answer 5000, question 500, score 0-100)
- XSS-safe: `Textarea` value + `dangerouslySetInnerHTML` never used; feedback rendered as text
- SQL injection: Supabase parameterized client only, no raw SQL in routes
- No `service-role` exposed to browser (`lib/supabase/service.ts` server-only guard, only `createClient()` in routes)
- No sensitive leakage: public profile whitelist unchanged; interview data never exposed via public routes
- AI prompts contain only required Profile (headline, experiences titles/companies, skills names) + Job (title/company/description slice) — no raw resume PDF, no auth tokens, no another user's data
- No fabricated qualifications: `NON_FABRICATION_PREAMBLE` in every prompt + `[NEEDS_USER]` placeholder path + mock `[NEEDS_USER]` for empty profiles

### 25.8 Error States

UI covers: no jobs → dashed “Create a Job” CTA; no career profile → “Go to Career Profile”; invalid session UUID → “Invalid Session” centered; unauthorized/not found → `notFound()` (no IDOR leak); question generation failure → “Questions not ready” + retry; answer evaluation failure → `AI_UNAVAILABLE` 503 + error banner; network failure → `catch` error banner; empty/malformed AI response → Zod `parse` throws 500 with `INTERNAL_ERROR`; empty answer → validation 400; oversized answer → 400; expired session n/a (no TTL). Mock provider allows full local dev without `GEMINI_API_KEY` (via `getAIProvider()` mock fallback).

### 25.9 Testing

**Existing Phase 1–3 gates remain passing:** `npm run build` 26 routes compiled, `npm run lint` 0 errors, `npx tsc --noEmit` ✓.

**New runner `npx tsx scripts/run-test.mjs` 28/28:**
- 12 Phase 2 (pdfValidation, completionScore, parsedResumeSchema, careerProfileInput)
- 16 Phase 4: setup valid/invalid jobId, questionCount bounds, answer valid/empty/oversized/boundary 5000, feedback score 0-100, patch status, UUID validation, mock question count+schema, mock feedback score 0-100, short vs long scoring, non-fabrication `[NEEDS_USER]`, ownership simulation, categories enum.

**Dedicated `npx tsx tests/phase4_interview.test.ts` 20/20:** Adds mock behavioral/technical type, difficulty respect, per-validator, IDOR simulations, empty/oversized, non-fabrication double-check, category allow-list.

All tests deterministic via `MockProvider` (Alex Mercer fixture), no live Gemini needed. Score validation `0–100` enforced at Zod + DB check.

### 25.10 Security Checks Performed

- `grep -r createServiceClient` — only `lib/storage/signedUrl.ts` + `app/api/public/*` (no interview route uses service-role)
- `grep -r NEXT_PUBLIC_GEMINI` — 0 hits
- RLS `enable row level security` present on all `012` alters (inherited from `009`)
- Route manual review: each reads `auth.getUser()` id, never `body.user_id`
- IDOR probes simulated in tests (other-user job/session → 404) + expected 404 on `GET /api/interview/sessions/[otherId]`

### 25.11 Remaining Issues & Known Limitations

- **Production Supabase integration intentionally deferred** — `012` migration file exists but `supabase db push` not run (per IMPORTANT RULE); remote `lvmayqmhtnqdxwoboews` project still empty (verified `PGRST205` on 2026-08-31). Push requires `SUPABASE_ACCESS_TOKEN` + DB password (see `docs/architecture/02_DATABASE_SCHEMA.md`).
- **Interview Progress trend chart** still no Stitch mock (`O-002`) — basic progress (total/answered/avg/strongest/weakest) ships, full history chart is polish.
- **No video answer recording** in Phase 4 MVP — answer is typed `Textarea` (5000) per spec `answer area large textarea`; video `interview-answers` bucket exists but `useMediaRecorder` integration for interview deferred to Phase 5 polish (spec allows typed fallback when camera denied).
- **No billing / chatbot / Python / FFmpeg** — per IMPORTANT RULE.
- **Rate-limit 6/h for `POST /api/interviews`** documented in `docs/modules/04_INTERVIEW_COACH.md` but not enforced in `012` code (covered by `lib/rateLimit.ts` hook point, left for Phase 5 hardening).

---

## 26. PHASE 5 — RESUME AI + ANALYTICS: IMPLEMENTATION (2026-09-01)

> **Status: COMPLETE** — Both Resume AI and Analytics ship. No Phase 6, no DB push, no deploy, no GitHub push (per STOP).

### 26.1 Resume AI Objective & Flow Shipped

`/resume-ai` — Select Resume (existing `resume_versions` via `CareerProfileService.listResumeVersions`) + Optional Select Job (shared `jobs` via `JobService.listJobs`) → `Analyze Resume` → `POST /api/resume-ai/analyze` → Overall Score (Quality vs Alignment) + Section Analysis + Strengths/Issues/Recommendations + Keyword Suggestions + Job Alignment. Reuses canonical Career Profile + Resume Version + optional Job; no re-upload. Empty state: no resume → CTA to `/career-profile`.

### 26.2 Resume AI Output

- **Overall Score** `0–100` clearly labeled `Resume Quality Score` (no job) or `Resume Alignment Score` (with job), not hiring probability, with `label` `needs_work|developing|proficient|strong`.
- **Section Scores** for `summary|experience|skills|education|formatting` each `score 0–100` + `strengths[]` + `issues[]` + `recommendations[]`.
- **Strengths** e.g., relevant skills, measurable achievements, strong alignment; **Issues** e.g., vague language, missing metrics, weak verbs, missing keywords; **Recommendations** actionable STAR/verb guidance.
- **Job-specific** when job selected: `jobAlignment.matchingStrengths`, `missingWeakAreas`, `keywordSuggestions` (truthful subset), `experienceRecommendations` — never instructs to falsely add skills/employers/titles/certs.

All via `resumeAnalyzerResultSchema` Zod validation.

### 26.3 Resume AI Service & Validation

- `lib/ai/services/resumeAnalyzer.ts:1` — `resumeSectionScoreSchema`, `resumeAnalyzerResultSchema` (overall 0–100, sections 3–6, strengths/issues 1–8, recommendations 2–10, keywords, `jobAlignment` nullable)
- `lib/validation/resumeAi.ts:1` — `resumeAiAnalyzeSchema` (`resumeVersionId` uuid, `jobId` optional uuid) already existed, reused.
- `lib/services/resumeAiService.ts:1` — `analyze(userId, input)` verifies `resume_versions` ownership (`eq user_id`), verifies `job` ownership via `JobService.getJobById`, loads `CareerProfileService.getProfileByUserId`, calls `getAIProvider().resumeAnalyzer.analyze`, validates, `insert resume_analyses` (non-fatal), records `analytics_events` `resume_analysis`, returns `ResumeAnalyzerResult`.

### 26.4 Gemini & Mock Providers

- `lib/ai/provider.ts:12` extended `AIProvider` with `resumeAnalyzer`.
- `lib/ai/providers/gemini.ts:1` — `GeminiResumeAnalyzer` (temp 0.3, `responseMimeType: application/json`, `NON_FABRICATION_PREAMBLE`, minimal profile `headline/summary/experiences/skills/education/projects/certs` + JD, returns `resumeAnalyzerResultSchema`; handles `hasJob` prompt variant, score calibration 90-100 strong etc.)
- `lib/ai/providers/mock.ts:1` — `MockResumeAnalyzer` deterministic: `overallScore` derived from `completionScore` + `hasSummary/experience/skills`, sections `summary|experience|skills|education|formatting` with placeholders `[NEEDS_USER: …]` when empty, strengths/issues/recommendations/keywords derived from profile/job, `jobAlignment` computed via skill intersection and missing weak detection, never fabricates.

### 26.5 Resume AI API & UI

- **API** `POST /api/resume-ai/analyze` `app/api/resume-ai/analyze/route.ts:1` — `dynamic="force-dynamic"`, `auth.getUser()` 401, `resumeAiAnalyzeSchema` 400, IDOR 404 on resume/job, `ResumeAiService.analyze` → `apiOk`, `AI_UNAVAILABLE` 503. No `user_id` trust.
- **UI** `app/(dashboard)/resume-ai/page.tsx:1` — RSC `listResumeVersions` + `listJobs` → `ResumeAiClient`
- `components/resume-ai/ResumeAiClient.tsx:1` — Resume `<select>` + Job `<select>` (General vs job), detail cards, `Analyze Resume` → `fetch` → result: `ScoreRing` SVG `r=45`, label badge, `summary`, `jobAlignment` amber, `sectionScores` grid 3 cols (`SectionCard` with badge strengths/issues/recommendations), strengths/issues 2-col, recommendations `ol` with `[NEEDS_USER]` amber dashed, keyword `Badge` list, experience recommendations `secondary-container`. Empty no-resume CTA, loading, error banner. Design tokens `Card` `Button secondary`, `Badge`, `secondary #4648d4`.

### 26.6 Analytics Event Model & Migration

Reuses `006_analytics.sql` `public_profile_views` (`ip_hash` hashed daily salt, `user_agent` truncated 512, `referer` family, 1h dedup). **New `013_analytics_events.sql:1`:**
```sql
analytics_events (id uuid pk, user_id uuid fk users cascade not null, public_profile_id uuid fk public_profiles cascade nullable, event_type check profile_view|resume_download|video_play|job_application|interview_started|interview_completed|resume_analysis|video_resume_match|script_generated, job_id uuid fk jobs set null nullable, created_at timestamptz default now(), metadata jsonb)
indexes user_created, profile, job, type, user_type_date; enable RLS; policy user_id=auth.uid().
```
No `supabase db push` (per IMPORTANT RULE). Existing `public_profile_views` kept for dedup, mirrored to `analytics_events` for unified aggregation.

### 26.7 Analytics Service

- `lib/services/analyticsService.ts:1` — `AnalyticsEventType`, `AnalyticsOverview` (`profileViews|resumeDownloads|videoPlays|applications|interviewsStarted|completed|resumeAnalyses|videoPlayRate|resumeDownloadRate`), `TrendPoint` (`date|profileViews|resumeDownloads|videoPlays`), helpers `toDayString`, `clampRate`.
- `recordEvent({userId, publicProfileId, eventType, jobId, metadata})` → `insert analytics_events` via `createClient` (owner-derived, non-fatal).
- `recordPublicView({slug, ip, userAgent, referer})` → `createServiceClient` (eslint-disabled) slug → `public_profiles` lookup `is_published`, hash `ip`=`sha256(ip|dailySalt|profile.id).slice(0,32)`, 1h dedup `public_profile_views` check, bucket `device` (desktop/mobile/tablet) + `refererFamily` (direct/linkedin/indeed/google/other), insert `public_profile_views` + mirror `analytics_events profile_view` with `{device, referer}`. Privacy: never stores raw IP.
- `recordPublicVideoPlay`/`recordPublicResumeDownload` → service lookup + `insert analytics_events`.
- `getOverview(userId)` — parallel `count` queries `analytics_events` profile_view/resume_download/video_play, `jobs` count, `interviews` count/completed, `resume_analyses` count, `public_profiles` ids → `public_profile_views` count, `profileViews = max(analytics, publicTable)` (union), rates `clampRate`.
- `getTrends(userId, 7|30)` — since `days` ago, fetch `analytics_events` + `public_profile_views` (500 limit), build `Map` 7/30 days initialized 0, aggregate per `event_type`/`viewed_at`, return `TrendPoint[]` sorted.

Instrumentation: `InterviewService.createSession` → `recordEvent interview_started`, `generateSessionFeedbackIfNeeded` → `interview_completed`, `ResumeAiService.analyze` → `resume_analysis`, `VideoResumeService` not auto (hook point), public beacon via `ViewBeacon`.

### 26.8 Analytics APIs & Public Tracking

- `POST /api/analytics/events` `app/api/analytics/events/route.ts:1` — auth 401, `analyticsRecordSchema` (`eventType` enum, `publicProfileId`/`jobId` uuid nullable, `metadata` record), verifies `jobId`/`publicProfileId` ownership 404, strips `ip`/`email` from metadata, `recordEvent` → 201.
- `GET /api/analytics/overview` `app/api/analytics/overview/route.ts:1` — auth 401, `getOverview` → `apiOk`.
- `GET /api/analytics/trends?days=7|30` `app/api/analytics/trends/route.ts:1` — auth 401, `analyticsTrendsQuerySchema` 400, `getTrends` → `apiOk`.
- `POST /api/public/[slug]/view` `app/api/public/[slug]/view/route.ts:1` — **public** no auth, slug 3–64, `x-forwarded-for`/`x-real-ip`/`user-agent`/`referer` (body or header), `recordPublicView` dedup 1h hashed IP, bucket referer, `apiOk {ok, deduped}` (404 masked). Privacy: never echoes IP.
- `POST /api/public/[slug]/video-play` + `resume-download` — public, slug-derived owner, `insert analytics_events` via service.
- All private analytics verify `user_id=auth.uid()` + `public_profile_id in (select id where user_id=auth.uid())` (for `public_profile_views` reads) — IDOR blocked.

### 26.9 Public Profile Analytics Privacy & UI Integration

- `components/public-profile/ViewBeacon.tsx:1` — `"use client"` `useEffect` fire-and-forget `fetch /api/public/${slug}/view` with `referer`, 800ms delayed video `play` → `timeupdate` ≥3s → `fetch video-play` once. No PII sent.
- `components/public-profile/ResumeDownloadButton.tsx:1` — `trackResumeDownload(slug)` on `onClick` before `href` download.
- `app/p/[slug]/page.tsx:13` — added `<ViewBeacon slug>` + `<ResumeDownloadButton slug resumeUrl>` vs disabled fallback; preserves ADR-004 minimal whitelist (never exposes `jobs.description`, `match_breakdown`, `interview_answers`, `resume_analysis`, `analytics`).
- `app/(dashboard)/analytics/page.tsx:1` — RSC `getOverview` + `getTrends(7)` + `public_profiles` 1-row check, `dynamic="force-dynamic"`, `EmptyState` if `!hasPublished && !hasAnyActivity` (shows 3 KPI cards —), else `<AnalyticsClient>`.
- `components/analytics/AnalyticsClient.tsx:1` — `useState` overview/trends, `KpiCard` (6: Views/Downloads/Plays/Applications/Interviews/Analyses), Engagement 3-col (`videoPlayRate`, `resumeDownloadRate`, privacy badge), Trends `TrendChart` lightweight bars (`bg-secondary` views 60px, `bg-primary` plays 40px, `bg-tertiary` downloads 30px) + 7/30 toggle → `fetch /api/analytics/trends`, table per-day, privacy footer. No chart dep.

### 26.10 Security

Same as `25.7` plus:
- Analytics private: `analytics_events` RLS `user_id=auth.uid()`; `public_profile_views` `select` only via `public_profile_id in (select id where user_id=auth.uid())`; public inserts via service_role only, never anon direct with arbitrary `user_id`.
- Public beacon derives `user_id`/`public_profile_id` server-side from `slug` where `is_published=true`; client cannot submit arbitrary IDs.
- Event type enum validated; `jobId`/`publicProfileId` ownership verified before `recordEvent`.
- Metadata PII stripping (`ip`, `email` deleted) + `ip_hash` truncated 32, `user_agent` truncated 512, no raw IP stored, no visitor identity exposed to owner (only counts/rates).
- Public whitelist unchanged; analytics never leaked to `GET /api/public/[slug]` or `app/p/[slug]`.

### 26.11 Testing

**Existing Phase 1–4 gates remain:** `npm run build` 30 routes, `npm run lint` 0 errors, `npx tsc --noEmit` ✓, `npx tsx scripts/run-test.mjs` now **40/40** (12 Phase2 + 16 Phase4 + 12 Phase5).

**New `npx tsx tests/phase5.test.ts` 26/26:**
- Resume AI 12: valid with/without job, invalid UUIDs, score 0–100, missing resume simulation, unauthorized resume, invalid jobId, job ownership, mock with/without job, empty profile `[NEEDS_USER]` + low score, non-fabrication keyword truthfulness, general label.
- Analytics 10: event type enum, record schema valid/invalid, authenticated owner, IDOR, public view/video/resume recordable, aggregation rates 0-100, trends 7/30 points, public/private separation, no PII exposure.
- All deterministic via `MockProvider` (Alex Mercer), no live Gemini. Score validation `0–100` enforced at Zod + DB.

### 26.12 Remaining Issues & Known Limitations

- **Production Supabase integration intentionally deferred** — `012` + `013` migration files exist but `supabase db push` not run (per IMPORTANT RULE); remote `lvmayqmhtnqdxwoboews` project still `PGRST205` on 2026-09-01. Push requires `SUPABASE_ACCESS_TOKEN` + DB password + `supabase link --project-ref lvmayqmhtnqdxwoboews`.
- **Resume AI Editor/Apply per-bullet** (`resume_suggestions` Accept/Reject/Edit → `POST .../apply` → new `resume_versions`) is deferred polish (Analyze → overall/section/recommendations ships; two-pane diff editor is `O-003` by-analogy, not Stitch).
- **My Applications** table ships as placeholder (`/applications` EmptyState) — cross-module `jobs` table exists but filters/row actions deferred.
- **Interview Progress history** trend still no Stitch (`O-002`) — basic progress ships.
- **No billing/chatbot/Python/FFmpeg** — per IMPORTANT RULE.
- **Rate-limit** (`docs/modules/05_RESUME_AI.md` 6/h `POST /api/resume-ai/analyze`, `06_ANALYTICS_ARCHITECTURE.md` 10/h/IP view) documented but not enforced in code (hook `lib/rateLimit.ts` reserved).
- **Analytics materialization** `public_profile_view_daily` deferred until ≥50k views (lazy `GROUP BY` fine at <10k).

---

## 27. PHASE 6 — FINAL APPLICATION COMPLETION & INTEGRATION READINESS (2026-09-01)

> **Status: COMPLETE** — Application is internally complete, coherent, secure, testable and ready for final Supabase/GitHub/deployment integration pass. Remote DB NOT modified, GitHub NOT pushed, production NOT deployed — per CRITICAL STOP RULE.

```
Phase 6 application development COMPLETE.
Remote Supabase integration NOT performed.
GitHub push NOT performed.
Production deployment NOT performed.
```

### 27.1 Mission & Verified Baseline

Phase 6 is the **FINAL APPLICATION DEVELOPMENT PHASE** before the integration pass (`supabase db push` → RLS/Storage verification → env → e2e → security → commit → push → deploy). Baseline was re-verified at start of Phase 6:

- `git log --oneline -5` → `eeb4c6b feat: Phase 1 foundation + Phase 2 Career Profile scaffolding` (all later work uncommitted, correctly deferred)
- `npm run build` → 30 routes compiled successfully, 0 type errors
- `npm run lint` → 0 errors, 3 pre-existing `no-img-element` warnings (`MobileDrawer.tsx:62`, `SideNavBar.tsx:62`, `TopNavBar.tsx:31`)
- `npx tsc --noEmit` → 0 errors
- `npx tsx scripts/run-test.mjs` → 40/40 (Phase 2 + 4 + 5 gate)
- `npx tsx tests/phase4_interview.test.ts` → 20/20
- `npx tsx tests/phase5.test.ts` → 26/26

No baseline drift — no investigation needed before changes.

### 27.2 Full Application Audit Performed

Inspected: `app/` (30 routes), `components/` (26 files), `hooks/`, `lib/` (services/validation/ai/storage/supabase/rateLimit), `supabase/migrations/` (14 files), `scripts/`, `tests/`, `docs/`, `public/`, `package.json`, `.env.example`, `.env.local`, every dashboard navigation item and route.

Inventory: 7 primary nav items (Dashboard, Career Profile, Video Resume, Interview Coach, Resume AI, My Applications, Analytics + Settings) — all reachable. Zero placeholder pages without explanation, zero dead links after fixes. 16 categories audited (implemented/placeholder/empty/TODO/buttons/links/duplicate APIs/services/components/imports/types/loading/error/security/migrations) — see subsections.

### 27.3 Navigation & Placeholder Fixes Shipped

- **Dashboard hardcoded Recent Applications (Google 82% / Microsoft 76%)** replaced with real `jobs` query (`supabase.from("jobs")` limit 3) plus honest empty state (“No jobs yet — Create your first job → /video-resume”) — `app/(dashboard)/dashboard/page.tsx:1`
- **Dashboard KPI cards** hardcoded (Resume 84 / Interview 78 / Resume AI 12 / Video 2 profiles) replaced with real queries: `resume_analyses.category_scores.overall`, `interview_feedback.overall_score`, `resume_analyses.length`, `public_profiles` count — each with explicit empty state (“No data — Run Resume AI / Start Interview / Create Video Resume”)
- **Recent Applications table** now `scope="col"` + `sr-only` a11y labels, conditional empty vs real rows; header “Overall Readiness” remains derived from `completionScore` (A-/B-/Needs Setup) — no fabrication.
- **My Applications** `/applications` was static `hasJobs=false` placeholder. Now async RSC `JobService.listJobs(userId)` with 2 branches: empty → `EmptyState` + amber honest note “Advanced filters/match score/row actions deferred (O-001)”; populated → full table `Job/Source/Created/Actions` (Video/Interview/Resume AI links) plus honest footer — `app/(dashboard)/applications/page.tsx:1`
- **SideNavBar CTA** `New Application` previously pointed to `/applications` (empty). Fixed to `/video-resume` with subtitle “Creates a tracked job → Video/Interview/AI” — `components/nav/SideNavBar.tsx:118`
- **PublishClient** outdated “Analytics will live at /analytics?profileId= in Phase 5. Structure is reserved; no beacon dashboard is shipped in Phase 3.” replaced with live link “Views, plays and downloads for /{slug} appear in Analytics (daily IP-hash dedup, privacy-safe, no raw IP).” — `components/video-resume/PublishClient.tsx:134`
- Remaining placeholders intentionally kept and documented: Interview Progress trend chart (O-002), Resume AI Editor/Apply per-bullet (O-003), advanced analytics/video processing/STT (deferred).

Search `TODO|FIXME|Coming soon|Not implemented|[NEEDS_USER]|Alex Mercer` → only legitimate `[NEEDS_USER]` AI markers and test mocks (Alex Mercer canonical fixture) remain; zero accidental product placeholders.

### 27.4 Public Profile Final Audit

`/p/[slug]` — `app/p/[slug]/page.tsx:1`, `lib/services/videoResumeService.ts:getPublicProfileBySlug`, `components/public-profile/ViewBeacon.tsx:1`, `ResumeDownloadButton.tsx:1`

- Published works (SSR `revalidate=300`, `generateMetadata`), unpublished → `notFound()` generic 404 (no leakage unpublished vs nonexistent) ✓
- Slug immutable: `nanoid(10).toLowerCase()` per `VideoResumeService.saveRecordedVideo` with `preservePublished` guard ✓
- Resume download: `createSignedUrl("resumes", file_path, 60)` short-lived, whitelisted ✓
- Video playback: `<video src={profile.videoUrl} controls playsInline preload="metadata">` with signed URL 300s TTL; empty state “hasn't published an introduction video yet.” ✓
- LinkedIn/portfolio links now sanitized via `isSafeHttpUrl()` (only `https:`/`http:` via `new URL`, blocks `javascript:`/`data:`) and portfolio button added only if safe — XSS prevention ✓
- Immutable `is_published` filter `eq("is_published", true)` on slug lookup ✓
- Whitelist-only: selects only `name/title/location/summary/experiences/education/skills/videoUrl/resumeUrl`; never leaks `jobs.description`, `job_matches`, `scripts`, `interviews`, `resume_analyses`, `analytics`, internal IDs, `user_id` — `getPublicProfileBySlug` verified ✓
- Analytics beacon `ViewBeacon` fire-and-forget `fetch(…/view).catch(() => {})` + `keepalive:true`, delayed `video.play` → `timeupdate ≥3s` → `video-play`, never blocks rendering; `ResumeDownloadButton` `trackResumeDownload` also `.catch` — public profile remains usable if analytics fails ✓
- `Copy link` button now `aria-label="Copy profile link"` and `catch(() => {})` ✓
- `contactEmail` rendered as `mailto:` with `encodeURIComponent("[CareerFlow] via your public profile")` subject — intentional whitelist ✓

### 27.5 Authentication & Authorization Audit

All private API routes verified: `api/profile*`, `api/video-resume/match|script|video`, `api/interviews`, `api/interview/sessions|questions|answers`, `api/resume-ai/analyze`, `api/analytics/overview|trends`, `api/public-profile/[id]` — each:

```
derive user via await supabase.auth.getUser() → 401 if !user
  ↓ never body.user_id / query.user_id
  ↓ verify ownership (JobService.getJobById(userId), ResumeAiService resume_version eq user_id, InterviewService.getSessionById eq user_id)
  ↓ perform operation → ApiError 404/403 on mismatch
```

IDOR surface tested: `JobService.getJobById`, `InterviewService.getSessionById|submitAnswer`, `ResumeAiService.analyze` (resume + job), `AnalyticsService.getOverview/getTrends` (RLS + user_id filter). Cross-user probe in tests returns 404, not data — `tests/phase6.test.ts:124-135`.

No route trusts `body.user_id`, `query.user_id`, or client-provided ownership.

### 27.6 Service-Role Audit

- Search `SUPABASE_SERVICE_ROLE_KEY|createServiceClient|service-role` → only `lib/supabase/service.ts:9` (throws if `typeof window !== "undefined"`), `lib/storage/signedUrl.ts:2` (eslint-disabled, correct), `lib/services/analyticsService.ts:3` (eslint-disabled, beacon + signed-URL use case) — all server-only
- No `createServiceClient` in `app/api/interview/*`, `app/api/resume-ai/*`, `app/api/video-resume/*` — verified via `grep`
- `.env.example` has `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key` (server-only), no `NEXT_PUBLIC_` prefix; env audit `lib/env.ts:24` forbids `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` with throw
- `NEXT_PUBLIC_` exposed keys are only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL` — safe to embed (anon is RLS-scoped)
- Lint `no-restricted-imports` in `.eslintrc.json:4` forbids `createServiceClient` import outside allowed paths; both allowed files have `eslint-disable` with comment.

### 27.7 Input Validation Audit

Every user-controlled input is Zod-validated server-side:

- `matchRequestSchema` (`title 1-120`, `company 1-120`, `description 20-20000`) — `app/api/video-resume/match`
- `scriptGenerateSchema` (`jobId uuid`, `mode enum`) — `app/api/video-resume/script` GET/POST, plus `scriptUpdateSchema` (4 sections min 1), PATCH
- `interviewSetupSchema` (`jobId uuid`, `type` enum, `difficulty` enum, `questionCount 3-15`) — `app/api/interviews`, `api/interview/sessions`
- `interviewAnswerSchema` (`sessionId uuid`, `questionId uuid`, `answer 1-5000 trim`) — `api/interview/answers`, plus `interviewSessionPatchSchema` status enum
- `resumeAiAnalyzeSchema` (`resumeVersionId uuid`, `jobId optional uuid`) — `api/resume-ai/analyze`
- `analyticsRecordSchema` + `analyticsTrendsQuerySchema` (`days 7|30`) — `api/analytics/*`
- `public/[slug]/view|video-play|resume-download` slug `3-64` length check + `referer` slice 512, `ip`/`userAgent` header-derived
- `video` upload now validates `jobId` UUID regex + `durationSec 0-600` after Phase 6 fix (`app/api/video-resume/video/route.ts:40`), `validateVideoBuffer` (empty, >100MB, magic bytes EBML `0x1A 0x45 0xDF 0xA3` / ftyp) + MIME allowlist `video/webm|video/mp4`

Sensible maxima: resumes 10MB (bucket + `pdfValidation`), videos 100MB / 180s, JD 20k, answer 5k, trends limit 500 rows.

### 27.8 XSS / SSRF / CSRF / SQL Injection

- **XSS:** `grep dangerouslySetInnerHTML|innerHTML|eval(|new Function` → only docs; no `dangerouslySetInnerHTML` in `app/` `components/` — user/AI text rendered via `Textarea` value, `whitespace-pre-wrap` `<p>`, `list-disc <li>` text, never HTML. `linkedinUrl`/`portfolioUrl` sanitized via `isSafeHttpUrl`.
- **CSRF:** app uses Supabase `httpOnly` `sb-*` cookie + `createServerClient` session refresh in `middleware.ts:22`; state-changing `POST/PATCH` routes verify `auth.getUser()` server-side per existing security model — no additional CSRF token needed for same-origin cookie (Vercel same-domain).
- **SSRF:** no `fetch(userInputUrl)` anywhere; only `fetch` to internal `/api/*` or Gemini API via server.
- **SQL injection:** Supabase query builder only (`eq`, `insert`, `select("*")`); no raw `sql` construction.

### 27.9 AI Safety, Provider Fallback & Non-Fabrication

- Providers: `lib/ai/provider.ts:25` `getAIProvider()` → `mock` when `NODE_ENV=test` or `!GEMINI_API_KEY` or `AI_PROVIDER=mock`; `gemini` when `AI_PROVIDER=gemini|""` and key present — `throw` on unsupported value
- All 7 services (`resumeParser`, `jobParser`, `resumeJobMatcher`, `scriptGenerator`, `interviewQuestionGenerator`, `interviewAnswerEvaluator`, `resumeAnalyzer`) share `MockProvider` + `GeminiProvider` with strict Zod schemas (`parsedResumeSchema`, `resumeJobMatchResultSchema`, `generatedScriptSchema`, `interviewQuestionsResultSchema`, `interviewFeedbackSchema`, `resumeAnalyzerResultSchema`) — malformed → `500 INTERNAL_ERROR` safely
- Scores bounded `0-100` via `check (overall_score >=0 <=100)` + Zod `min(0).max(100)` + `clampRate`
- `NON_FABRICATION_PREAMBLE` (`lib/ai/safety/nonFabrication.ts:9`) injected in every Gemini prompt (resumeParser/jobParser/match/script/questions/evaluate/analyze); `Mock*` mirrors with `[NEEDS_USER: …]` insertion when `completionScore<60` or empty profile — never invents metrics/techs/companies
- API keys `GEMINI_API_KEY` server-only (assert `typeof window !== "undefined"` throw), never logged, minimal data in prompts (headline/summary/experiences.slice 0-3/skills.slice 0-10)
- Mock is default for CI — all 101 tests pass without live Gemini

### 27.10 Loading / Error / Empty / Form UX Audit

Every major async flow has tri-state:

- **Career Profile:** `CareerProfileClient` with resume upload modal + review sheet; empty → “Upload resume to hydrate profile”
- **Video Resume:** Step 1 `JobForm` with Zod errors + empty `Create a job to use Video Resume or Interview Coach` ; Step 2 `ScriptAndRecorderClient` loading `Working…` + `Generate Script`, error `ErrorAlert`, empty `no career profile → Go to Career Profile`; Step 3 publish loading `Updating…`/`Saving…`, error banner, empty “No video yet — record on previous step”
- **Interview Coach:** `InterviewSetupClient` empty `Career Profile Required` / `No Jobs Yet → Create a Job`, recent sessions list or “No sessions yet”, loading `Generating questions…`/`Evaluating…`, error banner, answer `maxLength 5000` + counter, skip/complete flows
- **Resume AI:** `ResumeAiClient` empty `No Resume Yet → Go to Career Profile`, job picker empty `General analysis`, loading `Analyzing…`, error `error-container`, result `ScoreRing` + amber `Job Alignment` or empty “No analyses yet”
- **Analytics:** `app/(dashboard)/analytics/page.tsx:1` empty `No published profile yet → Go to Video Resume` with 3 “—” KPI cards, else `AnalyticsClient` with `Loading trends…` + error silent catch
- **Public Profile:** video `videocam_off` empty, resume `Resume unavailable` disabled
- **Applications:** empty `EmptyState` with O-001 note, populated table

Form UX: every submit button `disabled={loading}` prevents double-submit (`InterviewSetupClient:190`, `ResumeAiClient:176`, `ScriptAndRecorderClient:186`, `PublishClient:85`, `InterviewSessionClient:270`); validation messages inline via `firstIssue.message`, success toast via state, Cancel/Back use `router.push` or `setEditing(false)`.

### 27.11 Video / Interview / Resume AI / Analytics Regression

- **3A Match:** job creation/deduplication (7-day `description_hash`), Career Profile reuse, match score ring `r=45 dasharray 282.7` (`MatchScoreRing`), `SkillsBreakdown` chips strong/partial/missing, `TalkingPoints` 3 items — verified at `match/[jobId]/page.tsx`
- **3B Script+Record:** initial/regenerate/shorten/natural via `POST /api/video-resume/script` with `mode` enum, edit/save via `PATCH`, recording `useMediaRecorder` (requesting/ready/recording/recorded/error, 180s auto-stop, `requestAnimation` teleprompter, `URL.createObjectURL` preview) + upload fallback `<input type=file accept=video/*>` → `POST /api/video-resume/video` 100MB magic-byte check, preview 180s max, before/after `retake` — `script/[jobId]/page.tsx` + `ScriptAndRecorderClient`
- **3C Publish:** `public_profiles` slug immutable (`nanoid(10).toLowerCase()` preserve `is_published`), `PublishClient` Copy Link (clipboard + fallback `execCommand`), Publish/Unpublish `PATCH /api/public-profile/[id]` (ownership `eq user_id`), public `/p/[slug]` video 300s signed URL, resume 60s signed URL — `publish/[jobId]/page.tsx`
- **Interview Coach:** job selection reuses `jobs` (`InterviewSetupClient` `<select>`), `createSession` verifies `JobService.getJobById`, `InterviewQuestionGenerator` produces behavioral/technical/mixed `count 3-15`, difficulty easy/medium/hard, answer `Textarea 5000` → `InterviewAnswerEvaluator` score `0-100` + strengths/weaknesses/improvement/betterAnswer, progress `answered/total/avg/strongest/weakest`, completion `generateSessionFeedbackIfNeeded` → `interview_feedback` bento `overallScore/label/dimensions/strengths/weaknesses/aiRecommendation`, ownership `eq user_id` on all tables — `interview/[sessionId]/page.tsx` + `InterviewSessionClient`
- **Resume AI:** resume selection (`listResumeVersions`), optional job, `analyze` → quality `0-100` + 5 section scores + strengths/issues/recommendations + keyword suggestions + `jobAlignment` (skill intersection) + `[NEEDS_USER]` yellow dashed — `resume-ai/page.tsx` + `ResumeAiClient`; two-pane editor deferred, not required for flow
- **Analytics:** `recordPublicView` 1h dedup `public_profile_views` + mirror `analytics_events`, `recordPublicVideoPlay|ResumeDownload` via service-role slug lookup, `getOverview` 6 KPIs + `videoPlayRate/resumeDownloadRate 0-100`, `getTrends` 7/30 day `TrendPoint[]` with `date` keys, aggregation correctness tested — `analytics/page.tsx` + `AnalyticsClient`; failure does not break public profile/video/resume download (fire-and-forget + `.catch`)

No Phase 4/5 behavior broken (101 tests still green).

### 27.12 Analytics Privacy

- Owner aggregates only: `getOverview/getTrends` filter `where user_id = auth.uid()` (private `analytics_events`) and `select` on `public_profile_views` via `public_profile_id in (select id where user_id=auth.uid())`
- Public visitors cannot discover: `id`/`user_id`/`ip_hash`/`user_agent`/`email`/internal `profileId`/JD/answers/Resume AI analysis — public endpoints return `{ok}` or whitelisted `PublicProfileViewDTO` only
- IP handling: `ip_hash = sha256(ip | dailySalt | profile.id).slice(0,32)` with daily-rotated `dailySalt = new Date().toISOString().slice(0,10)`, 1h dedup (`gte viewed_at oneHourAgo`), never stores raw IP (`AnalyticsService.recordPublicView:97`); `user_agent` truncated 512, `referer` bucketed to `direct|linkedin|indeed|google|other`
- `analytics_events.metadata` stores only `{device, referer}` for views — no PII

### 27.13 Storage Audit

Three **private** buckets `resumes` (10MB `application/pdf` only, magic `%PDF` + encrypted check, forever immutable `resumes/{userId}/{versionId}.pdf`, 60s signed URL), `videos` (100MB `video/webm|video/mp4`, EBML `0x1A 0x45 0xDF 0xA3` / `ftyp`, ≤180s advisory, `videos/{userId}/{jobId}/{videoId}.webm`, 300s signed URL), `interview-answers` (100MB, 30d rolling, 300s owner-only) — `supabase/migrations/010_storage_buckets.sql:1` `public = false`, `file_size_limit` 10M/100M, `allowed_mime_types`, storage RLS `(storage.foldername(name))[1] = auth.uid()::text` per bucket.

Ownership checks: `uploadVideoBuffer` validates `validateVideoBuffer` before `supabase.storage.from("videos").upload(storagePath, buffer, {contentType})` with `upsert:false`; keys are `nanoid()` / `UUID`, never client filename `../` canonicalizes; `createSignedDownloadUrl` uses `useServiceRole=true` only for public video preview where needed, otherwise `createClient()`.

File validation: resumes `lib/storage/pdfValidation.ts:1` `%PDF` + `encrypted` + `size>10MB` reject; videos `lib/storage/videoValidation.ts:1` `EBML`/`ftyp` + `100MB` + `mimeTypeHint` fallback; MIME/magic depth is server-side, not just client `accept`.

### 27.14 Database Migration Audit

Do NOT push remotely (Phase 6 rule). Migrations `001`…`014` inspected in order, no duplicate ids, contiguous:

- `001_init_users_and_trigger.sql` — `users` + `handle_new_user()` trigger on `auth.users` → `users.id=auth.users.id`
- `002_core_profile.sql` — `career_profiles` (1 per user unique `user_id`) + `experiences|education|skills|projects|certifications` with FK `cascade` + `completed_score 0-100` + triggers
- `003_resumes_and_versions.sql` — `resumes` + immutable `resume_versions` (`version_number` monotonic `unique(resume_id,version_number)`, append-only `insert` only via RLS)
- `004_jobs.sql` — `jobs` (`description_hash` dedup at app `computeJobHash` 7-day window) + `job_matches` (`score 0-100`, `strong/partial/missing` legacy arrays)
- `005_video_resume.sql` — `scripts` (`unique user_id,job_id`), `videos` (`storage_path`, `file_size_bytes bigint`, `status`), `public_profiles` (`slug unique nanoid10`, `is_published`)
- `006_analytics.sql` — `public_profile_views` (`ip_hash`, `viewed_at`, `dedup` index `profile_id,ip_hash,viewed_at`)
- `007_interviews.sql` — `interviews` + `interview_questions` + `interview_answers` + `interview_feedback` + `interview_answer_feedback`
- `008_resume_ai.sql` — `resume_analyses` (`category_scores jsonb`, `model`) + `resume_suggestions` (`status pending/accepted/rejected`)
- `009_rls_policies.sql` — `enable row level security` on every table + `using(user_id=auth.uid()) with check(...)` per table; `anon insert views with check(true)` + `owner read views` via `public_profile_id in (select ...)`; whitelisting view `public_profile_public_view`
- `010_storage_buckets.sql` — 3 private buckets + storage.objects RLS `foldername(name)[1]=uid`
- `011_phase3_fixes.sql` — `job_matches.resume_version_id drop not null` + `breakdown jsonb default '[]'` + `public_profiles.resume_version_id drop not null`
- `012_interview_coach_phase4.sql` — adds `updated_at` + expands `status` (`draft|in_progress|completed|creating|active|abandoned|feedback_ready`) + `category/difficulty/ideal_focus` + `answer/feedback/score/updated_at` + indexes
- `013_analytics_events.sql` — `analytics_events` (`event_type check` 9 values, `user_id` FK, `public_profile_id`/`job_id` FK, `metadata jsonb`, indexes `user_created|profile|job|type|user_type_date`, RLS `user_id=auth.uid()`)
- `014_phase6_completion_fixes.sql` **NEW Phase 6** — fixes `videos.file_size` vs `file_size_bytes` mismatch (canonical `file_size_bytes bigint`, adds `file_size` compat + backfill, `updated_at timestamptz` + trigger `handle_videos_updated_at`), ensures `public_profiles.updated_at` trigger, index `jobs.source`, index `analytics_events.public_profile_id`, re-asserts `public_profile_views enable RLS`, index `resume_analyses.job_id`

**Schema alignment verified:** foreign keys `user_id FK cascade` everywhere (RLS requires redundant `user_id`), indexes on `user_id`, `created_at`, `slug`, `question_id`, `interview_id`; triggers `handle_updated_at` on mutable tables; `public_profiles.slug` immutable via service preserve; `videos.file_size_bytes` now matches `lib/services/videoResumeService.ts:329` (`file_size_bytes: uploadResult.fileSize`) and read fallback `file_size_bytes ?? file_size` — eliminates PGRST204 unknown column runtime error.

Migration set is ordered, idempotent `if not exists`, no conflicting constraints, no missing `enable row level security` (all 9+10+13+14 assert).

```
DATABASE READY FOR FINAL INTEGRATION
```

### 27.15 Environment Audit

- `.env.local` gitignored (verified via `.gitignore`), `.env.example` committed with safe placeholders only
- Public vars (`NEXT_PUBLIC_*`): `NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=…` (RLS-scoped), `NEXT_PUBLIC_APP_URL=http://localhost:3000` — safe to embed
- Server-only secrets: `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`, `GEMINI_API_KEY=your-gemini-api-key` — never `NEXT_PUBLIC_` prefix; guarded by `lib/env.ts:33` build-time throw on `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`, and `lib/supabase/service.ts:10` / `lib/ai/providers/gemini.ts:30` runtime `typeof window !== "undefined"` throw
- `GEMINI_MODEL=gemini-1.5-pro`, `AI_PROVIDER=gemini|mock` — server-only, switches via `lib/ai/provider.ts:25`

### 27.16 Dependency Audit

`package.json:12` pinned versions: `next 14.2.35`, `react 18`, `zod 4.5.4`, `@supabase/ssr 0.12.5`, `@supabase/supabase-js 2.112.4`, `@google/generative-ai 0.24.1`, `@hookform/resolvers 5.9.1`, `@radix-ui/*`, `lucide-react 1.37`, `nanoid 6.0.1`, `tailwind-merge`, `clsx`, `class-variance-authority`; `devDeps` `tsx 4.23.13`, `typescript 5`, `tailwindcss 3.4.1`, `eslint 8`, `eslint-config-next 14.2.23`. No unused/duplicate/unnecessary new packages; `recharts`/`puppeteer`/`ffmpeg` not installed per DO NOT. New Phase 6 dep none — only `lib/rateLimit.ts` native `Map` (no extra dep).

No aggressive upgrades (Next/React/Supabase kept as specified).

### 27.17 Accessibility Audit

- Semantic buttons: all actions are `<button>` or `Button` (`type="button"`), never `<div onClick>` — `SideNavBar` `Link`, `MobileDrawer`, `PublishClient` `Copy Link` has `aria-label`
- Labels: every `Textarea`/`select` has `<label>` or `text-label-md font-medium` sibling; `InterviewSessionClient` `<label>Your answer</label>` + `maxLength 5000` counter; `ResumeAiClient` `Resume Version`/`Target Job` labels with `focus:ring-2 focus:ring-secondary` visible focus
- Keyboard: `sideNav` uses `Link`, `onClick` via `button`, tabbable; focus ring `ring-secondary` on selects
- Headings: `Dashboard` `h1 Welcome back` + `h3 Career Profile` + `h3 Quick Actions` + `h4` cards, `Public Profile` `h1 displayName` + `h2` Experience/Education/Skills/About with `border-b`, `Analytics` `h1` + `h3 Overview` + `h4` Engagement/Trends — meaningful hierarchy
- Alt text: `img` avatar has `alt={user.name}`; video has fallback text `Your browser does not support video. <a>Download`
- Error messages: `role=log` omitted but `ErrorAlert` `bg-error-container text-on-error-container` with `text-body-sm`, actionable
- Contrast: `primary/#0F172A` on `background #f8f9ff` 14:1, `secondary #4648d4` on white 6.2:1 — sufficient; `onSurfaceVariant #5A5A5A` on white 7:1
- Video controls: `controls playsInline preload="metadata"` on recruiter + publish preview

No redesign; only small `aria-label`/`scope`/`sr-only` added.

### 27.18 Responsive UI Audit

Checked bento grids at mobile/tablet/desktop:

- `Dashboard` `grid-cols-1 md:grid-cols-12 gap-sm` → 8+4 header, 3+3+3+3 KPI row, no overflow (table `overflow-x-auto`)
- `Career Profile` `ReviewExtractedDataSheet` `Sheet` responsive, `ResumeUploadModal` centered
- `Video Resume` Stepper `VideoResumeStepper 1..3` horizontal scroll-safe; Match `MatchScoreRing` flex wrap; Script `ScriptAndRecorderClient` `grid lg:grid-cols-12` 5+7, recorder `aspect-video`
- `Publish` `grid lg:grid-cols-12 7+5`
- `Public Profile` `max-w-4xl px-gutter` centered header, `aspect-video` hero, single resume card `p-12 md:p-12`, `flex-wrap` skills chips
- `Interview Coach` Setup `grid lg:grid-cols-12 8+4` type `grid sm:grid-cols-3`, Live `InterviewSessionClient` dot nav `flex gap-1.5`, Results bento `grid md:grid-cols-3`
- `Resume AI` selectors `p-6` stack, `grid md:grid-cols-2 lg:grid-cols-3` section cards, `grid lg:grid-cols-2` strengths/issues
- `Analytics` KPI `grid-cols-2 md:grid-cols-3 lg:grid-cols-6`, Engagement `grid md:grid-cols-3`, Trends `flex items-end 32*60px` bars + `overflow-x-auto` table

No new design system — Tailwind `container-max 1280` + `gutter 24` preserved; no horizontal overflow at 375/768/1280 viewport.

### 27.19 Performance Audit

- Client components only where needed: `InterviewSetupClient`, `InterviewSessionClient`, `ResumeAiClient`, `AnalyticsClient`, `ViewBeacon`, `ScriptAndRecorderClient`, `PublishClient`, `useMediaRecorder` → `“use client”`; pages `app/(dashboard)/*|/p/[slug]` remain RSC `server` (avoids bundle bloat)
- No repeated API calls: `Promise.all` parallel fetches in `analytics/page.tsx:19`, `interview/page.tsx:17`, `dashboard/page.tsx:25`, `resume-ai/page.tsx:18` — single roundtrip per page
- DB queries bounded: `limit(1|3|5|500)` on large tables, indexes on `user_id,created_at`
- Signed URLs short-lived (60/300s), not re-fetched on every render (`60s resume`, `300s video`)
- `useMediaRecorder` object URL leak fixed: `previewUrlRef` stores latest string, `useEffect` cleanup `URL.revokeObjectURL(previewUrlRef.current)` no longer re-subscribes on every `previewUrl` string change (`hooks/useMediaRecorder.ts:137`) — leak closed
- `ViewBeacon` delayed 800ms + `keepalive:true` + `.catch` avoids main-thread blocking; 1h dedup prevents DB pressure
- No unnecessary AI calls: `matchJob` dedup 7-day hash, `getOrCreateScript` returns existing on `initial` mode without regeneration, `RateLimit` on AI routes

No premature optimization; `recharts` not added, lazy aggregation fine at <10k.

### 27.20 Route Inventory & Duplicate Alias Review

`npm run build` route table (31 total, 0 missing):

- **Marketing:** `/`, `/_not-found` static; `/p/[slug]` SSR 300
- **Auth:** `/login`, `/signup`, `/auth/callback`, `/auth/signout`
- **Dashboard:** `/dashboard`, `/onboarding`, `/career-profile`, `/analytics`, `/applications`, `/settings` (stub `154 B`), `/dashboard` (stub)
- **Video Resume:** `/video-resume` (4.01kB), `/video-resume/match/[jobId]` (1.83kB), `/video-resume/script/[jobId]` (5.84kB), `/video-resume/publish/[jobId]` (3.12kB)
- **Interview:** `/interview` (3.66kB), `/interview/[sessionId]` (4.3kB)
- **Resume AI:** `/resume-ai` (3.72kB)
- **API:** `/api/analytics/{events,overview,trends}`, `/api/interview/{answers,questions,sessions,sessions/[id]}`, `/api/interviews{,/ [id]}`, `/api/profile{,/resume,/resume-versions}`, `/api/public-profile/[id]`, `/api/public/[slug]{,/view,/video-play,/resume-download}`, `/api/resume-ai/analyze`, `/api/video-resume/{match,script,video}`

Auth behavior per `middleware.ts:4` `PROTECTED_PREFIXES dashboard|career-profile|video-resume|interview|resume-ai|analytics|settings|onboarding` → 302 `/login?next=…` when `!user`; `/p/*` is public `PUBLIC_PATHS` + `pathname.startsWith("/p/")`.

Duplicate alias `api/interview/*` vs `api/interviews/*` — **intentionally kept**: `api/interviews` (plural) is legacy alias per `docs/architecture/03_API_ARCHITECTURE.md:91` (`GET /api/interviews` list vs `POST /api/interviews` create) while new `api/interview/sessions` etc. is spec STEP 3 (`docs/implementation/03_INTERVIEW.md:91`) nested shape; similar `api/public-profile/[id]` vs `api/public/[slug]` — separate concerns (owner publish toggle vs recruiter view). Docs explicitly require both; do not remove.

### 27.21 Applications Page Deep Dive

Per STEP 27, incomplete page must not appear broken. Phase 6 implementation:

- `app/(dashboard)/applications/page.tsx:1` is now `async` RSC, `dynamic="force-dynamic"`, fetches `JobService.listJobs(userId)` (owner-derived `user_id = auth.uid()`), zero mock data
- `jobs.length===0` → `EmptyState icon work_history title No applications yet description Jobs you create … actionHref /video-resume` + honest amber `Card` “Advanced filters, match score and row actions deferred (O-001) — Data model ready”
- `jobs.length>0` → `Card` table `Job|Company|Source|Created|Actions` with `Badge` source, `Created` localeDate, Actions `Video|Interview|Resume AI` Links (cross-module reuse), plus footer `Card p-4 honest state Filters/match score/video status deferred (O-001) — single source`
- No fake records (never `["Google","Microsoft"]` hardcode), navigation is intentional (SideNav + Dashboard Recent Applications both link here), design language `Card` `Badge` `EmptyState` reused

Requirements met without inventing ATS.

### 27.22 Rate Limiting

Deferred large system per `docs/architecture/03_API_ARCHITECTURE.md:204`, but lightweight in-memory hook added (fails open, no dep):

- New `lib/rateLimit.ts:1` — `Map<string,Bucket>` per IP `count/resetAt`, `checkRateLimit(key,limit,windowMs)` + helper `rateLimitByRequest(request,{keyPrefix,limit,windowMs})` deriving `x-forwarded-for|x-real-ip` prefix, periodic `setInterval` 60s cleanup with `unref`
- Sensitive public endpoints:

```
POST /api/public/:slug/view         → 60/min/IP per slug (prevents beacon flood)
POST /api/video-resume/match        → 10/hour/IP (LLM cost)
POST /api/resume-ai/analyze         → 10/hour/IP (LLM cost)
POST /api/interviews                → 6/hour/IP (interview creation)
```

Future integration point clear — swap `Map` for Vercel KV / Upstash with same `checkRateLimit` API; `docs/modules/05_RESUME_AI.md:82` + `06_ANALYTICS_ARCHITECTURE.md:100` already spec 6/h and 10/h.

Documented gap: no global distributed limit yet; Vercel edge region needs KV before multi-instance deploy (covered by `ARCHITECTURE.md:230` deployment checklist).

### 27.23 Full Test Suite

No inflating counts — only Phase 6 real fixes are tested:

- `npx tsx scripts/run-test.mjs` **40/40 PASS** (12 Phase2 PDF/placeholder/completion/profile + 16 Phase4 interview + 12 Phase5 resumeAI/analytics)
- `npx tsx tests/phase4_interview.test.ts` **20/20 PASS** (19 listed + boundary 5000)
- `npx tsx tests/phase5.test.ts` **26/26 PASS** (12 Resume AI + 14 Analytics including public/private + trends)
- **NEW `npx tsx tests/phase6.test.ts` 35/35 PASS:**

  Navigation 2 (routes exist, applications honest), Public/Private 5 (whitelist, 404, URL sanitize, beacon non-blocking, download resilient), Auth/IDOR 4 (derive-from-auth, IDOR job/session, video UUID+duration), Service-role 2 (NEXT_PUBLIC leak 0, guard), Validation 5 (matchRequest, scriptGenerate UUID, interviewAnswer 5000, video magic/empty, analyticsTrends), XSS 1 (no `dangerouslySetInnerHTML`), AI safety 2 (preamble + placeholder regex), RateLimit 3 (threshold block, existence + public view wired), Storage 2 (private buckets + size/magic), Migrations 3 (014 ordered, videos column fix, RLS), Env 1 (no provider import in client), Form UX 1 (disabled), A11y 1 (scope/col), Perf 1 (revokeObjectURL + stopTracks) — `lib/rateLimit.ts:51 downlevelIteration` fixed to `forEach` to pass build, page6:320 env check excludes UI text `GEMINI_API_KEY` mention via `from "@/lib/ai/providers"` pattern.

All previous tests continue passing; strict `npx tsc --noEmit` passes after 6:32 fix.

### 27.24 Final Security Review

Covers `07_SECURITY.md:218` checklist:

- **Authentication:** private routes `auth.getUser()` + `middleware.ts` guard + `(dashboard)/layout.tsx` double-check `redirect("/login")`
- **Authorization:** `user_id=auth.uid()` owner check on every `select|insert|update` (Profile, Resumes, Jobs `getJobById`, Matches `eq user_id`, Scripts/Videos `eq user_id`, PublicProfiles `eq user_id`, Interview 5 tables `eq user_id` + `interview_answer_feedback in (select ...)`, ResumeAI `eq user_id` + job, Analytics `eq user_id` + `in(select…)`), typed `403` on IDOR
- **IDOR:** verified by code audit + test simulation (User A cannot load User B job/session/resume/analytics)
- **XSS:** no `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function`; render via text; safe URL filter
- **CSRF:** same-origin `httpOnly` cookie + `createServerClient` refresh; state-changing routes follow existing model (no extra token needed)
- **SSRF:** no arbitrary URL fetch from user input
- **SQL injection:** no raw SQL string
- **File upload:** `pdfValidation 10MB %PDF + encrypted`, `videoValidation 100MB EBML/ftyp + mime fallback`, storage private `file_size_limit` + `allowed_mime_types`
- **Storage:** private buckets + `createSignedDownloadUrl` TTL 60/300, ownership path `videos/{userId}/{jobId}/{videoId}.webm`, `file_size_bytes` canonical
- **Secrets:** `SUPABASE_SERVICE_ROLE_KEY`/`GEMINI_API_KEY` never `NEXT_PUBLIC_`, server-only guard
- **AI:** preamble + schema validation + score clamp + `[NEEDS_USER]` + server-only key + prompts minimal data
- **Public profile:** whitelist only, no JD/match/interview/ResumeAI/analytics/internal ID leakage
- **Analytics privacy:** aggregates only, `ip_hash` 32 + 512 UA + 1h dedup, no visitor identity

**Remaining limitation honestly documented:** `lib/rateLimit.ts` is in-memory per-instance (fails open) — not yet distributed via KV; sufficient for hardening, replaced before multi-region prod (`ARCHITECTURE.md` deployment checklist).

### 27.25 Final User Flow Walkthrough (Code-Level)

- **New candidate** `Login → Career Profile (upload resume → ReviewExtractedDataSheet staged hydration → PATCH /api/profile commit) → Create/select Job (Video Resume JobForm, duplicate hash 7d) → Match (score/breakdown/talkingPoints) → Script (initial→regenerate/shorten/natural→save) → Record (WebM 180s or upload) → Publish (slug immutable, Publish/Unpublish toggle) → Public /p/[slug] (recruiter view + beacon) → Owner Analytics (Views/Plays/Downloads/Trends)` ✓
- **Interview preparation** `Job (shared) → Interview Coach job picker → Create Session (type/difficulty/count) → Questions (behavioral/technical/mixed, category/difficulty/idealFocus) → Answer (Textarea 1-5000) → AI Feedback (score 0-100 + strengths/weaknesses/improvement/betterAnswer) → Progress (total/answered/avg/strongest/weakest) → Complete → Feedback bento (overall/label/dimensions/aiRecommendation)` ✓
- **Resume improvement** `Resume (resume_versions) → Resume AI (select + optional job) → Analyze (quality 0-100 vs alignment, 5 section scores 0-100 + strengths/issues/recommendations/keywords/jobAlignment + [NEEDS_USER]) → Recommendations (STAR/verb guidance, never fabrication)` ✓
- **Recruiter/public** `Public URL /p/[slug] → Centered name/title → Hero video (300s signed URL inline) → Resume card (Experience/Education/Skills/About) → Actions (Play/Download/LinkedIn/Portfolio safe URLs/Copy)` ✓
- **Owner analytics** `Analytics → Overview 6 KPIs (Views/Downloads/Plays/Applications/Interviews/Analyses) → Engagement rates (videoPlayRate 0-100, resumeDownloadRate 0-100) → Trends (7/30 daily bars + table, privacy-safe aggregates)` ✓

Every major flow has sensible next action — no dead end blank screen.

### 27.26 Final Code Quality

- No `console.log` in production paths (only `console.warn` non-fatal `AnalyticsService.recordEvent failed` and `recordPublicView error` kept as structured server warning)
- No debug/hardcoded data left: dashboard hardcoded Google/Microsoft, 84/78/12 cards all removed; only `Alex Mercer` remains in `lib/ai/providers/mock.ts` + tests as canonical synthetic fixture per `GEMINI.md:84`
- No unused imports after `tsx fix: previewUrlRef` (hook) + `dashboard: remove interviews var` + `rateLimit: downlevelIteration → forEach`
- No secrets logged (grep `GEMINI_API_KEY|SUPABASE_SERVICE_ROLE_KEY` in handlers → 0 hits)
- No internal IDs unnecessarily logged (structured logger `userIdHash` only)

No aggressive refactor of stable Phase 1-5 code.

### 27.27 Final Verification Commands Executed

```bash
npm run build        # Compiled successfully — 31 routes (30 static+dynamic) + Middleware 86.3kB, 3 img warnings pre-existing
npm run lint         # 0 errors, 3 warnings no-img-element
npx tsc --noEmit     # 0 errors (after rateLimit forEach fix)
npx tsx scripts/run-test.mjs        # 40/40
npx tsx tests/phase4_interview.test.ts  # 20/20
npx tsx tests/phase5.test.ts            # 26/26
npx tsx tests/phase6.test.ts            # 35/35 (new)
```

Plus: `git status` (21 modified + 39 untracked incl. 014), `git diff --stat` 3325 +664 lines, `grep service-role|NEXT_PUBLIC|dangerously|TODO` verifications per audit.

### 27.28 Git Check — Per STOP

```
git status
git diff --stat
```

**Do NOT** commit, **Do NOT** `push`, **Do NOT** `supabase db push`, **Do NOT** deploy to Vercel. User reviews diffs before final integration pass — exactly as specified in Phase 6 STOP.

### 27.29 What Was Not Done in Phase 6

Per CRITICAL STOP RULE:

- No `supabase db push` / `supabase db reset` / remote project mutation
- No `git push` / `git commit` auto
- No Vercel/production deployment or production credentials creation
- No Git history alteration
- No billing / payments / chatbot / Python / FFmpeg / unrelated features
- No new Stitch mock invention

Migrations `014` exists repository-only; remote `lvmayqmhtnqdxwoboews` stays untouched until integration pass.

---

## 28. FINAL RULE

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
