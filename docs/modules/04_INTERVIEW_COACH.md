# Module 04 — AI Interview Coach

> Second major module (Phase 5). Reuses every artifact from Module 01 + the Career Profile — no re-upload when a Job already exists. The interview is **dynamic** (LLM follow-ups), **video-recorded**, and **scored across 8 dimensions**.

Design refs: `interview_coach_setup_careerflow_ai`, `interview_coach_live_session_careerflow_ai`, `interview_coach_results_careerflow_ai`.

---

## 1. Purpose & Scope

Give candidates realistic, contextual mock interviews that:

1. Adapt to the candidate's actual resume + target job (not generic questionnaires)
2. Produce a follow-up question that references the previous answer
3. Score the session on communicative + technical axes and surface *actionable* weak-area drills

**Out of scope (MVP):** Speech-to-text transcription scoring, third-party video reviewers, live audio-only streaming (WebRTC), certificate issuance.

---

## 2. State Machine

```
                      ┌─draft────────────────────────┐
POST /api/interviews ──► creating ──► active ──┬─► completed ──► feedback_ready
                      └─► abandoned ◄─── exit ──┘          │
                       (mid-flight)                        ▼
                       resume ──► active               feedback_consumed
```

- `interviews.status`: `creating | active | abandoned | completed | feedback_ready`
- `interview_questions.status`: `pending | active | answered | skipped`
- `interview_answers.status`: `uploading | ready | failed`
- `interview_feedback` is created async after `completed` → flipped to `feedback_ready` within ≤10s target.

---

## 3. Setup (`GET /interview`)

### 3.1 Composition (`interview_coach_setup_careerflow_ai`)

Header: `Practice Your Interview` + `Configure your mock interview session to simulate real-world conditions.`

Two-col grid:

- **Left col (4)** sticky `Context` card + `Prep Tips` card:
  - Context: `Using Active Profile` — avatar `AM`, `Alex Mercer (v3)` pill, swap icon; `Target Job` picker showing `@ Google` card with company logo.
  - Prep Tips: gradient card `from-surface-container-low to-surface-container border-secondary-fixed-dim` with checklist (mic, STAR, pacing).
- **Right col (8)** `Session Settings` card (`glass-card`):
  - `Interview Focus` radio-cards (Behavioral `groups`, Technical `code`, Mixed `balance`). Active: `bg-surface-container` + `border-secondary`.
  - Split row: `Difficulty Level` (Easy/Medium/Hard with dot indicators `●○○`) + `Session Length` (5/10/15 Q with time hint).
  - Footer CTAs: `Start Interview` (`secondary-container` `hover:secondary` → white text).

Observed sidebar (desktop): `Interview Coach` active (`bg-secondary-container`). Mobile topnav + bottom nav (Coach tab active with border-t `secondary`).

### 3.2 Inputs & validation

| Field | Type | Allowed |
|---|---|---|
| `jobId` | FK `jobs.id` | Required; must belong to `auth.user`. Picker shows jobs created across ALL modules. "Create new job" opens inline JD form (same as Video Resume Step 1) → `POST /api/jobs` then becomes selectable without page nav. |
| `interviewType` | enum | `behavioral` \| `technical` \| `mixed` (default `mixed`) |
| `difficulty` | enum | `easy` \| `medium` \| `hard` (default `medium`) |
| `questionCount` | int | `5` \| `10` \| `15` (default `10`) |

Pre-flight guard: if `career_profile` completion < 60%, show non-blocking modal "Your profile is sparse — AI questions may be generic. Continue anyway?" (CTA: Continue / Edit Profile).

### 3.3 Creation

`POST /api/interviews`:

```
1. AuthZ + zod validate payload
2. Verify job exists & ownership
3. INSERT interviews { userId, jobId, careerProfileVersionId, interviewType, difficulty, questionCount }
4. Synchronously generate Q1 via InterviewQuestionGenerator(job, profile, type, difficulty)
5. INSERT interview_questions { interviewId, questionText, hint, orderIndex=1, source='llm_initial' }
6. Return interviewId → GET /interview/:id/live
```

Rate-limit: 6 interviews/hour/user.

### 3.4 Acceptance — Setup

