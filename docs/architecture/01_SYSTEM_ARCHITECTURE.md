# System Architecture — CareerFlow AI

> Platform-wide architecture: module boundaries, shared services, frontend/backend split, auth, storage, AI layer, and deployment topology. Conceptually correct before any code exists.

---

## 1. System Overview

CareerFlow AI is **one Next.js 14+ App Router SaaS** with a **thin API layer** (Route Handlers) in front of **Supabase** (Postgres + Auth + Storage) and an **abstract AI service layer**. No separate backend service, no duplicate auth, no per-module auth. Verified via directory inspection (`E:\creare_ai` contains only `dising stitch/` — i.e. no pre-existing application to conflict with this choice — see `docs/decisions/ADR-001-TECHNOLOGY-STACK.md:1`).

### Block diagram (ASCII)

```
                                ┌─────────────────────┐
                 ① Public       │    Recruiter         │  GET /p/[slug]
  Recruiter ─────────────────────►  (Recruiter Shell)   │  no auth, signed URL video/resume
    Browser      unauth         └──────────┬──────────┘
                                          │ SSR + beacon
                                          │ POST /api/public/:slug/view
                      ┌───────────────────┤
                      │                   │
            ┌─────────▼─────────┐  ┌──────▼──────────┐
            │   Landing (/)     │  │  Auth (/login,  │
            │  Marketing shell  │  │   /signup)      │
            └─────────┬─────────┘  └──────┬──────────┘
                      │                   │ Google OAuth / email
                      └──────────┬────────┘
                                 │ Supabase Auth
                                 │ (httpOnly cookie, RLS session)
                                 ▼
                    ┌──────────────────────────────┐
                    │  Next.js App Router          │
                    │  (React 18 + TypeScript)     │
                    │  ┌────────────────────────┐  │
                    │  │ (dashboard) layout     │  │   Authenticated Shell
                    │  │ Sidebar + TopNav       │  │   (Sidebar w-64, mobile top)
                    │  │ /dashboard             │  │
                    │  │ /career-profile        │  │
                    │  │ /video-resume/*        │  │
                    │  │ /interview/*           │  │
                    │  │ /resume-ai/*           │  │
                    │  │ /applications          │  │
                    │  │ /analytics             │  │
                    │  │ /settings              │  │
                    │  └──────────┬─────────────┘  │
                    │             │                 │
                    │  ┌──────────▼─────────────┐  │   API Layer
                    │  │ Route Handlers         │  │   /api/profile
                    │  │ /api/video-resume/*    │  │   /api/public/*
                    │  │ /api/interview/*       │  │
                    │  │ /api/resume-ai/*       │  │
                    │  └──────────┬─────────────┘  │
                    │             │                 │
                    │  ┌──────────▼─────────────┐  │   Application Services
                    │  │ CareerProfileService   │  │
                    │  │ JobService             │  │
                    │  │ VideoService           │  │
                    │  │ PublicProfileService   │  │
                    │  │ InterviewService       │  │
                    │  │ ResumeAIService        │  │
                    │  └──────────┬─────────────┘  │
                    │             │                 │
                    │  ┌──────────▼─────────────┐  │   AI Service Layer
                    │  │ ResumeParser            │  │   (abstraction, not UI-coupled)
                    │  │ JobParser               │  │
                    │  │ ResumeJobMatcher        │  │
                    │  │ ScriptGenerator         │  │
                    │  │ InterviewQ/F/U/Fback    │  │
                    │  │ ResumeAnalyzer          │  │
                    │  └──────────┬─────────────┘  │
                    └─────────────┼─────────────────┘
                                  │ adapter
                         ┌────────▼─────────┐
                         │  AI Provider     │   Gemini API (default)
                         │  (swappable)     │   key server-only
                         └──────────────────┘

                    ┌──────────────────────────────┐
                    │        Supabase              │
                    │  ┌──────────────┐            │
                    │  │ Postgres RLS │◄───────────┤ From Route Handlers
                    │  │ (20+ tables) │            │ (service role or auth-scoped client)
                    │  └──────┬───────┘            │
                    │         │                    │
                    │  ┌──────▼───────┐            │
                    │  │ Storage      │◄───────────┤ resumes | videos | interview-answers
                    │  │ (3 buckets)  │            │ private buckets + signed URLs
                    │  └──────┬───────┘            │
                    │         │                    │
                    │  ┌──────▼───────┐            │
                    │  │ Auth         │  ◄─────────┤ Next.js Auth Helpers manage cookies
                    │  └──────────────┘            │
                    └──────────────────────────────┘

                    ┌──────────────────┐
                    │   Analytics      │
                    │ public_profile_  │
                    │ views (+ agg.)   │  Beacon → Service-role insert → Owner queries via RLS
                    └──────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Stack

- **Next.js 14+ App Router** (RSC by default; server components for all data reads, client islands only for MediaRecorder, clipboard, beacon).
- **React 18 + TypeScript strict** (`strictNullChecks`, `noImplicitAny`).
- **Tailwind CSS** + **shadcn/ui** component primitives (Button, Card, Badge, Input, Dialog, Tabs). Stitch mocks already use Tailwind — no new styling system.
- **Design tokens** mapped from `DESIGN.md` → `tailwind.config.mjs` (colors, rounded, spacing, fonts). Verified token list is the canonical palette — see `DESIGN_SYSTEM.md:1`.
- **Forms:** `react-hook-form` + `zod` validation (client + server share the same `zod` schemas in `lib/validation/`).
- **Data fetching (RSC):** `supabase.createServerClient` in each `page.tsx`; no client-side `useEffect` fetch for owned data.

### 2.2 Directory structure (planned)

```
app/
  (marketing)/page.tsx                  → Landing
  (auth)/login/page.tsx, signup/page.tsx
  (dashboard)/                          → shared layout with SideNav
    layout.tsx
    dashboard/page.tsx
    career-profile/page.tsx
    video-resume/page.tsx, match/[id]/page.tsx, script/[id]/page.tsx, publish/[id]/page.tsx
    interview/page.tsx, [interviewId]/live/page.tsx, [interviewId]/results/page.tsx
    resume-ai/page.tsx, resume-ai/[analysisId]/page.tsx
    applications/page.tsx
    analytics/page.tsx, analytics/[id]/page.tsx
    settings/page.tsx
  p/[slug]/page.tsx                     → Public recruiter (isolated shell)
  api/
    profile/..., video-resume/..., public/..., interviews/..., resume-ai/...

