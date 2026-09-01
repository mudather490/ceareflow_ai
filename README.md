# CareerFlow AI — Career Copilot / Resume SaaS

> Single-app SaaS where one **Career Profile** powers Video Resume + Public Recruiter Profile, Interview Coach, and Resume AI — with privacy-safe analytics.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS%20%2B%20Storage-green)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Live stack:** Next.js 14 App Router · React 18 · TypeScript `strict` · Tailwind + shadcn/ui · Supabase (Auth/Postgres/RLS/Storage) · Gemini API via swappable provider · Vercel deploy.

---

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
- [AI Providers](#ai-providers)
- [API Routes](#api-routes)
- [Scripts](#scripts)
- [Security](#security)
- [Deployment](#deployment)
- [Docs Index](#docs-index)
- [License](#license)

---

## Features

| Module | What it does | Reuses |
|---|---|---|
| **Career Profile** | Single canonical candidate profile (headline, summary, experiences, education, skills, projects, certs) + resume PDF history (`resume_versions` immutable). | — |
| **Video Resume** | `Match Job` (JD → alignment score + breakdown) → `Script` (4-section teleprompter) → `MediaRecorder` video → publish `public_profiles` ` /p/[slug]` | `jobs` deduped by `sha256(title|company|JD)`, `resume_versions` |
| **Public Recruiter Profile** | Minimal shareable page `/p/[slug]` — hero video + resume card, signed URLs (video 300s / resume 60s), LinkedIn/portfolio safe URLs, analytics beacon | `videos` / `resume_versions` private buckets |
| **Interview Coach** | Job picker → AI question generation (behavioral/technical/mixed, 3–15 Qs) → answer loop → per-answer scored feedback + session bento | `jobs` + Career Profile, no JD re-paste |
| **Resume AI** | Resume version + optional Job → overall score + 5 section scores + strengths/issues/recommendations/keywords + jobAlignment | `jobs`, `resume_versions`, Career Profile |
| **Analytics** | `profile_view` / `resume_download` / `video_play` + app events, 1h IP-hash dedup, device/referrer bucket, owner-only trends (7/30d) | `public_profile_views` + `analytics_events` |
| **My Applications** | Cross-module `jobs` table explorer (source, created, actions) | `jobs` |

All modules share `JobService` dedup, `CareerProfileService` truth, and `AnalyticsService` privacy (no raw IP, `sha256(ip|dailySalt|profileId)`).

---

## Architecture

```
Browser
  ├─ Recruiter → GET /p/[slug] (public, anon, 300s revalidate) + POST /api/public/:slug/view (beacon)
  └─ Candidate → /dashboard /career-profile /video-resume/* /interview/* /resume-ai /analytics (auth shell)
        │
        ▼
Next.js App Router (RSC + client islands: MediaRecorder, beacon, clipboard)
  ├─ Route Handlers (/api/*) → zod validation → service → Supabase
  └─ AI Service Layer (interfaces) → GeminiProvider / MockProvider → Gemini API
        │
        ▼
Supabase — Postgres (RLS per table, user_id=auth.uid()) + Storage (3 private buckets) + Auth (PKCE/Google)
        │
        ▼
Vercel Edge
```

**Key invariants:** one `career_profiles` per user, `resume_versions` append-only, `public_profiles.slug` `nanoid(10)` immutable, every FK carries `user_id` for RLS shortcut, public reads whitelist-only.

Full spec: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`docs/architecture/`](./docs/architecture/)

---

## Project Structure

```
.
├── app/                          # Next.js App Router
│   ├── (auth)/login,signup       # Auth pages (email + Google OAuth)
│   ├── (dashboard)/              # Auth-gated shell (SideNav + TopNav)
│   │   ├── dashboard/            # Bento: readiness, actions, recent jobs
│   │   ├── career-profile/       # Profile + ResumeUploadModal + Review sheet
│   │   ├── video-resume/         # match/[jobId] / script/[jobId] / publish/[jobId]
│   │   ├── interview/            # [sessionId] live + results
│   │   ├── resume-ai/            # Version + job picker → analyzer
│   │   ├── analytics/            # Owner aggregates + trends chart
│   │   ├── applications/         # Jobs explorer (shared table)
│   │   └── onboarding/           # First-run upload
│   ├── p/[slug]/                 # Public recruiter profile (anon, minimal)
│   ├── api/                      # Route handlers (auth + validation + rate-limit)
│   │   ├── profile/              # GET/PATCH career profile, resume upload
│   │   ├── video-resume/         # match / script / video
│   │   ├── interview/            # sessions, questions, answers
│   │   ├── resume-ai/            # analyze
│   │   ├── analytics/            # overview / trends / events
│   │   └── public/[slug]/        # view / resume-download / video-play (service-role)
│   └── auth/callback,signout     # Supabase Auth handlers
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── nav/                      # SideNavBar, TopNavBar, RecruiterNav
│   ├── career-profile/           # Upload modal, Review sheet, Edit modal
│   ├── video-resume/             # Match, Script editor, Recorder
│   ├── interview/                # Setup, Session, Feedback bento
│   ├── resume-ai/                # Analyzer client, Score ring
│   ├── analytics/                # AnalyticsClient, KPI cards
│   └── public-profile/           # ViewBeacon, ResumeDownloadButton, CopyLinkButton
├── lib/
│   ├── supabase/                 # server.ts (auth) / client.ts (browser) / service.ts (service-role)
│   ├── services/                 # careerProfile, job, videoResume, interview, resumeAi, analytics
│   ├── ai/                       # provider.ts + services/* + providers/gemini|mock + safety/nonFabrication
│   ├── validation/               # zod schemas (profile, jobs, videoResume, interviews, resumeAi, analytics, auth)
│   ├── storage/                  # resume.ts / video.ts / signedUrl.ts + pdf/videoValidation
│   ├── types/                    # DTOs + interview types
│   └── rateLimit.ts              # in-memory, fails-open
├── hooks/                        # useMediaRecorder (MediaRecorder + revokeObjectURL)
├── supabase/migrations/          # 001…014 ordered migrations (RLS, storage, video, analytics, interviews, fixes)
├── docs/
│   ├── architecture/             # 01…07 system contracts
│   ├── product/                  # overview, flows, features, IA
│   ├── modules/                  # per-module specs
│   ├── implementation/           # phase checklists
│   └── decisions/ADR-00*         # frozen ADRs
├── tests/                        # phase4_interview, phase5, phase6 integration
├── scripts/run-test.mjs          # main test runner (tsx)
├── stitch-designs/               # Stitch HTML prototypes (reference, 14 variants)
├── middleware.ts                 # session refresh + protected route guard + open-redirect sanitizing
├── next.config.mjs               # security headers (CSP, HSTS-style)
├── tailwind.config.ts            # DESIGN_SYSTEM tokens
└── .env.example                  # env template (no secrets)
```

---

## Getting Started

### Prerequisites
- Node.js 20+ · npm 10+
- Supabase project (cloud or local) with Postgres + Storage + Auth enabled
- Gemini API key (optional — mock provider works offline)

### 1) Clone & install

```bash
git clone https://github.com/mudather490/ceareflow_ai.git
cd ceareflow_ai   # or creare_ai locally
npm install
```

### 2) Environment

```bash
cp .env.example .env.local
# edit .env.local:
# NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>
# SUPABASE_SERVICE_ROLE_KEY=<service_role>   # server-only, never NEXT_PUBLIC_
# NEXT_PUBLIC_APP_URL=http://localhost:3000  # prod: https://<domain>
# GEMINI_API_KEY=<gemini-key>                # or dummy → mock fallback
# GEMINI_MODEL=gemini-1.5-pro
# AI_PROVIDER=gemini                         # or mock
```

`lib/env.ts` audits `NEXT_PUBLIC_` prefix leakage at boot; `lib/ai/provider.ts` falls back to `MockProvider` when key is missing/dummy or `NODE_ENV=test`.

### 3) Database & Storage

```bash
# Apply migrations in order (Supabase CLI or Dashboard SQL editor)
# supabase/migrations/001_init_users_and_trigger.sql
# …
# supabase/migrations/014_phase6_completion_fixes.sql
```

Buckets (private, RLS `foldername(name)[1]=auth.uid()`):
- `resumes` — 10 MB, `application/pdf`
- `videos` — 100 MB, `video/webm,video/mp4`
- `interview-answers` — 100 MB

Enable Google OAuth in Supabase Auth → set Site URL to `NEXT_PUBLIC_APP_URL` and add redirect `/**/auth/callback`.

### 4) Run

```bash
npm run dev      # http://localhost:3000
npm run lint     # next lint (no-img-element warnings expected)
npm test         # tsx scripts/run-test.mjs (40 tests)
npm run build    # production build + static generation
npm start        # serve built app
```

---

## Environment Variables

| Variable | Scope | Required | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client | yes | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | yes | anon, RLS-scoped |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | yes | beacon + signed URLs only; throw if `window` |
| `NEXT_PUBLIC_APP_URL` | client | yes | `http://localhost:3000` locally, prod domain otherwise |
| `GEMINI_API_KEY` | server-only | yes* | *mock fallback when missing/dummy (`dummy`, `your-`, `<20 chars`) or `NODE_ENV=test` |
| `GEMINI_MODEL` | server-only | no | default `gemini-1.5-pro` |
| `AI_PROVIDER` | server-only | no | `gemini` (default) or `mock` |

Never commit `.env.local`. See `.env.example`.

---

## Supabase Setup

1. Create project → copy URL/anon/service keys.
2. Run migrations `001`→`014` (SQL editor, ordered).
3. Storage → create private buckets above.
4. Auth → enable Email + Google (OAuth client → redirect `https://<domain>/auth/callback`).
5. RLS already enabled per migration `009_rls_policies.sql`; verify `public_profiles` public view is whitelist-only (service-role minted signed URLs, not public objects).

---

## AI Providers

- Interface `lib/ai/provider.ts:getAIProvider()` → `ResumeParser`, `JobParser`, `ResumeJobMatcher`, `ScriptGenerator`, `InterviewQuestionGenerator/AnswerEvaluator`, `ResumeAnalyzer`.
- `GeminiProvider` (`lib/ai/providers/gemini.ts`) adds `NON_FABRICATION_PREAMBLE` (`[NEEDS_USER: ...]`) and Zod-parses every LLM JSON.
- `MockProvider` (`lib/ai/providers/mock.ts`) deterministic Alex Mercer fixture, used for CI/tests and when Gemini key dummy.
- Components never import `lib/ai/providers/*` (eslint `no-restricted-imports`).

---

## API Routes

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET/PATCH | `/api/profile` | user | Canonical Career Profile |
| POST | `/api/profile/resume` | user | PDF upload → parse staging (no auto-commit) |
| GET | `/api/profile/resume-versions` | user | Immutable history |
| POST | `/api/video-resume/match` | user | Job upsert + matcher (10/hr) |
| GET/POST/PATCH | `/api/video-resume/script` | user | Script generate/shorten/natural/edit |
| POST | `/api/video-resume/video` | user | Video upload → draft `public_profiles` |
| GET/PATCH | `/api/public-profile/[id]` | owner | Publish toggle |
| GET | `/api/public/[slug]` | anon | Whitelisted recruiter view |
| POST | `/api/public/[slug]/view` | anon | Beacon (60/min, 1h dedup) |
| POST | `/api/public/[slug]/resume-download` `video-play` | anon | CTA tracking |
| POST/GET | `/api/interviews`, `/api/interview/sessions` | user | Interview sessions (6/hr) |
| GET/PATCH | `/api/interviews/[id]`, `/api/interview/sessions/[id]` | owner+uuid | Session detail/update |
| POST | `/api/interview/answers`, `/api/interview/questions` | owner+uuid | Answer submit + feedback |
| POST | `/api/resume-ai/analyze` | owner+uuid | Analyzer (10/hr, Zod output) |
| POST | `/api/analytics/events` | owner | Auth event (owner-checked) |
| GET | `/api/analytics/overview`, `/trends` | owner | Aggregates |

Envelope: `{ data, error: { code, message, field? } }` via `lib/api/response.ts`.

---

## Scripts

```bash
npm run dev          # next dev
npm run build        # next build (collects 18 routes, middleware 86kB)
npm run lint         # next lint
npm test             # tsx scripts/run-test.mjs
npm run test:phase6  # tsx tests/phase6.test.ts
```

Tests cover PDF magic/encryption 10MB, `hasNeedsUserPlaceholder`, `MockProvider` schema, completion score, `interviewSetup/Answer` 5000 boundary, `resumeAnalyzerResult` jobAlignment, analytics enum, IDOR simulation, RLS, public whitelist, beacon keepalive, video WebM magic.

---

## Security

- Auth: `middleware.ts` refreshes session per-request, protects `/dashboard|career-profile|video-resume|interview|resume-ai|analytics|settings|onboarding` → `/login?next=`, safe-next sanitized (`/`, no `//`/`://`).
- RLS double-check: every handler `auth.getUser()` + `eq(user_id,user.id)` + Postgres `user_id=auth.uid()` policies; service-role only in `app/api/public/*`, `lib/storage/signedUrl.ts`, `videoResumeService.getPublicProfileBySlug` (published only), `analyticsService.recordPublicView`.
- Storage: private buckets, `createSignedUrl` TTL 60s/300s service-minted, never public objects.
- Upload: PDF header `0x25 0x50 0x44 0x46`, `Max 10MB`, `/Encrypt` rejection, video `EBML 0x1A45DFA3` or `ftyp`, `100MB`.
- AI: no key in bundle (`GEMINI_API_KEY` server-only guard `typeof window`), anti-fabrication preamble, Zod output parse, resume text untrusted.
- Headers: `next.config.mjs` `X-Content-Type-Options:nosniff`, `X-Frame-Options:SAMEORIGIN`, `Referrer-Policy:strict-origin-when-cross-origin`, `Permissions-Policy:camera=(self),microphone=(self)`, CSP (`self` + `unsafe-inline` for Next/Tailwind + `*.supabase.co` media/connect + `generativelanguage.googleapis.com`).
- No `dangerouslySetInnerHTML`; `isSafeHttpUrl` for LinkedIn/portfolio; `rateLimit` is in-memory fails-open.

---

## Deployment

**Vercel (recommended):**
1. Push `main` → Vercel imports Next.js project.
2. Env: set `NEXT_PUBLIC_*` public + `SUPABASE_SERVICE_ROLE_KEY`/`GEMINI_API_KEY` secret (no `NEXT_PUBLIC_` prefix) + `NEXT_PUBLIC_APP_URL=https://<domain>`.
3. Build: `npm run build` (already validated). No extra start command.
4. Supabase: same region as Vercel primary region; Auth Site URL = prod domain; OAuth redirect = `https://<domain>/auth/callback`.

Checklists: `docs/implementation/06_DEPLOYMENT.md`.

---

## Docs Index

- `ARCHITECTURE.md` — executive architecture (source of truth)
- `DESIGN_SYSTEM.md` — Tailwind tokens audit of `stitch-designs/`
- `PRODUCT_SPEC.md` — condensed product spec
- `docs/product/01_…` → `04_` — vision, flows, features, IA
- `docs/modules/01_VIDEO_RESUME.md` … `05_RESUME_AI.md`
- `docs/architecture/01_SYSTEM_ARCHITECTURE.md` … `07_SECURITY.md`
- `docs/implementation/01_PROJECT_FOUNDATION.md` … `06_DEPLOYMENT.md`
- `docs/decisions/ADR-00*.md` — frozen ADRs
- `docs/PROJECT_CONTINUITY.md` — phase continuity log

---

## License

MIT — see `LICENSE` (add if missing). Replace `LICENSE` year/holder as needed before public release.