- [ ] Active profile + job picker both support pick-existing and create-new without full-page reload.
- [ ] Radio-cards show checked state exactly as spec (secondary-container bg + border).
- [ ] Sparse-profile warning fires at <60% and does not block creation.
- [ ] Start Interview creates row and navigates to Live within 2s.

---

## 4. Live Session (`GET /interview/[interviewId]/live`)

### 4.1 Shell

- Minimal top bar: `h-16` `psychology` icon + `Interview Coach` + `Exit Session` (confirmation). No sidebar bloat.
- Main canvas (`max-w-[1600px] mx-auto w-full`) two columns:
  - Left ~40%: Progress (stepper: label `Technical Screen`, `Question 3 of 10`, rail `h-1 bg-surface-variant` with `bg-primary` fill 30%), Question card (left `secondary` accent bar `w-1`, H1 question + body-md hint), AI Insight badge (`secondary-fixed` + lightbulb).
  - Right ~60%: Video container `rounded-2xl` with gradient `from-black/40 via-transparent to-black/60`, REC pill (pulsing ring + `REC` + `01:42` mono), mic orb, floating control bar (`mic` | `videocam` | `Stop Answer` pill `bg-error`).

Mobile collapse: stacked columns (question top, video bottom).

### 4.2 Dynamic loop

```
When page loads:  GET /api/interviews/:id/next-question
  → model generates Q1 (or fetches Q{n}) with { question, hint, followUpCue }
  → Renders Question card

User clicks Record → MediaRecorder captures video/webm
User clicks Stop Answer →
  PUT /api/interviews/:id/answers  { questionId, blob (multipart) }
    → server stores to storage `interview-answers/{userId}/{interviewId}/{qId}.webm`
    → INSERT interview_answers { interviewId, questionId, storagePath, durationSec, status='ready' }
    → Invoke InterviewFollowupEngine(answerMeta, priorQs, profile, job) →
       determines: emit follow-up Q{n+1} OR synthesize new pivot Q
    → INSERT interview_questions(next)
    → return next question
  → frontend auto-advances progress bar + loads next Q card

Loop terminates when answeredCount == questionCount → PATCH interviews { status='completed' }
  → client redirects GET /interview/:id/results after small delay
```

**Transcript note:** Video blob is required; transcript field is *optional* (future STT). If present, it is sent alongside `blob`; the Follow-up Engine uses only available fields.

`GET /api/interviews/:id/next-question` semantics:

- If a `pending` question already exists for this interview, return it (idempotent).
- Else call LLM with context window: `job`, `career_profile`, last 3 Q/A pairs, interviewType/difficulty, answeredCount/total.

### 4.3 Controls & fallbacks

- **Stop Answer** is the advancement trigger; also auto-stops at 120s per-answer (soft) with visible countdown.
- **Exit Session:** modal `Are you sure? Progress will be saved but not scored until completed.` → `PATCH /api/interviews/:id { status='abandoned' }` → leave to `/interview`.
- **Resumability:** `GET /interview/:id/live` for an `abandoned` interview reloads at last unanswered Q (skip uploading step).
- **No mic/camera:** show in-video helper copy + typed fallback textarea `Type your answer instead` (saves as `interview_answers.transcript` without blob — follow-up still works).
- **Network/LLM failure:** retry banner + keep already-captured blob; do not discard.

### 4.4 Acceptance — Live

- [ ] Progress bar = `answered+1 / questionCount` correctly synchronized across refresh.
- [ ] Question card renders question H + hint + conditional AI Insight badge.
- [ ] Recording shows pulsing REC + timer; toggles for mic/cam work; Stop uploads and within 4s target loads next question; loop ends at the configured count.
- [ ] Exit prompts and persists as `abandoned`; resume re-enters same state.
- [ ] Camera denied still allows typed fallback path to remain functional.
- [ ] No duplicate question inserts on double-click Stop (idempotent next-question).

---

## 5. Feedback & Results (`GET /interview/[interviewId]/results`)

### 5.1 Trigger

When `interviews.status` flips `completed`, a background worker (route handler continuation or Supabase webhook) invokes `InterviewFeedbackEngine`:

Inputs: `job`, `career_profile`, `all interview_answers` (optionally: video blobs + transcripts if present).