components/
  ui/         (shadcn primitives)
  nav/        (SideNavBar, TopNavBar, RecruiterNav, MobileDrawer)
  career-profile/  (ProfileCard, ExperienceTimeline, SkillsChips, ...)
  video-resume/    (MatchScoreRing, SkillsBreakdown, ScriptPanel, VideoRecorder, ...)
  interview/       (SetupCard, QuestionCard, VideoFeed, ResultsBento, ...)
  public-profile/  (HeroVideo, ResumeCard, ViewBeacon)
  shared/     (LoadingSkeletons, EmptyStates, ErrorStates)

lib/
  supabase/{client,server,service}.ts
  validation/ (zod schemas)
  ai/ (service interfaces + providers/gemini)
  storage/ (bucket helpers + signed URLs)
  analytics/ (beacon + query helpers)

hooks/  (useMediaRecorder — small, isolated)
```

### 2.3 Shared domain invariant

`CareerProfileProvider` (optional context near dashboard shell) fetches `careerProfile` once per navigation tree and memoizes; child modules consume via prop drilling or server prop (preferred). Never fetch the same row three times for three modules.

---

## 3. Backend Architecture (Next.js Route Handlers)

### 3.1 Philosophy

No standalone backend. Each `app/api/**/route.ts` is a thin validator → service → DB/Storage → response layer. Business logic lives in `lib/services/*` and `lib/ai/*` — **never inside the handler body beyond validation**.

```
UI ── fetch ──► Route Handler ──► Application Service ──► AI Service ──► AI Provider
                         └──────► Supabase (Postgres / Storage / Auth)
```

All handlers:
- enforce `auth.getUser()` on auth-gated routes; return `401` with no private data leakage on failure;
- share `zod` schemas with the client (DRY);
- enforce rate-limit before LLM call;
- log structured request id + latency.

### 3.2 Auth boundary

- Next.js `middleware.ts` refreshes the Supabase session on every request (using `@supabase/ssr`).
- `lib/supabase/server.ts` creates a per-request auth-scoped client; `lib/supabase/service.ts` creates the service-role client for the single narrow public-beacon write.
- No handler trusts a `userId` from the client body — it is always derived from `auth.getUser()`.

---

## 4. Database Architecture (overview; DDL in 02)

- **Engine:** Postgres (Supabase managed); **Access:** Row Level Security on every table with `user_id = auth.uid()` (except the single anon-beacon table policy).
- **Versioning model:** `resumes` (logical document) → `resume_versions` (immutable snapshots, `versionNumber` monotonic per `resumeId`).
- **Job as first-class:** `jobs` is a first-class entry owned by `user_id`, NOT nested under videos — reused by Interview and Resume AI.
- **Slug immutability:** `public_profiles.slug` generated once (nanoid 10), unique global, not updated even when video changes — share link stability.

---

## 5. Storage Architecture (overview; full in 05)

| Bucket | Visibility | Objects | Notes |
|---|---|---|---|
| `resumes` | private | `resumes/{userId}/{resumeVersionId}.pdf` | Largest number of objects; served via short-lived signed URL for View/Download |
| `videos` | private | `videos/{userId}/{jobId}/{videoId}.webm` | Served via signed URL for inline playback on public page (300s TTL) |
| `interview-answers` | private | `interview-answers/{userId}/{interviewId}/{questionId}.webm` | Never public; owner + service role only |

All buckets have `fileSizeLimit` configured at the bucket level + app validation.

---

## 6. AI Architecture (overview; full in 04)

```
UI
 │  (never calls provider)
 │fetch
 ▼
Application Service (e.g. VideoService.matchResumeToJob)
 │  calls
 ▼
AI Service Interface (e.g. ResumeJobMatcher: async match(args) => JobMatch)
 │  delegates to
 ▼
GeminiProvider (implements interface via @google/generative-ai)
 │  HTTP (server-only API key via env)
 ▼
Gemini API
```

- Contracts are pure `async` functions returning typed DTOs; handlers never construct prompts inline.
- All 9 services share a single prompt safety middleware (anti-fabrication + output schema validation).
- Swapping to OpenAI / Azure OpenAI requires a new `OpenAIProvider` class implementing the same interfaces.

---

## 7. Analytics Architecture (overview; full in 06)

Public beacon (`POST /api/public/:slug/view`) uses the **service_role** client to insert into `public_profile_views`. Owner reads are via auth-scoped client through RLS. No third-party tracker.

---

## 8. Module Boundaries & Shared Services

### The central dependency graph

```
             career_profiles   (shared truth)
                    │
      ┌─────────────┼─────────────┬──────────────┐
      ▼             ▼             ▼              ▼
  VideoService  InterviewService ResumeAIService PublicProfile/
      │              │              │            Analytics
      └──────────────┴──────────────┘
                     │ uses
                     ▼
               JobService (shared)
               Job ↔ JobMatch ↔ Video ↔ PublicProfile
```

**Shared services (invariants):**

- `CareerProfileService` — owns reads/writes to `career_profiles` + children; all modules call it, not direct SQL.
- `JobService` — owns deduplication + lifecycle of `jobs`; used by Video, Interview, and Resume AI.
- `StorageService` — wraps Supabase Storage + signed URL generation; buckets not addressed directly.
- `AnalyticsService` — owns view beacon protocol + aggregation queries.

**Module-local services:**

- `VideoService` also owns `scripts` + video lifecycle
- `InterviewService` owns `interviews` + Q/A + feedback orchestration
- `ResumeAIService` owns analysis + suggestion lifecycle

No service imports another service's table without going through the owning service's public method (enforced in code via barrel file + eslint `no-restricted-imports` in Phase 7).

---

## 9. Security Boundaries

See also `docs/architecture/07_SECURITY.md:1`.

```
┌──────────────────────────────────────────────┐
│  Public boundary (anon)                      │
│  GET /p/[slug]        — whitelisted view only│
│  POST /api/public/:slug/view — insert only  │
├──────────────────────────────────────────────┤
│  Authenticated boundary (RLS)                │
│  Every /api/profile, /api/video-resume, ...  │
│  needs auth.getUser() + row-level RLS        │
├──────────────────────────────────────────────┤
│  Server-only boundary (env key)              │
│  Gemini API key, service_role, signed URL    │
│  minting — never in client bundle            │
└──────────────────────────────────────────────┘
```

IDOR surface is sealed because:
- `slug` is not `id`; public reads are view-filtered (no `select *`);
- all auth writes re-derive `userId` server-side.

---

## 10. Deployment Architecture

```
Developer → push main → GitHub → Vercel (Build: Next.js) → Edge

Vercel env:  NEXT_PUBLIC_SUPABASE_URL     (public)
             NEXT_PUBLIC_SUPABASE_ANON_KEY (public)
             SUPABASE_SERVICE_ROLE_KEY     (secret) — used only at build/fetch for beacon
             GEMINI_API_KEY                (secret) — provider secret
             NEXT_PUBLIC_APP_URL           (preview vs prod)

Supabase cloud: Postgres + Storage (same region as Vercel primary region, e.g. iad1)
No custom CDN required — Storage signed URLs served via Supabase CDN.
No Python service required in MVP (future option: Vercel Functions Python runtime or Fly.io — documented in Phase 9).
```

**Domains:**

- App: `app.careerflow.ai` → Vercel deployment.
- Recruiter public profile: **same domain** path `/p/[slug]` — no subdomain split (avoids CORS and keeps OG tags single-domain).
- Supabase: project ref `*.supabase.co`.

---

## 11. Failure Modes

| Failure | Mitigation |
|---|---|
| Gemini API rate limit / outage | Exponential backoff per service; user-facing toast "AI is busy — retry in 15s"; no silent fallbacks that fabricate data |
| Storage down | Request queued via UI retry toast; video blob kept client-side until ack |
| Postgres down / RLS misconfig | Handlers 500 with `requestId`; Sentry-notified; public page falls back to edge cache (5 min `stale-while-revalidate`) |
| Auth session expired mid-POST | Handler returns `401` with `{ needsAuth:true }`; client redirects to `/login?next=...` without losing form draft (store in `sessionStorage`) |

