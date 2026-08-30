# ARCHITECTURE — CareerFlow AI (Source of Truth)

> One-document executive view of the platform architecture. For the deep specs, follow the links per section to the `docs/architecture/*` bundle (which is the contract that implementation PRs are checked against).

---

## 1. System Overview

**CareerFlow AI** is a single authenticated SaaS — not three apps — that shares one **Career Profile**, one **resume history**, one **Job** table, and one **AI service abstraction** across:

- **Video Resume + Public Recruiter Profile**
- **AI Interview Coach**
- **AI Resume Improvement**

The public recruiter view (`/p/[slug]`) is the only unauthenticated surface; everything else is auth-gated, RLS-scoped, and handler-isolated.

```
                                        Browser
                                          │
                          ┌───────────────┼────────────────┐
                          │  Next.js App Router (React 18) │
                          │  TS + Tailwind + shadcn/ui     │
  Recruiter ──► GET /p/[slug] (public, minimal, fast)     ──┤
           ──► POST /p/:slug/view (beacon, anon insert)    │
  Candidate ──► GET /dashboard … GET /video-resume … etc. ──┤ auth shell (SideNav + TopNav)
                          │  Route Handlers (/api/*)       │
                          │  Application Services          │
                          │  AI Service Layer (interfaces) │
                          └───────────────┼────────────────┘
                                          │ adapters
                                    Gemini API (swappable)
                                          │
                          ┌───────────────┼────────────────┐
                          │  Supabase                    │
                          │  Postgres + RLS              │
                          │  Storage (3 private buckets) │
                          │  Auth (PKCE / Google)        │
                          └──────────────────────────────┘
                                      Vercel deploy
```

---

## 2. Frontend

- **Next.js 14+ App Router + React 18 + TypeScript `strict`.** RSC for data loads; client islands only for `MediaRecorder`, clipboard, and the view beacon.
- **Tailwind + shadcn/ui** using the exact `DESIGN.md` tokens (`surface`, `secondary`, `outline-variant`, typography sizes, rounded, spacing) — every Stitch `code.html` class name remains valid by design.
- **Shared validation** (`zod`): `lib/validation/*` schemas run in forms (`react-hook-form` + `zodResolver`) *and* in Route Handlers.

**Route tree (essentials):**

| Group | Key routes | Shell |
|---|---|---|
| Public | `/`, `/login`, `/signup`, `/p/[slug]` | Marketing or Auth centered |
| Authenticated | `/dashboard`, `/career-profile`, `/video-resume/*`, `/interview/*`, `/resume-ai/*`, `/applications`, `/analytics`, `/settings` | `(dashboard)/layout.tsx` → fixed SideNav (`w-64`) + TopNav mobile |

Detailed sitemap, nav shell specs, and stepper compositions: `docs/product/04_INFORMATION_ARCHITECTURE.md:1` and `docs/implementation/01_PROJECT_FOUNDATION.md:1`.

---

## 3. Backend (Route Handlers)

Next.js Route Handlers are the only server entry point (`app/api/**/route.ts`):

```
UI ── fetch ──► Route Handler ──► Application Service ──► AI Service ──► Provider ──► Gemini API
                         └─────► Supabase (Postgres / Storage / Auth)
```

All handlers:
- Derive `userId` from `auth.getUser()` (never from body) — `docs/architecture/03_API_ARCHITECTURE.md:1`.
- Share `zod` validation with the form (no drift).
- Gate with rate limits *before* invoking LLM (matrix in `03_API_ARCHITECTURE.md:1`).
- Return `{ data, error }` envelope with `ApiError.code` (`VALIDATION_ERROR … AI_UNAVAILABLE`).

Only `GET /api/public/:slug` + `POST /api/public/:slug/view` touch the `service_role` client (to whitelisting + beacon insert). All other handlers use the auth-scoped client.

---

## 4. Database

**20+ tables in Postgres (Supabase) + RLS on every table with `user_id = auth.uid()`.** The conceptual schema, indexes, and migration order (`001…010`) are documented in `docs/architecture/02_DATABASE_SCHEMA.md:1`.

