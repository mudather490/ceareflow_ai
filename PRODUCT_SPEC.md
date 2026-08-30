# PRODUCT SPEC — CareerFlow AI

> One-page-plus condensed product specification. The long-form authorities are `docs/product/01_PRODUCT_OVERVIEW.md`, `docs/product/02_USER_FLOWS.md`, and `docs/product/03_FEATURES.md` (the latter holds every acceptance criterion). This file is the stakeholder-visible summary; changes flow **from** the `docs/product/` bundle **to** here.

---

## 1. Product Statement

**CareerFlow AI** is one SaaS where a single **Career Profile** flows into three private AI outcomes and one public outcome:

```
Career Profile (one per user; versioned resume history + experiences/education/skills/projects)
    │
    ├─► Video Resume: JD understanding → alignment score → scripted intro → MediaRecorder video
    ├─► Public Recruiter Profile: minimal shareable link at /p/[slug] (video + resume + actions)
    ├─► Interview Coach: dynamic Q → video answer → follow-up → scored feedback (8 dimensions)
    └─► Resume AI: ATS/relevance/impact/clarity audit → accept/reject/edit diffs → new resume version
```

The recruiter sees only the public hero. The candidate sees everything else.

---

## 2. Audiences

| Audience | Their next action | Product's answer |
|---|---|---|
| **Candidate** (primary) | Upload resume → tailor → record → share; also practice interviews — not re-uploading the same job context across modules | Single profile + Job deduplication (`description_hash`) + shared `GET /api/jobs` picker |
| **Recruiter** (public viewer) | Scan 30 s: watch intro, open resume, decide | Minimal public page — centered name + title, action row (Play/Download/LinkedIn/Copy link), `aspect-video` hero, single resume card |
| **Product** (internal) | Understand share success + funnel progression | Beacon analytics (`public_profile_views`) + `POST /api/*` event funnels (Phase 8) |

---

## 3. Modules & Status

| Module | Composes | Reuses | Key guardrail | Ship phase |
|---|---|---|---|---|
| **Video Resume** (Step 1 Match) | resume picker + target job form → LLM matcher | `jobs` (deduplicated), `resume_versions` | Score labeled *alignment indicator* (not hire probability); prompt never fabricates | Phase 3a |
| **Video Resume** (Step 2 Script+Video) | script timeline (4 sections) + recorder canvas (MediaRecorder) | `job_matches` → talking points | Anti-fabrication: missing data → `[NEEDS_USER: ...]` badge (yellow dashed) ; max 180 s | Phase 3b |
| **Video Resume** (Step 3 Publish) | copy-link + preview iframe + publish switch | `public_profiles` (nanoid slug) | Slug immutable → share link stable; `is_published` toggle is 404 when draft | Phase 3c |
| **Public Recruiter Profile** | wordmark only top bar → header → hero → resume card | `videos` signed URL (300 s), `resume_versions` signed URL (60 s) | No analytics, JD, or match dashboard visible; page passes axe + Lighthouse ≥95 a11y / ≥90 perf | Phase 3c |
| **Public Analytics** | views/time-series + device/referrer/country breakdowns | `public_profile_views` | Owner only; no raw IP returned; deduped 1 h IP Hash | Phase 4 |
| **Interview Coach** (Setup/Live/Results) | Job picker + session settings → immersive live loop → bento scoring | Same `jobs` list + Career Profile | Dynamic follow-up references previous answer; scoring on 5 bars (Comm/Tech/STAR/Confidence/Conciseness) + AI recommendation | Phase 5 |
| **Resume AI** | resume + job (optional) → analyzer → per-bullet diff editor (accept/reject/edit) → new resume version | `jobs`, `resume_versions` | Never fabricates: missing metric → question, not hallucinated `+30%` | Phase 6 |
| **My Applications** | table of all `jobs` cross-module | — | Filter + row actions bridge modules | Phase 6c |

All items have full acceptance criteria in `docs/product/03_FEATURES.md:1` (`F-00`…`F-60`).

---

## 4. Critical User Journeys (Happy paths only — error states in `docs/product/02_USER_FLOWS.md:1`)

### J-1  First use: Upload → Profile → Dashboard
1. Sign up (email/password or Google OAuth, 8-char minimum) at `/signup`.
2. `GET /onboarding` → **Upload Resume PDF** → extraction review sheet → `PATCH /api/profile` → `career_profiles` persisted.
3. Redirect `GET /dashboard` — welcome header, 82% profile card, Quick Actions (Video/Interview/Resume), Recent Applications table.

