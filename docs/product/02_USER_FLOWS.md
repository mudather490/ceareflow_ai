# User Flows — CareerFlow AI

> Canonical end-to-end flows for every major screen. Each flow lists actors, preconditions, happy path, alternate paths, error states, and analytics events. Implementation must match step order; deviations require an ADR.

---

## Flow 0 — Global Entry & Authentication

### Actors
- Visitor (unauthenticated)
- User (authenticated Supabase Auth)

### Preconditions
- Visitor lands on `/` or `/p/[slug]` or deep-links to auth-gated route.

### Happy path — Sign up
1. Visitor → `GET /` (Landing, `dising stitch/careerflow_ai_landing_page` reference) → clicks **Create My Career Profile**
2. `GET /signup` (design: `sign_up_careerflow_ai`) → chooses Google OAuth or email+password → `POST /api/auth/signup`
3. Supabase Auth creates `auth.users` → trigger creates `users` profile row + empty `career_profiles` draft
4. Redirect → `GET /onboarding` → "Upload resume or build manually?" → proceeds to Flow 1a or 1b
5. Post-onboarding → `GET /dashboard`

### Alternate path — Login
- `/login` → `POST /api/auth/login` → RLS session established → `/dashboard`

### Error states
- Email already registered → inline field error, link to login
- Weak password → `label-sm` error under field (min 8 chars, spec in `code.html`)
- OAuth failure → toast + retry CTA
- Rate-limited → 429 with retry-after

### Analytics events
`auth_signup_started`, `auth_signup_completed`, `auth_login_completed`, `auth_oauth_started`

---

## Flow 1 — Career Profile (Foundation)

### 1a. Upload + Parse Resume → Hydrate Profile

**Preconditions:** Authenticated; profile may be empty.

1. Dashboard → **Career Profile** nav → `GET /career-profile` (reference: `career_profile_careerflow_ai`)
2. User clicks **Upload Resume (PDF)** → `POST /api/profile/resume` (multipart)
   - Validates: MIME `application/pdf`, ≤ 10 MB, not encrypted, not image-only (see `docs/architecture/07_SECURITY.md:1`)
3. Server stores raw PDF to Supabase Storage `resumes/{user_id}/{uuid}.pdf` → creates `resumes` + `resume_versions[v1]` rows
4. AI service `ResumeParser` invoked (`docs/architecture/04_AI_ARCHITECTURE.md:1`) → extracts fields
5. UI shows **Review extracted data** sheet — each section (Personal, Experience, Education, Skills) is editable; chips for skills
6. User edits → `PATCH /api/profile` → writes `career_profiles` + child tables transactionally
7. UI updates profile completion % (e.g. 82%) → unlocks AI matching

**Alternate path — Manual creation:** User skips upload → blank profile form → same `PATCH /api/profile`.

**Error states:** PDF password-protected → "This PDF is locked. Please export an unlocked version."; Parse low-confidence → fields left empty with "We couldn't detect this — please fill in."

### 1b. Edit Profile later

Any `edit` affordance (`career_profile_careerflow_ai` header edit, add experience `+` button) → optimistic UI → `PATCH /api/profile/experience/:id` etc. → RLS ensures ownership.

---

## Flow 2 — Video Resume (3 Steps)

### Step 1 — Match Job (`video_resume_match_job_careerflow_ai`)

**Preconditions:** Profile exists (≥ 1 resume version). User navigates via sidebar **Video Resume** or dashboard Quick Action.

1. `GET /video-resume` → stepper shows **1 Match Job** active
2. Left card: **Base Resume** selector (radio: `Senior Product Designer v2`, `UX Researcher v1`, or **Upload New**)
3. Right card: **Target Job Details** — inputs `job_title`, `company`, `job_description` textarea with "Paste JD for AI matching" badge
4. CTA **Match My Resume** → `POST /api/video-resume/match` body `{ resumeVersionId, jobTitle, company, jobDescription }`
   - Server creates/updates `jobs` row, invokes `JobParser` + `ResumeJobMatcher` services
   - Persists `job_matches` { score, strongMatches[], partialMatches[], missingWeak[], talkingPoints[], rawAnalysis }