```
auth.users
   │
   ▼  trigger
 users ──► career_profiles ──► experiences / education / skills / projects / certs
   │
   ├─► resumes ──► resume_versions (immutable history)
   │
   ├─► jobs ──► job_matches ─┐
   │     │                   ├─► videos ──► public_profiles ──► public_profile_views
   │     │                   └─► scripts
   │     │
   │     ├─► interviews ──► questions / answers / feedback
   │     └─► resume_analyses ──► resume_suggestions
```

Invariants (gated by CI):

1. One `career_profiles` per `user_id` (`unique`).
2. `resume_versions` are immutable (append-only `INSERT`).
3. `public_profiles.slug` is `nanoid10` unique and immutable; `is_published` toggles with no history side-effect.
4. Every FK row carries redundant `user_id` for RLS short-circuit.
5. `public_profiles` public reads use a **whitelisting view** — not `select *` (`docs/architecture/07_SECURITY.md:1` §3).

---

## 5. Storage

| Bucket | Objects | Caps | TTL on signed URL |
|---|---|---|---|
| `resumes` | `resumes/{userId}/{uuid}.pdf` | 10 MB | 60 s |
| `videos` | `videos/{userId}/{jobId}/{uuid}.webm` | 100 MB, 180 s | 300 s |
| `interview-answers` | `interview-answers/{userId}/{interviewId}/{questionId}.webm` | 100 MB/answer | 300 s (owner only) |

All buckets **private**, storage RLS (`auth.uid() = (storage.foldername(name))[1]`), filenames never trust client-supplied strings — see full MediaRecorder capture lifecycle + fallback behavior in `docs/architecture/05_STORAGE_AND_VIDEO.md:1`.

---

## 6. AI

```
UI ─❌─► provider              (forbidden)
UI ──► Route Handler ──► Application Service ──► AI Service interface ──► Provider (Gemini default)
                                                  │
                                             MockProvider (tests / CI offline)
```

9 services (`ResumeParser`, `JobParser`, `ResumeJobMatcher`, `ScriptGenerator`, `Interview*{Question,Followup,Feedback}`, `ResumeAnalyzer/Improvement`) — typed interfaces, shared `zod` output schemas, **anti-fabrication preamble** (`[NEEDS_USER: …]` insertion when evidence missing) + validator. Swapping to OpenAI/Azure needs exactly one new `Provider` file (`docs/architecture/04_AI_ARCHITECTURE.md:1` + `docs/decisions/ADR-003-AI-SERVICE-LAYER.md:1`).

No chat widget, no public prompt, no AI key in browser bundle.

---

## 7. Authentication

- **Supabase Auth** (PKCE), Google OAuth via `/auth/callback`, `httpOnly` cookie managed by `@supabase/ssr` + `middleware.ts`.
- Auth-gated routes (`/dashboard`, `/career-profile`, `/video-resume/*`, `/interview/*`, `/resume-ai/*`, `/analytics*`, `/settings`) redirect to `login` when `!user`; public pages bypass.
- **RLS** doubles handler checks: even if a handler forgets the user-id predicate, Postgres still denies. No per-module auth — there is one `users` row (`ADR-002`).

---

## 8. Analytics

Public beacon: `GET /p/[slug]` mounts `ViewBeacon` → `POST /api/public/:slug/view` (`service_role` insert into `public_profile_views` → aggregated to `ByDay`/`ByDevice`/`ByReferrer` for `GET /analytics?profileId=`).

- No cookie, no third-party tracker.
- `ip_hash = sha256(ip + dailySalt + profileId)` — never raw IP; dedup window 1 h.
- Private aggregates (`GET /analytics*`) behind RLS (`public_profile_id in (select id … where user_id = auth.uid())`) — see `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:1` + `docs/modules/03_PUBLIC_ANALYTICS.md:1`.

---

## 9. Module Boundaries

```
                        career_profiles (truth)  ← single owner, single writes bearer
                               │
            ┌──────────────────┼───────────────────┐
            ▼                  ▼                   ▼
      VideoService    InterviewService       ResumeAIService
          │                │                   │
          └─────┬──── JobService (dedup) ────┘
                │  supports: create, reuse, list
                ▼
   public_profiles + public_profile_views
```

Share rules:

- `CareerProfileService`, `JobService`, `StorageService`, `AnalyticsService` are **shared** and all modules delegate to them (no per-module `INSERT` fork).
- Each module also owns local tables (`scripts`/`videos` vs `interviews` vs `resume_analyses`) but never reads another service's table except through the owning service's public method (enforced via lint in phase 8).

---

## 10. Shared Services & Cross-Cutting Concerns

| Service | Owns | Consumed by |
|---|---|---|
| `CareerProfileService` | reads/writes profile + children | all modules, Dashboard |
| `JobService` | creation + dedup (`description_hash`) + listing | Video Resume, Interview, Resume AI, `GET /applications` |
| `StorageService` | Supabase Storage + short-lived signed URL minting | Profile uploads, Video prompts, Interview answers |
| `AnalyticsService` | view beacon protocol + time-series & breakdown queries | `/p/[slug]` beacon, `GET /analytics*` |

---

## 11. Data Flow Illustrated

```
User uploads PDF ──► PDF stored (resumes) ──► LLM parses ──► Career Profile rows
         │
User creates Job (title+company+JD) ──► Job stored ──► LLM matcher ──► job_matches (score, breakdown)
         │
User opens Script ──► LLM generates script (anti-fabrication) ──► scripts
         │
User records video ──► webm blob stored (videos) ──► public_profiles draft (slug)
         │
User publishes ──► is_published=true ──► share link /p/{slug}
         │
Recruiter GET /p/{slug} ──► SSR whitelisted view + signed URLs (video/resume) ──► fire-and-forget view beacon
         │
Owner GET /analytics ──► aggregates over public_profile_views (owner-scoped)
         │
User reuses Job ──► setup Interview without re-paste ──► InterviewQ LLM ──► recording loop ──► Feedback LLM ──► dashboard trend
         │
User improves Resume ──► ResumeAnalyzer ──► accept → new resume_versions ──► optionally back to profile
```

---

## 12. Security Boundaries

```
  ┌───────────────────────────────────────────┐
  │ Public (anon): GET /p/[slug]              │  whitelisted fields + signed URLs only
  │              POST /p/:slug/view            │  anon INSERT only — no read back
  ├───────────────────────────────────────────┤
  │ Authenticated (RLS): /api/profile, etc.    │  handler checks + RLS double — logs reqId
  ├───────────────────────────────────────────┤
  │ Server-only (secret): Gemini key,          │  `GEMINI_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
  │                  ServiceRole, signed URL   │  no NEXT_PUBLIC_ prefix, build audit
  └───────────────────────────────────────────┘
```

Full XSS/CSRF/IDOR/SSRF/SQLi/upload/injection/lifetime requirements: `docs/architecture/07_SECURITY.md:1` (the review checklist there gates every PR).

---

## 13. Deployment

```
GitHub push main → Vercel (Next.js build) → Edge
      │
      ├─ Env: NEXT_PUBLIC_SUPABASE_URL / ANON  (public)
      │       SUPABASE_SERVICE_ROLE_KEY        (secret) — beacon + signed URLs only
      │       GEMINI_API_KEY                   (secret) — provider secret
      │       NEXT_PUBLIC_APP_URL             (preview vs prod)
      └─ Supabase cloud: Postgres+Storage in same region as Vercel primary region
