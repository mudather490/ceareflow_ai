# Information Architecture — CareerFlow AI

> Sitemap, navigation model, route map, and IA decisions that make CareerFlow feel like **one product** (not three apps bolted together).

---

## 1. Mental Model

```
CareerFlow AI is ONE app with ONE profile that SHRINKS per job.
```

Every route either:
- **reads/writes the Career Profile** (private, auth-gated), or
- **presents a single job-scoped artifact** (match, script, video, interview, suggestions) that links back to the Career Profile, or
- **publishes a recruiter artifact** (public link, public analytics) isolated from private state.

---

## 2. Sitemap (Canonical)

### 2.1 Public / Unauthenticated

| Route | File (app dir) | Shell | Purpose | Auth | Design ref |
|---|---|---|---|---|---|
| `/` | `app/page.tsx` | Marketing shell (no sidebar) | Landing hero + feature bento + pricing + footer CTA | No | `careerflow_ai_landing_page` |
| `/login` | `app/(auth)/login/page.tsx` | Auth card centered | Email/pass + Google OAuth | No | `sign_up_careerflow_ai` (variant) |
| `/signup` | `app/(auth)/signup/page.tsx` | Auth card centered | Create account | No | `sign_up_careerflow_ai` |
| `/p/[slug]` | `app/p/[slug]/page.tsx` | **Recruiter shell** (wordmark + Save/Share only) | Minimal public recruiter profile (video + resume + actions) | No | `simplified_resume_public_profile_careerflow_ai` (chosen) |
| `/api/public/[slug]/view` | `app/api/public/[slug]/view/route.ts` | API | Fire-and-forget analytics insert (no UI) | No | — |

### 2.2 Authenticated — Core App (Sidebar Shell)

All routes below render inside `app/(dashboard)/layout.tsx` which mounts:

- **Desktop:** 256 px `SideNavBar` (fixed left, `surface-container-lowest` + border)
- **Mobile:** `TopNavBar` (fixed 64 px) + bottom-nav or drawer (collapsed states per `DESIGN_SYSTEM.md:1`)
- Active nav item tinted `secondary-container`/`on-secondary-container`

| Route | Purpose | Nav active | Key state |
|---|---|---|---|
| `/dashboard` | Welcome + readiness + quick actions + module cards + recent apps | Dashboard | `career_profile` completion % |
| `/career-profile` | Edit single source of truth | Career Profile | `career_profiles` + children |
| `/video-resume` | Step 1: pick resume + target job | Video Resume | `jobs` + `resume_versions` |
| `/video-resume/match/[matchId]` | Match results (score + breakdown) | Video Resume | `job_matches` |
| `/video-resume/script/[jobId]` | Script + recorder two-column workspace | Video Resume | `scripts` + `videos` |
| `/video-resume/publish/[profileId]` | Publish + share analytics private | Video Resume | `public_profiles` |
| `/interview` | Setup (context + session settings) | Interview Coach | `jobs` picker + config |
| `/interview/[interviewId]/live` | Live immersive session | Interview Coach | `interviews` + questions/answers |
| `/interview/[interviewId]/results` | Results bento (score + breakdown + strengths/weaknesses) | Interview Coach | `interview_feedback` |
| `/interview/progress` | History/comparison (P1) | Interview Coach | List of `interview_feedback` |
| `/resume-ai` | Upload/pick resume + optional job → analysis | Resume AI | `resume_analyses` |
| `/resume-ai/[analysisId]` | Suggestion editor (accept/reject/edit) | Resume AI | `resume_suggestions` |
| `/applications` | My Applications table | My Applications | `jobs` across modules |
| `/analytics` | Private analytics (overall) | Analytics | `public_profile_views` aggregate |
| `/analytics/[profileId]` | Per-profile analytics | Analytics | Filtered aggregate |
| `/settings` | Account + privacy + danger zone | Settings | `users` |
| `/onboarding` | First-run wizard (resume upload vs manual) | — (transient) | `career_profiles` draft |

### 2.3 API Route Map (Next.js Route Handlers)

```
/api/auth/*                   (Supabase client wrappers — minimal custom code)
/api/profile                  (GET/PATCH career_profiles + children)
/api/profile/resume           (POST multipart PDF)
/api/video-resume/match       (POST)
/api/video-resume/match/:id   (GET)
/api/video-resume/script      (GET/POST/PATCH)
/api/video-resume/video       (POST multipart video)
/api/public-profile/:id       (PATCH publish, GET private analytics)
/api/public/:slug              (GET public page data — no auth)
/api/public/:slug/view         (POST analytics)
/api/interviews               (POST create, GET list)
/api/interviews/:id/next-question  (GET/POST LLM)
/api/interviews/:id/answers   (PUT)
/api/interviews/:id/feedback  (GET)
/api/resume-ai/analyze        (POST)
/api/resume-ai/suggestions/:id (POST accept/reject/edit)
```

Full API spec lives in `docs/architecture/03_API_ARCHITECTURE.md:1`.

---

## 3. Navigation Design

### 3.1 Authenticated Sidebar (Desktop ≥ 1024px)

Extracted from `user_dashboard_careerflow_ai` + `career_profile_careerflow_ai` + `interview_coach_setup_careerflow_ai`:

```
┌──────────────────────────────┐
│ [●] CareerFlow AI            │  headline-sm 900
│    Active Career Profile      │  label-sm + avatar (optional)
│──────────────────────────────│
│ [ Button: New Application ]   │  primary, full-width, mb-lg
│──────────────────────────────│
│  ● Dashboard                  │  secondary-container when active
│    Career Profile             │
│    Video Resume               │
│    Interview Coach            │
│    Resume AI                  │
│    My Applications            │
│    Analytics                  │
│──────────────────────────────│
│    Settings   (footer)       │
└──────────────────────────────┘
Width: 256px (w-64), fixed, border-r outline-variant
Active row: bg-secondary-container / text-on-secondary-container / bold
Hover row: bg-surface-container-high
```

**Consistency fix applied:** Earlier mocks vary whether "Active Career Profile" is text-only or avatar+name+label. Chosen canonical (post-audit): avatar thumbnail (40×40) + `Alex Mercer` (`label-md` semibold) + `Active Career Profile` (`label-sm` variant). All authenticated sidebar instances must use this header.

### 3.2 Mobile Shell (≤ 1023px)

Two modes observed in Stitch mocks — reconciled as:

- **Standard pages** (`dashboard`, `career-profile`, `setup`, `results`): `TopNavBar` (fixed 64px: wordmark left, bell + avatar right) + content with `pt-16`. Bottom-nav optional supplement for primary tabs; **do not** render desktop sidebar drawer by default beyond hamburger → sheet.
- **Immersive pages** (`/video-resume/script/:id`, `/interview/:id/live`): Collapsed sidebar (80px icon-only rail on desktop; hidden on mobile) + top stepper header. Bottom-nav contains session controls (mic/cam/Stop).

### 3.3 Public / Recruiter Shell (`/p/[slug]`)

Must NOT reuse authenticated sidebar. Spec in `docs/modules/02_PUBLIC_PROFILE.md:1`:

```
┌────────────────────────────────────────────────┐
│ CareerFlow AI (left)   [Save Profile] [Share] │  h-16, border-b, bg-surface
├────────────────────────────────────────────────┤
│          Alex Mercer (display, centered)       │
│    Senior Product Designer (secondary, center) │
│   [Play Video] [Download Resume] [LinkedIn]    │  centered wrapping
│   ┌──────────────────────────────────────┐    │
│   │  aspect-video  hero  play button      │    │
│   └──────────────────────────────────────┘    │
│   ┌──────────────────────────────────────┐    │
│   │  white resume card: Experience /     │    │
│   │  Education / Skills & Tools (chips)  │    │
│   └──────────────────────────────────────┘    │
└────────────────────────────────────────────────┘
max-w 1280px (or 896px for minimal centered variant), mx-auto
```

**Rationale:** Recruiter focus is video + resume; extra nav chrome is friction. Analytics/share actions live in private `/analytics` shell.

---

## 4. Breadcrumbs & Stepper

Only the **Video Resume** workspace uses a stepper; it is NOT global nav:

```
1 Match Job ── 2 Create Video ── 3 Publish Profile
   (active)       (next/disabled)   (disabled)
```

- On Desktop: horizontal row, centered, dots/connectors (`border-t-2`), active = `secondary` circle with white numeral and `shadow-level2`.
- On Mobile: reduced wrapping `overflow-x:auto`.
- Stepper is **informational**, not clickable beyond linear `Edit Job` affordance; forbids jumping ahead.

Interview Live uses a simpler **progress bar** (`Question 3 of 10` + `30%` rail), not the 3-step stepper.

---

## 5. State & Loading Orchestration

| Route pattern | Loading | Empty | Error |
|---|---|---|---|
| `/dashboard` | Bento shimmer | "Create first application" card | Toast + retry |
| `/career-profile` | Section skeletons | "Upload resume or build manually" | Field-level |
| `/video-resume/*` | Skeleton + AI spinner | N/A (must supply job before results) | Inline + back CTS |
| `/p/[slug]` | Hero skeleton | 404 (indistinguishable) | 404 |
| `/interview/:id/live` | Question shimmer | N/A | Reconnect prompt + typed fallback |
| `/resume-ai` | Diff skeleton | "Upload to start" | Inline |

Every page must implement the triad; empty states must contain a CTA that unblocks user.

---

## 6. IA Constraints (Must Hold)

1. **Single user, single career profile, single resume system** — no parallel `video_resumes` / `interview_resumes` tables (`ADR-002`).
2. **Sidebar appears only on auth routes** — public route `#sidebar` is intentionally absent (recruiter focus).
3. **Deep links preserve job context** — `?jobId=` param allowable but must canonicalize to the `jobs` row; duplicate jobs never created via deep link.
4. **Analytics is private** — share link never exposes `/analytics`; owner view is at `/analytics/*` behind auth + RLS.
5. **No fabrication routes** — any `POST` to AI endpoints that would emit resume facts must include `antiFabrication` prompt middleware (see `docs/architecture/04_AI_ARCHITECTURE.md:1`).

---

## 7. Unresolved IA Items (Track as Open Questions)

- `My Applications` dedicated page has no Stitch mock — proposed as table view (analogous to Dashboard recent apps). Needs design sign-off before Phase 6.
- `Interview Progress` history chart (trend over time) has no mock — deferred; dashboard module card links to placeholder.
- `Resume AI` two-pane editor has no mock — spec derived from `video_resume_recorder` two-column pattern + Dashboard cards.

Each is recorded in `docs/decisions/` + `docs/implementation/05_TESTING.md` as TODO requiring designer review before code.