5. Redirect → `GET /video-resume/match/[jobMatchId]` (reference: `video_resume_match_results_careerflow_ai`)
6. Match results screen shows:
   - Circular **82% Overall Match** (CSS SVG ring; color: `#4648d4`)
   - Skills breakdown chips (Strong / Partial / Missing)
   - **Talking Points for Video** + **AI Insight** callout
   - CTAs: **Edit Job** (back) → **Create My Introduction** (forward to Step 2)

**Validation rules:**
- JD min 50 chars, max 20k chars; title/company required (max 120 chars each)
- Duplicate Job (same title+company+JD hash, < 7 days) → reuse existing `jobs` row, re-run match if resume changed

**Error states:** AI timeout → "Analysis is taking longer than usual — retry"; Match score never shown as "hire probability" — label must be "Alignment indicator"

### Step 2 — Script + Video (`video_resume_recorder_careerflow_ai`)

**Preconditions:** `job_match` exists.

1. `GET /video-resume/script/[jobId]` → stepper: `2 Create Video` active (1 shows ✓)
2. Left panel **AI Script** — sections Opening / Experience / Skills / Closing; each in a white card with Edit / Regenerate actions
   - Load: `GET /api/video-resume/script?jobId=` → if none, auto-invoke `ScriptGenerator` with `{ careerProfile, resumeVersion, job, jobMatch }`
   - Actions:
     - **Regenerate** → `POST /api/video-resume/script/regenerate`
     - **Edit** inline → `PATCH /api/video-resume/script`
     - **Shorten / Make Natural** → variant prompts (documented in `docs/modules/01_VIDEO_RESUME.md:1`)
3. Right canvas **Video Recorder** (dark `neutral-900`):
   - Permissions prompt → `navigator.mediaDevices.getUserMedia({video:true,audio:true})`
   - Controls: REC pulse, `00:00:00` timer, mic toggle, blur BG toggle, **Use Teleprompter** (left script scrolls at adjustable speed)
   - Primary CTA **Record** (red) → MediaRecorder captures `video/webm` chunks → **Preview** → **Retake** or **Save**
   - Upload path: **Upload Video** (file input fallback; accepts `video/mp4,video/webm` ≤ 100 MB, max 3 minutes)
4. On save → `POST /api/video-resume/video` → uploads to Supabase Storage `videos/{user_id}/{job_id}/{uuid}.webm` → creates `videos` row → generates `public_profiles` draft (slug)
5. CTA **Review & Submit / Continue** → `GET /video-resume/publish/[publicProfileId]`

**Constraints:**
- Anti-fabrication rule: script generator prompt includes "DO NOT invent experience/metrics. If missing, insert [BRACKET PLACEHOLDER] and ask user."
- Max recording 180s; auto-stop; show countdown.

**Error states:** Camera denied → persistent inline permission helper + Upload fallback; Storage quota exceeded → toast + delete older drafts suggestion.

### Step 3 — Publish Profile (Public link)

1. `GET /video-resume/publish/[publicProfileId]` → shows share card: **Copy Link** (`https://app.careerflow.ai/p/[slug]`), **Preview** (iframe of public page), **Edit** (back to Step 2)
2. **Publish** → `PATCH /api/public-profile/:id { isPublished: true }` → profile becomes publicly fetchable
3. Private analytics tab: `GET /analytics?profileId=` shows views (see `docs/modules/03_PUBLIC_ANALYTICS.md:1`) — not visible to recruiters

---

## Flow 3 — Public Recruiter Profile (Unauthenticated)

**Entry:** Recruiter opens `GET /p/[slug]` (no auth, no dashboard nav). **Decision:** Implement the *minimal* variant only (`simplified_resume_public_profile_careerflow_ai`). Rich variants are retained as anti-patterns in `docs/modules/02_PUBLIC_PROFILE.md:1` → "Rejected variants".

