# Implementation — 03 Interview Coach (Phase 5)

> Dynamic interview loop: `Setup → Live (question → video answer → LLM follow-up → next) → Results`. Reuses jobs + Career Profile from Phase 3; standalone integration tests confirm no dependency on having completed Video Resume first.

Refs: `docs/modules/04_INTERVIEW_COACH.md:1`, `docs/architecture/02_DATABASE_SCHEMA.md:1` (interviews tables), `docs/architecture/04_AI_ARCHITECTURE.md:1`.

---

## Phase 5a — Setup (`interview_coach_setup_careerflow_ai`)

### Tasks

| # | Task | File(s) | Verification |
|---|---|---|---|
| 5a.1 | Create interview tables + interview-answer bucket | `supabase/migrations/007_interviews.sql`, `010_storage_buckets.sql` (extend `interview-answers`) | FK cascades + RLS owner-only confirmed via anon/client split |
| 5a.2 | Extend `JobService` listing for reuse UX | `lib/validation/jobs.ts` picker helper, `components/interview/JobPicker.tsx` | Picker shows `jobs` created by any module |
| 5a.3 | Build `GET /interview` setup page (context + session settings) | `app/(dashboard)/interview/page.tsx`, `components/interview/ContextCard.tsx`, `SessionSettings.tsx` | Radio cards checked state uses `secondary-container` bg — visually matches Stitch screenshot |
| 5a.4 | Implement `POST /api/interviews` (+ first LLM question pre-create) | `app/api/interviews/route.ts`, `lib/services/interviewService.ts` | Returns `interviewId`; row shows `interview_type`/`difficulty`/`question_count` matched |
| 5a.5 | Wire `InterviewQuestionGenerator` | `lib/ai/services/interviewQuestionGenerator.ts` + Gemini provider | Q1 length appropriate (± behavioral vs technical shows STAR vs tech cue) |
| 5a.6 | Sparse-profile warning (<60%) modal | `components/interview/SparseProfileWarning.tsx` | Fires only on <60%; does not block creation |

### Acceptance (5a gate)

- [ ] Dropdown/selector shows all jobs owned by the user across Video Resume and Interview — no module filtering.
- [ ] Interview Focus / Difficulty / Length states behave per design with dot/time hints.
- [ ] Create with `behavioral/mixed/technical` each pre-creates a correctly typed Q1; DB row references `careerProfileVersion`.
- [ ] Rate limit: 6th interview in an hour succeeds, 7th 429 with `Retry-After`.

---

## Phase 5b — Live (`interview_coach_live_session_careerflow_ai`)

### Tasks

| # | Task | File(s) | Verification |
|---|---|---|---|
| 5b.1 | Build `GET /interview/[interviewId]/live` immersive shell | `app/(dashboard)/interview/[interviewId]/live/page.tsx`, `components/interview/QuestionCard.tsx`, `VideoFeed.tsx` | Progress bar `width = qIndex/questionCount *100` verified by inspection |
| 5b.2 | Reuse/refine `useMediaRecorder` for answer capture (duration ≤120s advisory) | `hooks/useMediaRecorder.ts` flag `mode: 'videoResume'|'interviewAnswer'` with different caps | Auto-stop at 120s observed |
| 5b.3 | Implement `GET /api/interviews/:id/next-question` (idempotent fetch or LLM generate) | `app/api/interviews/[id]/next-question/route.ts` | Double GET without answering answer does NOT double-insert |
| 5b.4 | Implement `PUT /api/interviews/:id/answers` (upload answer blob → LLM follow-up engine) | `app/api/interviews/[id]/answers/route.ts` | On Stop Answer, next Q returns within 4s target |
| 5b.5 | Wire `InterviewFollowupEngine` | `lib/ai/services/interviewFollowupEngine.ts` | Follow-up references previous answer hint (tested via mock indicator token) |
| 5b.6 | Implement `PATCH ... { status:'abandoned' }` + `live` resume path | `app/api/interviews/[id]/route.ts` | Abandon then GET /live reloads at last unanswered Q |
| 5b.7 | Typed fallback (no camera) | `components/interview/TypedAnswerFallback.tsx` | Transcript path preserved alongside blob absence |

### Acceptance (5b gate)

- [ ] Progress label `Question N of M` + rail syncs across two consecutive answers and on refresh.
- [ ] Video feed shows pulsing REC badge + mono timer; `Stop Answer` uploads blob and within 4s target loads the next question card (mock path much faster).
- [ ] No duplicate question inserts when double-clicking Stop (idempotency assertion).
- [ ] Exit confirmation modal persists `abandoned` state and the session resumes at the correct Q.
- [ ] Camera denied still lets typed fallback complete the interview; Follow-up Engine executes in both paths.
- [ ] No handler leaks another user's interview by ID (IDOR 403 for cross-user read).

---

## Phase 5c — Results (`interview_coach_results_careerflow_ai`)

### Tasks

| # | Task | File(s) | Verification |
|---|---|---|---|
| 5c.1 | Implement `InterviewFeedbackEngine` (called when `interviews.status → completed`) | `lib/ai/services/interviewFeedbackEngine.ts` | Output fits `interview_feedback` JSON schema; `label∈{needs_work,…}` |
| 5c.2 | Build results bento page | `app/(dashboard)/interview/[interviewId]/results/page.tsx`, `components/interview/ResultsBento.tsx`, `PerformanceBars.tsx`, `AIRecommendation.tsx` | Layout matches Stitch: score 4col | breakdown 8col, then full-width recommendation, then strengths/weaknesses 6col|6col |
| 5c.3 | Implement `GET /api/interviews/:id/feedback` | `app/api/interviews/[id]/feedback/route.ts` | On pre-feedback fetch before engine completes, returns processing state + client polls |
| 5c.4 | Implement `Retry Interview` and `Practice Weak Areas` CTAs | `components/interview/ResultCTAs.tsx` | Correct job context; weak-area filter `dimensions < 70` |

### Acceptance (5c gate)

- [ ] Session marked `completed` becomes `feedback_ready` within 10s target (poll to results shows score after transition).
- [ ] Bento renders: overall `78/100` + Proficient chip, 5 bars (secondary for ≥70, tertiary for <70), full-width AI Recommendation (60–90w markdown), strengths/weaknesses columns with `✓`/`⚠`.
- [ ] Bars reflect stored `interview_feedback` rows — no second LLM call on read.
- [ ] Retry recreates interview with same `jobId`/`type`/`difficulty`/`questionCount`; Practice Weak Areas spawns 3–5Q filtered interview.
- [ ] Results of another user's interview are not readable (RLS 403).

---

## Post-Phase Polish (Phase beyond 5c)

- Build `GET /interview/progress` history view (deferred to Phase 6 patch) — line chart of `overallScore` over time from `interview_feedback` rows; needs no Stitch mock review first.
- Tune feedback rubric after 20 manual test interviews (iterate weighting for `structureSTAR` when `interviewType=behavioral`).

