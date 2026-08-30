# Implementation — 02 Video Resume (Phase 3)

> Phased plan for the first module to ship. Split into **Phase 3a (Match), 3b (Script+Video), 3c (Publish+Analytics stub)** — each phase independently reviewable and testable. This file is the canonical execution checklist; update it with links to PRs as each sub-phase lands.

Refs: `docs/modules/01_VIDEO_RESUME.md:1`, `docs/modules/02_PUBLIC_PROFILE.md:1`, `docs/architecture/{02,03,04,05,07}.md`.

---

## Phase 3a — Match Job (Step 1 + Results)

### Goal

A user can pick/upload a resume, create a job, and receive a persisted AI alignment result — all without reaching into video or publishing. No AI key on the client.

### Tasks

| # | Task | File(s) | Verification |
|---|---|---|---|
| 3a.1 | Create `jobs` and `job_matches` tables + RLS migrations (DDL from `02_DATABASE_SCHEMA.md:1`) | `supabase/migrations/004_jobs.sql` | `psql` direct query with auth JWT + anon attempt is 403 |
| 3a.2 | Add shared `JobService` + zod schemas | `lib/validation/jobs.ts`, `lib/services/jobService.ts` | zod unit test (`npm test` placeholder) |
| 3a.3 | Build `video_resume_match_job_careerflow_ai` replica | `app/(dashboard)/video-resume/page.tsx`, `components/video-resume/ResumeSelector.tsx`, `components/video-resume/JobForm.tsx` | Visual comparison with Stitch screenshot (same stepper, bento, badges) |
| 3a.4 | Implement `POST /api/video-resume/match` (validate → upsert job → call `ResumeJobMatcher`) | `app/api/video-resume/match/route.ts` | curl happy path + mocked provider; unauth 401 |
| 3a.5 | Wire `AI Service layer` for `JobParser` + `ResumeJobMatcher` + MockProvider (feature stage `VIDEO_RESUME_MATCH_MOCK=1` can force mock) | `lib/ai/services/*`, `lib/ai/providers/{gemini,mock}.ts` | Unit: provider swap retains shape |
| 3a.6 | Build results page `video_resume_match_results_careerflow_ai` | `app/(dashboard)/video-resume/match/[matchId]/page.tsx`, `components/video-resume/MatchScoreRing.tsx`, `SkillsBreakdown.tsx`, `TalkingPoints.tsx` | Ring math: offset = 282.7*(1-score/100) verified per spec |
| 3a.7 | Dedup guard + rate limit (10/h/user) | `lib/rateLimit.ts` + `app/api/video-resume/match/route.ts` | cursed 11th request 429 |

### Acceptance (3a gate)

- [ ] Existing resume radios + Upload New both work through to `POST .../match`.
- [ ] Valid form produces a row in `jobs` + `job_matches`; results page renders ring + chips + talking points from that row.
- [ ] Score caption reads *alignment indicator* — wording audited (screenshot).
- [ ] Rate-limit's 11th request 429 with `Retry-After`; valid 10 succeed.
- [ ] `MockProvider` toggle renders deterministic canned missing/partial/strong sets and keeps tests green offline.

---

## Phase 3b — Script + Video Recorder (Step 2)

### Goal

The Step 2 two-column workspace (script timeline + dark recorder canvas) with anti-fabrication hardening.

### Tasks

| # | Task | File(s) | Verification |
|---|---|---|---|
| 3b.1 | Create `scripts`, `videos`, `public_profiles` tables + bucket `videos` | `supabase/migrations/005_video_resume.sql`, `supabase/migrations/010_storage_buckets.sql` | FK checks pass; bucket limits match docs |
| 3b.2 | Wire `ScriptGenerator` + anti-fabrication middleware | `lib/ai/services/scriptGenerator.ts`, `lib/ai/safety/nonFabrication.ts` | Non-fabrication suite pass (corpus) |
| 3b.3 | Build script panel (timeline + section cards + variants) | `components/video-resume/ScriptPanel.tsx`, `components/video-resume/ScriptTimeline.tsx`, `app/(dashboard)/video-resume/script/[jobId]/page.tsx` | Regenerate/Shorten/Natural variants keep placeholders |
| 3b.4 | Build `useMediaRecorder` hook | `hooks/useMediaRecorder.ts` | Chrome/Firefox/Safari matrix |
| 3b.5 | Build recorder canvas (dark `neutral-900`, REC pill, teleprompter, preview modal, upload fallback) | `components/video-resume/VideoRecorder.tsx`, `app/(dashboard)/video-resume/script/[jobId]/components/RecorderShell.tsx` | Timer observably stops at 180s |
| 3b.6 | Implement `POST /api/video-resume/video` | `app/api/video-resume/video/route.ts`, `lib/storage/video.ts` | File storage + `videos` row + `public_profiles` draft slug created |
| 3b.7 | Implement `GET/POST/PATCH /api/video-resume/script` | `app/api/video-resume/script/route.ts` | Auto-generation on missing row |

