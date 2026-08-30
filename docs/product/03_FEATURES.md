# Features — CareerFlow AI

> Feature inventory with purpose, user, inputs/outputs, dependencies, AI requirements, security, UX behavior, and **acceptance criteria**. Use this file as the checklist for PR review: every shipped feature must satisfy its AC or record an explicit deferment.

---

## Legend

- **P0** — must ship before module is considered complete
- **P1** — ships in same phase if time allows; otherwise first patch
- **P2** — postponed to cross-module integration or post-MVP
- **AC** — acceptance criteria (Given/When/Then style where precise)

---

## F-00 — Shared / Platform

### F-00.1 Authentication & Session (P0)

- **Purpose:** Gate private routes; own all user data via RLS.
- **Inputs:** Email + password OR Google OAuth.
- **Outputs:** Supabase `auth.users` row, `users` profile row, session cookie.
- **Dependencies:** Supabase Auth; `users` table trigger.
- **Security:** Password min 8 chars, bcrypt via Supabase; PKCE for OAuth; rate-limit `POST /api/auth/*` (5 / minute / IP); no secret in client bundle.
- **UX:** `sign_up_careerflow_ai` card; Google button primary; email divider; inline validation; redirect `?next=`.

**AC:**
- [ ] Visitor without session requesting `GET /dashboard|/career-profile|/video-resume/*|/interview/*|/resume-ai|/analytics` is redirected to `/login?next=...`.
- [ ] `POST /api/auth/signup` with duplicate email returns `409` with actionable message, not 500.
- [ ] Google OAuth round-trips and lands on `/onboarding` for first login, `/dashboard` thereafter.
- [ ] Session refresh works across tab close (httpOnly cookie, not localStorage token echo).

### F-00.2 Career Profile — Data Model + CRUD (P0)

- **Purpose:** Single writable representation of candidate facts; every module reads it.
- **Inputs:** Resume PDF extraction OR manual form.
- **Outputs:** Rows in `career_profiles`, `experiences`, `education`, `skills`, `projects`, `certifications`, `resume_versions`.
- **Dependencies:** Resume Parser AI; Supabase Storage (resumes bucket).
- **AI:** Optional — parser is AI-assisted but user can override every field.
- **Security:** RLS: user can read/write only own rows; recruiters never see this surface.

**AC:**
- [ ] Uploading a 10 MB text PDF extracts name/title/summary/experience/education/skills and shows review sheet within 15s p95.
- [ ] User can edit any field and it persists after reload (`PATCH /api/profile/*` → row updated).
- [ ] Creating profile without upload works (blank form → valid `career_profiles` row).
- [ ] Profile completion % recomputes after each edit (formula in `docs/architecture/02_DATABASE_SCHEMA.md:1`).

### F-00.3 Dashboard (P0)

- **Design ref:** `user_dashboard_careerflow_ai`
- **Purpose:** Single glance at readiness + entry points to every module + recent applications.

**AC:**
- [ ] Header shows personalized greeting + Overall Readiness (derived — not fabricated).
- [ ] Career Profile card shows completion bar + CTA deep-links to `/career-profile`.
- [ ] Quick Action buttons (3) deep-link correctly, even when profile incomplete (offer guardrail).
- [ ] Module summary cards handle empty state (illustration + CTA) not blank.
- [ ] Recent Applications table renders score bar + status chip + handles 0 rows.

### F-00.4 Navigation & Information Architecture (P0)

- **Spec:** `docs/product/04_INFORMATION_ARCHITECTURE.md:1`
- **AC:**
- [ ] Authenticated sidebar (8 links + New Application) is present on every authenticated route; active state reflects route.
- [ ] Public profile (`/p/[slug]`) renders **without** authenticated sidebar/nav (isolated recruiter shell).
- [ ] Mobile: sidebar collapses to hamburger → drawer and bottom-nav for focused workspaces (Video Recorder, Live Interview) per mocks.

---

## F-10 — Video Resume (P0 Module)

### F-10.1 Resume Selection (Step 1)

- **Inputs:** `resumeVersionId` (radio), or Upload New (file).
- **Outputs:** Selected version bound to upcoming Job.
- **AC:**
- [ ] Radio group reflects all user resume versions (label + "Last updated …").
- [ ] Upload New validates PDF and immediately becomes selectable, without page reload.

### F-10.2 Job Context Creation (Step 1)

- **Inputs:** `jobTitle`, `company`, `jobDescription`.
- **Outputs:** `jobs` row (deduplicated by hash) + bound `resumeVersionId`.
- **AC:**
- [ ] All three fields required; inline errors; JD min 50 chars.
- [ ] Submitting valid form calls `POST /api/video-resume/match` and navigates to results without double-submit.
- [ ] Creating job when an identical title+company+JD hash (<7d) exists reuses row id (no duplicate `jobs` rows).

### F-10.3 AI Match — Alignment Analysis (Step 1 → Results)