### Minimal page composition (top → bottom)

1. Top bar: `CareerFlow AI` wordmark left; **Save Profile / Share** actions right (optional, not privileged)
2. Centered header: `Alex Mercer` (display) + `Senior Product Designer` (secondary) — no avatar unless future opt-in
3. Action row (centered, wrapping): **Play Introduction Video** (primary, `primary-container` bg), **Download Resume**, **LinkedIn Profile** (if provided) — all `Copy Link` accessible
4. Video hero: `aspect-video` dark container with prominent play button; clicking plays inline `<video>` (controls: volume, captions, fullscreen)
5. Resume content (below video) inside single white card: Experience, Education, Skills & Tools (chips) — collapsed sections share the card; no extra dashboards

### Public viewer interactions
- **Play** → `POST /api/public/:slug/view` (fire-and-forget analytics; see `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:1`) → then streams video via signed URL
- **View Resume** → opens PDF in new tab via time-boxed signed URL (60s TTL)
- **Download CV** → `Content-Disposition: attachment`
- **Copy Link** → `navigator.clipboard.writeText`
- **Contact** (if email exposed) → `mailto:` with prefilled subject `[CareerFlow] via your public profile`

### Error / edge states
- Slug not found → `404` minimal (no leakage of existence) — "This profile is not available. It may have been unpublished."
- Video still processing → thumbnail + "Video is processing" placeholder; auto-polls `GET /api/public/:slug/status`
- Private profile (isPublished=false) → same 404 behavior

---

## Flow 4 — Interview Coach (Reuses Flow 2's Job)

### Setup (`interview_coach_setup_careerflow_ai`)

1. Sidebar **Interview Coach** → `GET /interview` → header "Practice Your Interview"
2. Left **Context** card: Active profile (`AM v3`) with swap; Target Job selector (existing Jobs list or `+ New` → same JD form as Flow 2)
3. Right **Session Settings**: Interview Focus (Behavioral / Technical / Mixed, radio-cards), Difficulty (Easy/Medium/Hard with dot indicators), Session Length (5/10/15 Q, with time estimate)
4. CTA **Start Interview** → `POST /api/interviews` body `{ jobId, interviewType, difficulty, questionCount }` → creates `interviews` + pre-generates first question via `InterviewQuestionGenerator` → redirect `GET /interview/[interviewId]/live`

**Validation:** Job must exist; profile completion ≥ threshold (warn if < 60% → "Your profile is sparse — AI questions may be generic. Continue anyway?").

### Live Session (`interview_coach_live_session_careerflow_ai`)

Shell: minimal top bar with `CareerFlow Interview Coach` + **Exit Session** (confirmation modal).

Two columns:
- Left ~40%: Progress (`Question 3 of 10` + `30%` bar), Question card (H1 question + hint), **AI Insight** badge (follow-up cue), previous transcript collapsible.
- Right ~60%: Video feed (aspect `rounded-2xl`, controls: mic/camera toggle, **Stop Answer** red pill), timer `REC 01:42`, pulsing ring.

Sequence per question:
```
GET /api/interviews/:id/next-question   → LLM generates { question, hint, followUpContext }
User records answer (MediaRecorder)     → PUT /api/interviews/:id/answers { questionId, videoBlob, transcript? }
Server invokes Follow-up Engine         → determines next question (adaptive) or marks complete
Loop                                   → advances progress bar
```
- **Stop Answer** → stops recording → uploads → server returns next question within ≤ 4s target.
- **Exit Session** mid-flight → persists partial `interviews` as `abandoned`; resume entry point exists.

**Error states:** Mic/camera denied → allow audio-only or transcript-typed fallback; LLM slow → skeleton poll.

### Results (`interview_coach_results_careerflow_ai`)

