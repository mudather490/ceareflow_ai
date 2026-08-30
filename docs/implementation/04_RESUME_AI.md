# Implementation — 04 Resume AI (Phase 6)

> Modules `Resume AI` + finishing touches on `My Applications` and `Settings`. Resume AI reuses the same `jobs` + `resume_versions` picker patterns from Phase 3/5 and does NOT depend on having completed those flows.

Refs: `docs/modules/05_RESUME_AI.md:1`, `docs/architecture/{02,03,04,07}.md`.

---

## Phase 6a — Analysis

### Tasks

| # | Task | File(s) | Verification |
|---|---|---|---|
| 6a.1 | Create `resume_analyses` + `resume_suggestions` tables + RLS | `supabase/migrations/008_resume_ai.sql` | RLS owner-only checked via anon deny + cross-user 403 |
| 6a.2 | Build `GET /resume-ai` upload/pick page (resume radios + optional job picker) | `app/(dashboard)/resume-ai/page.tsx`, `components/resume-ai/ResumePicker.tsx`, `components/resume-ai/JobPicker.tsx` | Same picker reuse patterns — no new duplicate pickers invented |
| 6a.3 | Wire `ResumeAnalyzer` (+ JobParser reuse) | `lib/ai/services/resumeAnalyzer.ts` (+ `lib/ai/safety/nonFabrication.ts`) | Analyzer output fits `resume_analysis` + daily capped suggestions count 8–16 |
| 6a.4 | Implement `POST /api/resume-ai/analyze` | `app/api/resume-ai/analyze/route.ts` | 10s p95; after mock in test ~500ms |
| 6a.5 | Build summary header (categoryScore chips + AI Insight) | `components/resume-ai/AnalysisHeader.tsx` | Generic vs job-tailored chips diverge |

### Acceptance (6a gate)

- [ ] `GET /resume-ai` gates on having at least one `resume_versions` row; `Analyze Resume` CTA disabled until one is picked.
- [ ] Job picker, if left empty, triggers generic analysis; if job provided, relevance category is scored.
- [ ] Analyzer invokes without leaking EB key to client; no raw DB/AI exception bubbled.

---

## Phase 6b — Suggestion Editor + Versioning

### Tasks

| # | Task | File(s) | Verification |
|---|---|---|---|
| 6b.1 | Build `GET /resume-ai/[analysisId]` two-pane editor | `app/(dashboard)/resume-ai/[analysisId]/page.tsx`, `components/resume-ai/SuggestionPane.tsx`, `OriginalBullets.tsx` | Diff highlight visuals (strikethrough → suggestion) render |
| 6b.2 | Implement `GET` + per-suggestion endpoints | `app/api/resume-ai/analyses/[id]/route.ts`, `app/api/resume-ai/suggestions/[id]/*` routes | Accept/Reject/Edit status transitions persisted correctly |
| 6b.3 | Implement inline Edit textarea flow (`editedText`) | `components/resume-ai/EditSuggestion.tsx` | Save uses `editedText`, not re-deriving from model |
| 6b.4 | Implement `POST /api/resume-ai/analyses/:id/apply` + resume version immutability | `app/api/resume-ai/analyses/[id]/apply/route.ts` | Creates new `resume_versions[vN]`; history remains readable |
| 6b.5 | Handle hash-dedup + 409 no-net-change | Same handler + `lib/validation/resumeAi.ts` | 409 path tested |

### Acceptance (6b gate)

- [ ] Editor loads 8–16 suggestions each with category badge + reasoning + Accept/Reject/Edit row (per `docs/modules/05_RESUME_AI.md:1` diff).
- [ ] Edit path and Accept with no edit both persist to `suggestions` status `accepted`; Reject → `rejected`.
- [ ] `Apply` with 0 accepted stays disabled; with 1+ accepted creates a new `resume_versions` row where `versionNumber = max+1` immutably; previous versions unchanged on follow-up `GET .../resume-versions`.
- [ ] Trying to apply with accepted diffs that net to identical content yields `409 CONFLICT` "No net change…"
- [ ] After apply, the candidate can navigate to Career Profile and see the applied version is the newest linked version.
- [ ] Cross-user `GET /api/resume-ai/analyses/{otherAnalysisId}` 403s.

### Non-fabrication suite

- Needle test: resume body `Worked on ML models.` with career profile that *lacks* `Python/Scikit-learn` evidence does NOT receive suggestion naming those technologies. Counters: with evidence present (profile mentions Python) a specific suggestion may include it.
- Corpus test: 12 synthetic resumes each intentionally missing one metric produce only `prompt` questions, not hallucinated `+30%` claims.
- Verified both via MockProvider (always green) and live spot-checks.

---

## Phase 6c — My Applications + Settings

### My Applications (`GET /applications`)

Build `app/(dashboard)/applications/page.tsx` — table reusing dashboard Recent Applications schema, adding filters (status dropdown) and row action menu:

- Row actions: `Open Video Resume for this job → GET /video-resume?jobId=`, `Start interview for this job → GET /interview?jobId=`, `View analytics → GET /analytics?profileId=` (if linked profile exists).

Verify: table empty state as above.

### Settings (`GET /settings`)

Build `app/(dashboard)/settings/page.tsx` — sections:

- Account (read `users.display_name`, `users.email`, editable name).
- Public visibility (toggle `is_published` across profile list — links back to `public_profiles`).
- Storage usage bar (bytes of `videos+resumes+answers` relative to 500 MB soft cap — query `storage.objects` size via service role helper).
- Privacy links.
- Danger zone: `Delete my account` with typed confirm `DELETE`. Calls `DELETE /api/profile` worker which enumerates storage keys for the user and deletes before removing `users` row (cascade).

---

## Phase 6 Exit Criteria

- [ ] End-to-end: Upload (new job optional) → analyze (<10s) → Accept edits → Apply → see new version on Profile.
- [ ] `GET /applications` renders cross-module job union with at least Video Resume and Interview jobs.
- [ ] `GET /settings` Account section edits RT-effectively; Delete-account irreversibly cascades (verify via DB/Storage absence after call).
- [ ] `npm run lint` green; no eslint exception bypasses `no-restricted-imports`.