- **AI services:** `JobParser` + `ResumeJobMatcher`.
- **Outputs:** `job_matches` row { score (0–100), strongMatches[], partialMatches[], missingWeak[], talkingPoints[], rawAnalysis }.
- **Non-functional:** p95 < 8s; rate-limited (10 matches / hour / user).
- **Guardrail:** Score labeled "Alignment indicator — not a hiring probability" (legal requirement — must appear adjacent to score in results UI).

**AC:**
- [ ] Results page shows circular progress ring at correct % with `stroke-dashoffset` math verified.
- [ ] Skills breakdown chips appear under correct heading (green/yellow/red semantics).
- [ ] Talking Points for Video section lists ≥ 2 actionable bullets tailored to THIS job (not generic).
- [ ] AI Insight callout is present.
- [ ] CTA "Create My Introduction" forwards to Step 2 with correct `jobMatchId` context.
- [ ] "Edit Job" returns to Step 1 with fields pre-filled.

### F-10.4 AI Script Generation (Step 2) — P0

- **AI service:** `ScriptGenerator`.
- **Inputs:** `careerProfile` + `resumeVersion` + `job` + `jobMatch`.
- **Outputs:** `scripts` row { opening, experience, skills, closing, variant }.
- **Guardrails:** Prompt forbids fabrication; missing data → `[PLACEHOLDER]` placeholder + yellow warning; length target 45–90 seconds spoken (~110–200 words).

**AC:**
- [ ] On entry, script auto-generates if none exists; skeleton shows while generating.
- [ ] Sections render as cards: Opening / Experience / Skills / Closing (left navigation dots).
- [ ] Regenerate replaces content and shows "Generated" badge.
- [ ] Edit inline persists via `PATCH` after debounce.
- [ ] Shorten reduces word count by ~30% while preserving placeholders.
- [ ] Make Natural rewrites without adding unverified facts (verified by manual QA: adding an invented metric fails review).

### F-10.5 Video Recorder (Step 2) — P0

- **Tech:** Browser `MediaRecorder` (MVP); fallback file upload.
- **Outputs:** `videos` row + Storage object `videos/{userId}/{jobId}/{uuid}.webm`.

**AC:**
- [ ] Permission prompt path shows helper copy if denied, plus Upload fallback.
- [ ] REC timer ticks, max 180s then auto-stop.
- [ ] Teleprompter mode scrolls left-panel script at adjustable speed; can toggle mid-recording.
- [ ] Preview → Retake discards blob; Save persists + shows link to Step 3.
- [ ] Uploaded file validates `video/*`, ≤ 100 MB, duration ≤ 180s (read via `loadedmetadata`).
- [ ] After save, storage object exists and is owner-readable but not publicly listable.

### F-10.6 Public Profile Publish (Step 3) — P0

- **Outputs:** `public_profiles` row { slug, jobId, videoId, resumeVersionId, isPublished }.
- **AC:**
- [ ] Publish toggle flips `isPublished`; draft vs. published copy changes.
- [ ] Copy Link writes `https://{host}/p/{slug}` to clipboard + toast "Link copied."
- [ ] Preview renders recruiter shell (minimal) with real video + resume.
- [ ] Unpublishing causes `GET /p/[slug]` to return 404 (not 403), within 5s consistency window.

---

## F-20 — Public Recruiter Profile (P0)

> Public viewer has no session, no sidebar, no analytics surface. Owner analytics live at `F-20.1`.

Design ref chosen: `simplified_resume_public_profile_careerflow_ai` (minimal). Other variants are documented as rejected in `docs/modules/02_PUBLIC_PROFILE.md:1`.

### F-20.0 Minimal Recruiter Page

**AC:**
- [ ] `GET /p/[slug]` with valid published slug renders: centered name + title, action row (Play Video primary, Download Resume, LinkedIn), `aspect-video` hero, single white resume card (Experience/Education/Skills).
- [ ] Video hero shows prominent play button + label "Play Introduction Video" (no tiny thumbnail confusion).
- [ ] Download CV triggers `Content-Disposition: attachment` signed URL, TTL ~60s, no auth.
- [ ] Page is fast (LCP < 2.5s on simulated 4G) and meets contrast/accessibility (axe audit, keyboard-navigable).
- [ ] No analytics, job description, skill matrix, AI recommendations, or chatbot appears.
- [ ] Invalid slug or unpublished profile returns generic 404 with no existence oracle.

### F-20.1 Owner-Only Analytics (P1 — ships with Video Resume)

- **Spec:** `docs/modules/03_PUBLIC_ANALYTICS.md:1`
- **AC:**
- [ ] Private `GET /analytics?profileId=` shows views (total + daily series), referrers, device breakdown, geo (country only).
- [ ] Views are inserted by `POST /api/public/:slug/view` (fire-and-forget, rate-limited, hashed IP dedup window 1h).
- [ ] Recruiter never sees analytics; share URL never leaks analytics endpoint.
- [ ] Analytics respect RLS: user cannot view another user's profile analytics.

---

## F-30 — AI Interview Coach (P0 — ships after Video Resume)

### F-30.1 Setup (P0)