### Acceptance (3b gate)

- [ ] Visiting Step 2 with no script auto-generates 4 sections (Opening/Experience/Skills/Closing) within p95 ≤6s on provider-capable path (mock path <500ms).
- [ ] `Edit` inline persists; `Shorten` reduces word count ~30% with placeholders preserved; `Natural` preserves them too — audited via edited transcript diff.
- [ ] Script text containing `[NEEDS_USER: ...]` renders with yellow-dashed prompt card (not plain text).
- [ ] Recorder: permission-denied shows helper + Upload fallback; REC timer ≤180s; teleprompter toggles mid-record; preview + save pipeline creates Storage object readable via signed URL.
- [ ] After save, a draft `public_profiles` row exists with `isPublished=false` and nanoid slug — inspectable via `GET /api/public-profile/:id` (owner-only).

---

## Phase 3c — Publish & Share (Step 3 + public bootstrap)

### Goal

A candidate can publish their recruiter link, copy it, and the recruiter can see only the minimal contents.

### Tasks

| # | Task | File(s) | Verification |
|---|---|---|---|
| 3c.1 | Build `GET /video-resume/publish/[profileId]` share page (owner) | `app/(dashboard)/video-resume/publish/[profileId]/page.tsx`, `components/video-resume/PublishCard.tsx` | Publish toggle wired |
| 3c.2 | Implement `PATCH /api/public-profile/:id` | `app/api/public-profile/[id]/route.ts` | idempotent + RLS |
| 3c.3 | Build recruiter page `GET /p/[slug]` (minimal chosen variant) — include ViewBeacon | `app/p/[slug]/page.tsx`, `components/public-profile/HeroVideo.tsx`, `ResumeCard.tsx`, `ViewBeacon.tsx` | Page source contains no job/Match/script keys |
| 3c.4 | Implement public APIs: `GET /api/public/:slug` + `POST /api/public/:slug/view` (dedup, hashing) | `app/api/public/[slug]/route.ts`, `app/api/public/[slug]/view/route.ts`, `lib/analytics/{hash,channel}.ts` | `POST .../view` increments exactly once per hour per IP |
| 3c.5 | Handle signed URL minting (`resumes` 60s, `videos` 300s) | `lib/storage/signedUrl.ts` | Video plays inline; resume View/Download work |
| 3c.6 | Wire owner analytics *read* stub on the Publish page (`link to /analytics?profileId=`) — full analytics in Phase 4 | `components/video-resume/PublishAnalyticsLink.tsx` | Link deep-links |

### Acceptance (3c gate)

- [ ] `Copy Link` copies canonical `/p/{slug}` + toasts.
- [ ] Publishing toggles make `GET /p/[slug]` 200 vs 404 respectively.
- [ ] `GET /p/[slug]` source shows only the public boundary fields (`docs/architecture/07_SECURITY.md:1` §4) — verified by grep for private column names in HTML dump.
- [ ] Recruiter playback (video + resume) works with short-lived URLs; expired URL after 6 minutes correctly 403s on direct signed fetch.
- [ ] View beacon dedup verified (double curl within hour → 1 row).

---

## 9. Hardening & Testing in Phase 3

- **Visual:** Screenshot diff vs Stitch for Step 1, Results, Recorder, and Minimal Public page — no drift beyond token-named colors.
- **Security:** IDOR attempt (fetch `/api/video-resume/match/{otherUserMatchId}`) → 403.
- **Non-fabrication:** Run the corpus test suite (field missing → placeholders emitted, not hallucinated `+25%`).
- **Edge:** Resume encrypted PDF → rejected with safe copy; scan-image-only PDF → warning but accepted.

---

## 10. Exit Criteria (Full Video Resume module)

- [ ] 3a, 3b, 3c gates all green.
- [ ] End-to-end smoke: upload → match → script → record 15s → save → publish → verify `/p/[slug]` in anonymous browser window.
- [ ] Owner analytics read stub reachable via deep-link.
- [ ] Docs updated: any discovered schema deviation has ADR + `02_DATABASE_SCHEMA.md` amendment PR.