1. `GET /interview/[interviewId]/results` → after session marked `completed`, `InterviewFeedbackEngine` has produced `interview_feedback` + per-answer feedback.
2. Bento grid:
   - **Overall Score** `78/100` (Proficient) — noise-textured card
   - **Performance Breakdown** bars: Communication 85% / Technical 90% / Structure(STAR) 65% / Confidence 80% / Conciseness 70%
   - **AI Recommendation** full-width (secondary container): "Focus on STAR method…"
   - **Strengths** (green checks) vs **Areas for Improvement** (amber) side-by-side
3. CTAs: **Retry Interview** (same config), **Practice Weak Areas** (filtered set where score < 70), back to Dashboard.

**Post-results:** Progress history persists to `GET /interview/progress` (future: `Interview Progress` screen) comparing `interview_feedback` over time.

---

## Flow 5 — Resume AI

> Note: No dedicated Stitch mockup exists for this flow — UI is specified by analogy to existing card patterns (white card + `primary`/`secondary` CTAs + `label-sm` badges). See `docs/modules/05_RESUME_AI.md:1`.

1. Sidebar **Resume AI** → `GET /resume-ai` → prompt: `Choose resume version` + optional `Target Job` picker (reuse Jobs)
2. `POST /api/resume-ai/analyze` → invokes `ResumeAnalyzer` → returns `resume_analyses` + `resume_suggestions[]` categorized: ATS, Relevance, Impact, Clarity, Structure
3. Editor: split view — left original bullets, right suggestion with diff + **Accept / Reject / Edit**
4. Each **Accept** → `POST /api/resume-ai/suggestions/:id/accept` → creates diff patch → on final **Apply** → new `resume_versions[vN]` + updated `career_profile` link option
5. Download / Share updated resume PDF (future: server-side PDF render) — MVP may retain edited text view.

---

## Flow 6 — Dashboard (`user_dashboard_careerflow_ai`)

`GET /dashboard` composition:

- Header: `Welcome back, {firstName}.` + **Overall Readiness** `A-` (computed from profile completeness + recent interview + resume score)
- **Career Profile** card (82% progress bar + "Complete Profile" link → Flow 1)
- **Quick Actions** (dark card): Create Video Resume / Practice Interview / Improve Resume
- **Module cards** (4-across): Resume Optimization (84 Score), Interview Coach (78 Recent Score), Resume AI (12 Suggestions), Video Resume (2 Active Profiles) — each deep-links to its module
- **Recent Applications** table: Job Title / Company / Match Score / Status (Applied / In Review) / row actions
- CTAs: **New Application** (global FAB in sidebar footer) → same as Flow 2 job creation.

Empty states:
- No jobs → table shows illustration + "Create your first application — it takes 30 seconds."
- No videos → Video card shows "No videos yet — Create Video Resume"

Loading skeleton: bento cards shimmer; table rows skeleton.

---

## Flow 7 — Analytics (Private, Owner-Only)

Route: `GET /analytics` and per-profile `GET /analytics?profileId=`.

Contents (see `docs/modules/03_PUBLIC_ANALYTICS.md:1`):
- Totals: views, unique viewers, view→resume-open conversion
- Time series: views per day (7/30 days)
- Breakdowns: referrer, device, geography (coarse)
- Privacy gate: no PII of recruiters is ever stored — only aggregated dimensions + hashed IP for dedup window.

---

## Cross-Cutting UX Requirements (All Flows)

- **Auth gating:** Any `GET /dashboard`, `/career-profile`, `/video-resume/*`, `/interview/*`, `/resume-ai`, `/analytics` without session → `302 /login?next=...`
- **RLS enforcement:** All API routes re-validate `auth.user.id` against row ownership; no client-trust.
- **Loading / Empty / Error triad:** Every card/table/video must implement all three states (spec in `DESIGN_SYSTEM.md:1`).
- **Responsiveness:** Desktop 12-col / tablet 8-col / mobile 4-col grid (DESIGN.md); sidebar collapses to bottom-nav or hamburger for < 1024px (verified in mocks).
- **No-fabrication guardrail:** Every AI surface that emits candidate facts must pass through `nonFabrication` prompt constraint + UI placeholder for missing data (yellow dashed border + "Tell us more" affordance).