- **Design ref:** `interview_coach_setup_careerflow_ai`
- **Inputs:** `jobId` (pick existing or create new), `interviewType` {behavioral|technical|mixed}, `difficulty` {easy|medium|hard}, `questionCount` {5|10|15}.
- **AC:**
- [ ] Context card shows active profile + swap; job picker shows existing jobs + "Create new" affordance.
- [ ] Session Settings radio-cards behave per design (checked = `secondary-container` bg), with dot/time hints.
- [ ] Start Interview creates `interviews` row linked to `jobId` and navigates to Live.

### F-30.2 Live Interview (P0)

- **Design ref:** `interview_coach_live_session_careerflow_ai`
- **Loop:** `Question → Answer (video) → LLM Follow-up Engine → next Question → … → complete`
- **AI services:** `InterviewQuestionGenerator`, `InterviewFollowupEngine`.

**AC:**
- [ ] Progress shows `Question N of M` + bar = `N/M * 100%` synchronized.
- [ ] Question card renders question H + hint; **AI Insight** badge renders when follow-up context exists.
- [ ] Video feed records via MediaRecorder; REC badge pulses; timer accurate; controls (mic/cam) toggle.
- [ ] **Stop Answer** stops recording, uploads blob, and within 4s target fetches next question; loop ends at `questionCount`.
- [ ] Exit Session prompts confirmation; partial session persisted as `abandoned` and is resumable.
- [ ] Audio-only / typed fallback available if camera denied.

### F-30.3 Feedback & Results (P0)

- **Design ref:** `interview_coach_results_careerflow_ai`
- **AI service:** `InterviewFeedbackEngine`
- **Outputs:** `interview_feedback` + per-answer feedback rows.

**AC:**
- [ ] Results render bento: Overall Score `XX/100` + Proficient label, Performance bars (5 dims), AI Recommendation full-width, Strengths vs Areas columns.
- [ ] Bars reflect stored `interview_feedback` faithfully; no client-recomputed fabrication.
- [ ] CTAs: **Retry Interview** (same config), **Practice Weak Areas** (filters to score <70 dimensions, spawns new interview with focused prompts).
- [ ] Results persist and are retrievable; `GET /interview/progress` can compare attempts.

---

## F-40 — Resume AI (P1 — ships after Interview Coach)

> No Stitch mockup exists; UI follows Dashboard/Card system.

### F-40.1 Analysis (P1)

- **AI service:** `ResumeAnalyzer`
- **Categories:** ATS compatibility, Job relevance, Achievement impact, Clarity, Structure, Skills evidence, Weak/repeated bullets, Missing evidence, Professional language.

**AC:**
- [ ] Uploading/selecting resume + optional Job triggers analysis within 10s; results categorized.
- [ ] Each suggestion shows before/after diff; AI label per suggestion; confidence hint.
- [ ] **Never** suggests an invented fact; if metric missing, suggestion is a question ("Could you quantify impact?").
- [ ] Original text example transforms faithfully: "Worked on ML models." → "Developed ML classification models using Python and Scikit-learn." (only when evidence exists in profile).

### F-40.2 Suggestion Apply + Versioning (P1)

- **Outputs:** `resume_suggestions` status transitions + new `resume_versions` row on Apply.

**AC:**
- [ ] Accept / Reject / Edit per suggestion works; Edit lets user tweak AI text before accepting.
- [ ] **Apply** creates immutable new `resume_versions` row (append-only); previous versions remain readable.
- [ ] Updated resume can be downloaded (rendered PDF or text) and linked to Career Profile.
- [ ] Analytics: acceptance rate tracked.

---

## F-50 — My Applications / Job Tracking (P1)

- **Purpose:** Central table of all jobs created across modules with unified status `draft|applied|interview|in_review|offer|closed`.
- **AC:**
- [ ] Table lists jobs from both Video Resume and Interview Coach, with Match Score if available.
- [ ] Filter/sort by status, company, date.
- [ ] Row actions: open Video Resume flow, start Interview for same job, view Public Profile analytics.

---

## F-60 — Settings (P1)

- **Scope:** Account (email/name), Danger Zone (delete account → cascades per GDPR), Storage usage, Notifications, Privacy (public profile visibility).
- **AC:**
- [ ] Delete account removes all owned rows and Storage objects within transaction (verified by absence).

---

## Matrix — Feature × Module × Phase

| Feature | Module | Phase |
|---|---|---|
| Auth, Career Profile, Dashboard, Nav | Platform | 1 Foundation |
| F-10 Video Resume + F-20 Minimal Public | Video Resume | 3 |
| F-20.1 Analytics (private) | Public Analytics | 4 |
| F-30 Interview Coach | Interview | 5 |
| F-40 Resume AI + F-50 Apps + F-60 Settings | Resume AI / Apps | 6 |
| Cross-module reuse, Security hardening | Integration | 7–8 |
| Testing + Deployment | Ops | 9–10 |

Phases are detailed in `docs/implementation/06_DEPLOYMENT.md:1` (actually `docs/implementation/02_VIDEO_RESUME.md` etc.; see implementation folder).