```

Domains: app `app.careerflow.ai` (or `careerflow-ai.vercel.app` until the custom domain), public profiles same-domain `/p/[slug]` (no cross-domain split).

No Python service in MVP; future option (FastAPI+Whisper) sketched in `docs/architecture/04_AI_ARCHITECTURE.md:1`§9 and `docs/decisions/ADR-001-TECHNOLOGY-STACK.md:1`.

---

## 14. Phases — Build progressively (what lands when)

| Phase | Ships | Gate |
|---|---|---|
| **1 Foundation** | Next.js+TS+Tailwind tokens+shadcn, Supabase clients, middleware auth, nav shells | `npm run build` + auth smoke |
| **2 Career Profile** | Hydrated profile (parse→edit), dashboard wiring | Upload→hydrate→edit E2E |
| **3 Video Resume** (3a Match / 3b Script+Video / 3c Publish) | Match alignment → script→MediaRecorder→public minimal page | `GET /p/[slug]` anon 200, non-fabrication corpus pass |
| **4 Public Analytics** | Owner analytics (series + breakdowns) for published slugs | Beacon dedup + 500-view latency verified |
| **5 Interview Coach** (5a Setup / 5b Live / 5c Results) | Dynamic Q→Answer→follow-up→feedback bento | Abandon-resume, typed fallback, feedback labels pass |
| **6 Resume AI** | Analyze → editor diffs → accept → new `resume_versions` | A/B non-fabrication, 409 no-net-change |
| **7–8 Cross-module + Hardening** | Job-reuse sweep, header/RLS/header audits | `docs/implementation/06_DEPLOYMENT.md:1` checklists green |
| **9–10 Testing + Cut** | Coverage ≥85%, axe critical 0, final Vercel + migrations | Lighthouse ≥90 perf / 95 a11y |

Detailed task→file→verify tables per sub-phase: `docs/implementation/02_VIDEO_RESUME.md:1` etc.

---

## 15. Documents Index

| Document | Role |
|---|---|
| `PRODUCT_SPEC.md` | Condensed product spec for stakeholders |
| `DESIGN_SYSTEM.md` | Typography/colour/spacing/component audit of `dising stitch/` |
| `docs/product/01_PRODUCT_OVERVIEW.md` | Vision, audiences, principles, metrics |
| `docs/product/02_USER_FLOWS.md` | End-to-end flows (0–7) with error/analytics |
| `docs/product/03_FEATURES.md` | Feature inventory + acceptance criteria (F-00…F-60) |
| `docs/product/04_INFORMATION_ARCHITECTURE.md` | Sitemap, nav, stepper |
| `docs/modules/01_VIDEO_RESUME.md` … `05_RESUME_AI.md` | Module specifications |
| `docs/architecture/02_DATABASE_SCHEMA.md` | Conceptual tables + indexes + RLS + `001…010` migrations |
| `docs/architecture/03_API_ARCHITECTURE.md` | Route catalogue + envelope + rate-limit + caching |
| `docs/architecture/04_AI_ARCHITECTURE.md` | 9 services + provider adapters + anti-fabrication |
| `docs/architecture/05_STORAGE_AND_VIDEO.md` | Buckets + MediaRecorder hook + signed URLs |
| `docs/architecture/06_ANALYTICS_ARCHITECTURE.md` | Beacon + aggregation + privacy |
| `docs/architecture/07_SECURITY.md` | Full threat checklist + Review Checklist (gates PRs) |
| `docs/implementation/01_PROJECT_FOUNDATION.md` … `05_TESTING.md`, `06_DEPLOYMENT.md` | Phase checklists + open-question tracker |
| `docs/decisions/ADR-001…004` | Frozen architecture decisions |

---

## 16. Consistency & Anti-Drift Rules (What fails review)

Every future PR must satisfy:

1. **One app** — no new `create-react-app`, no new `video_resume_users` table, no parallel auth (`docs/decisions/ADR-002:1`).
2. **Single resume system** — every resume read goes to `resume_versions` (`ADR-002`).
3. **AI key never on the client** — no provider import inside `components/` (`ADR-003`).
4. **Public page stays minimal** — no analytics or match dashboard added without superseding `ADR-004`.
5. **RLS + handler ownership double-check** before returning another user's row (`docs/architecture/07_SECURITY.md:1`).
6. **Anti-fabrication** prompt preamble remains on any new candidate-fact-emitting surface (`docs/architecture/04_AI_ARCHITECTURE.md:1`§5).
7. **Tests for loading/empty/error** triad on every card/stepper/table card (`docs/implementation/05_TESTING.md:1`).

---

## 17. Roadmap & Open Questions

Captured once here for leadership review; the authoritative open-question tracker is `docs/implementation/06_DEPLOYMENT.md:1` O-001…O-007.

| ID | Question | Due |
|---|---|---|
| O-001 | My Applications dedicated table design — sign off? | Phase 7 |
| O-002 | Interview Progress trend visualization choice | Phase 5 polish |
| O-003 | Post-Apply PDF re-render vs. text-only viewer | Phase 6a |
| O-006 | Signed URL TTLs 60s/300s balancing (legal) | Before prod (10.3) |
| O-007 | Threshold that triggers Python sidecar | Phase 9 |