### J-2  Video Resume end-to-end (First gig through public)
1. `GET /video-resume` Step 1 (Match Job) → pick `Senior Product Designer (v2)` → enter `title/company/JD` → **Match My Resume** → scored `82%` ring + chip breakdown (Strong/Partial/Missing) + `Talking Points for Video`.
2. `Create My Introduction` → `GET /video-resume/script/{jobId}` Step 2 → 4-section script (Opening/Experience/Skills/Closing)` → `Use Teleprompter` + **Record** (`video/webm`) → **Save** → draft `public_profiles` row minted.
3. `GET /video-resume/publish/{profileId}` Step 3 → `Copy Link` → `Publish` → anon `GET /p/{slug}` verified in second window: hero plays inline, resume downloads.

### J-3  Interview pivot
1. Same user with Job X already existing goes `GET /interview` → picks **Target Job** X from existing list (no JD paste) + `Mixed / Medium / 10Q`.
2. `Start Interview` → `GET /interview/{id}/live` (progress `Question 3 of 10`, AI Insight badge on follow-up) → record/Stop sequence 10 times → `GET /interview/{id}/results` (**78/100 Proficient**, 5 bars, AI recommendation, Strengths/Weaknesses + `Retry`).

### J-4  Resume tailoring after share
1. `GET /resume-ai` → picks resume version + Target Job Y → `Analyze` → 8–16 suggestions (ATS…evidence; if `+30%` missing → question not hallucination).
2. Per-bullet **Accept** → `Apply` → `resume_versions[vN]` created + `GET /career-profile` shows the new lineage.

---

## 5. Non-Goals (Deferred explicitly)

ATS integrations (Greenhouse/Lever), automated application/bot job-apply, team RBAC, mobile native apps, avatar/voice clone video, Python microservice in MVP (`docs/decisions/ADR-001`), second recruiter brand/theme variant until `ADR-004M` supersedes.

---

## 6. Design References

15 directories in `dising stitch/` were inspected:
`careerflow_ai_landing_page`, `sign_up_careerflow_ai`, `user_dashboard_careerflow_ai`, `career_profile_careerflow_ai`, `video_resume_match_job_careerflow_ai`, `video_resume_match_results_careerflow_ai`, `video_resume_recorder_careerflow_ai`, `interview_coach_setup_careerflow_ai`, `interview_coach_live_session_careerflow_ai`, `interview_coach_results_careerflow_ai`, and **4 variants** of the public recruiter profile (`public_profile`, `simplified_public_profile`, `public_recruiter_profile`, `simplified_resume_public_profile`). The canonical token source is `careerflow_ai/DESIGN.md` (`surface`/`secondary=#4648d4`/rounded/typography/spacing).

**Decision on public profile:** the minimal centered variant (`simplified_resume_public_profile_careerflow_ai`) is the implementation reference (`docs/decisions/ADR-004-MINIMAL-PUBLIC-PROFILE.md:1`). The richer bento/full variants are intentionally not built.

---

## 7. Success Metrics (What "good" looks like per vertical)

| Domain | Signal | Source |
|---|---|---|
| Video Resume | `Match p95 <10s`; script placeholder rate <5% missing facts discarded; video completion rate; publish→view conversion | `job_matches.createdAt`, script/video events |
| Public link | `Copy Link` click rate; view→resume-open conversion; referrer family | `public_profile_views` + CTAs (P1) |
| Interview | session completion ratio; feedback score trend per user; weak-area filter CTR | `interviews` → `interview_feedback` |
| Resume AI | suggestion acceptance %; new `resume_versions` creation rate | `resume_suggestions` status transitions |

---

## 8. Known Gaps (Product sign-off required before code)

No Stitch exists for **Resume AI** (UI derived by analogy to existing card/workspace patterns), **My Applications** dedicated table (derived from dashboard's Recent Applications slice), or **Interview Progress** history chart. The derived proposals are in `docs/modules/04_INTERVIEW_COACH.md:1` and `docs/product/04_INFORMATION_ARCHITECTURE.md:1` and captured as open questions `O-001…O-003` in `docs/implementation/06_DEPLOYMENT.md:1`.