Outputs (stored):

- `interview_feedback` one row per session `{ overallScore 0..100, label (Needs Work|Developing|Proficient|Strong), dimensions { communication, technical, structureSTAR, confidence, conciseness, relevance }, aiRecommendation markdown, strengths[], weaknesses[] }`
- `interview_answer_feedback` per answer (optional granularity — stub depth)

Engine scoring dimensions (per spec, reconciled with `interview_coach_results_careerflow_ai` mock):

| Dimension | Mock bar label | Weight nuance |
|---|---|---|
| Communication | Communication 85% | Delivery, pacing, eye contact proxy |
| Technical Knowledge | Technical Knowledge 90% | Depth + accuracy |
| Structure (STAR) | Structure (STAR) 65% | Expected weak spot highlighted |
| Confidence | Confidence 80% | Tone + certainty |
| Conciseness | Conciseness 70% | Low → rushed, high → wandering |

*Relevance / Content / Behavioral* (from PRD §4) are collapsed into the 5 visible bars; the narrative recommendation covers them verbally.

### 5.2 Bento composition

```
<header: Interview Results — description row + right CTAs [Retry Interview] [Practice Weak Areas]>

┌──────────────┬────────────────────────────┐
│ Overall Score│ Performance Breakdown      │  (4col | 8col)
│ 78/100       │ bars: 85/90/65/80/70      │
│ ● Proficient │ colors: secondary (good)  │
│              │ vs tertiary (needs work)  │
├───────────────────────────────────────────┤
│ AI Recommendation (full-width gradient)   │  secondary icon + label + H4 + paragraph
├────────────────════─┬─────────────────────┤
│ Strengths           │ Areas for Improvement
│ ✓ grasp core        │ ⚠ wander conclusion
│ ✓ eye contact       │ ⚠ rushed pacing
│ ✓ clear steps       │ ⚠ missed closing Q
└─────────────────────┴─────────────────────┘
```

Tag mapping:

- Overall card: `bg-surface-container-lowest border-outline-variant rounded-xl ...` with `bg-noise` overlay, `display/100`-scale numeral + `outline` slash.
- Recommendation: `bg-surface-container-low border-secondary-fixed rounded-xl p-md` with `auto_awesome` indigo cube.
- Strengths/Weaknesses: `check_circle / warning` icons, `green-600 / orange-600` tints, list gap 3.

### 5.3 Downstream actions

- **Retry Interview** → `POST /api/interviews` with same config (or `POST /api/interviews/:id/retry` alias) → new Live session.
- **Practice Weak Areas** → spawns new interview with `questionCount = 3..5` and `InterviewQuestionGenerator` prompt focused on dimensions scoring < 70 (filter) + job context.
- **Progress:** `/interview/progress` (P1) graphs `overallScore` over time; comparison of two sessions side-by-side (future).

### 5.4 Acceptance — Results

- [ ] Overall `78/100` etc. renders correctly from `interview_feedback`; label Proficient maps exactly to bucket.
- [ ] Five bars reflect stored dimensions faithfully; secondary vs tertiary coloring matches score ≥ vs < 70 semantics.
- [ ] AI Recommendation renders ready-made markdown (no client prompt).
- [ ] Strengths/Weaknesses list lengths ≥ 2 each, rendered with correct icons.
- [ ] Retry recreates session with same config; Practice Weak Areas spawns focused session (verified by `jobId` + prompt audit).

---

## 6. Security & Privacy

- All `interview*` tables RLS `user_id = auth.uid()`; no anon reads.
- Video answers stored in private bucket `interview-answers`; only owner + AI service role can read them.
- Public profile surfaces never reference interviews.
- Interview video blobs short-retained (e.g. 30d) unless user opts to keep — document retention in `docs/architecture/05_STORAGE_AND_VIDEO.md:1`.

---

## 7. Open Questions / Design Debt

- `Interview Progress` screen has no Stitch mock — proposed as `recharts` line + session cards; needs design sign-off before Phase 5 polish.
- Audio-only mode UX (no video thumbnail) needs visual placeholder spec.
- Whether to run real STT on answer blobs now vs. defer — ADR pending.

