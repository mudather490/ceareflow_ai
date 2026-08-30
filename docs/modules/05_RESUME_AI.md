# Module 05 — AI Resume Improvement

> Third major module (Phase 6). Feeds off the same Career Profile + Jobs as Modules 1–2 but does NOT depend on them having been completed. The user can arrive cold and "Improve my resume" is the first flow.

**Important:** No Stitch mock exists for this flow — the spec derives from product requirements (§5), the existing `DESIGN.md` tokens/typography/card patterns, and the dashboard's "Resume AI (12 Suggestions)" card. The two-pane editor is modeled after the Video Recorder's two-column workspace.

---

## 1. Purpose & Scope

Audit the candidate's resume for:

- **ATS compatibility** (parse-ability, structure, verbosity)
- **Job relevance** (relevance of each bullet to target role)
- **Achievement impact** (action verbs, scope, quantified results)
- **Clarity & conciseness** (length, filler, repetition)
- **Skills evidence** (whether claimed skills are substantiated by bullets)
- **Structure & professional language** (ordering, headings, tone)
- Weak / repeated / unsupported bullets, missing evidence opportunities

Then present **actionable suggestions** that the candidate can **Accept / Reject / Edit** one-by-one. Each *accepted* change builds a new immutable **resume version**.

**Hard rule:** AI never fabricates: experience entries, titles, dates, technologies, metrics, or responsibilities. If a metric is missing, the suggestion must be phrased as a question that asks the user to supply it (e.g. "Could you quantify how many users/processes were impacted?").

---

## 2. Inputs & Outputs

| Aspect | Detail |
|---|---|
| **Inputs** | Candidate picks one `resume_versions` row (radio like Video Step 1) + *optionally* picks a target `jobs` row (reuse picker). Both reuse the shared selectors. |
| **AI inputs** | `resumeVersion` text content + optional `job` JD + optional `career_profile` hydrated data (extra skills/projects to substantiate). |
| **Outputs** | `resume_analyses` (audit summary + category scores) + `resume_suggestions[]` (per-bullet diff proposals) → then a new `resume_versions[vN]` on Apply. |
| **Artifacts written** | `resume_analyses`, `resume_suggestions`, new `resume_versions`, optional `resumes` PDF re-render (defer generation to server-side render if needed). |

If no job is chosen, analysis is run in **generic** mode (structure, ATS, language only) — still valuable but without relevance scoring.

---

## 3. Flow — Upload / Analysis

### 3.1 Route `GET /resume-ai`

UI (proposed — aligns with Video Resume Step 1 bento + Dashboard cards):

- Header: `Resume AI` + `Get ATS-aware, evidence-based improvements tailored to your target role.`
- Two option cards (grid):
  - **Base Resume** picker: same radio list (v's + last-updated) + `Upload New PDF` (→ creates `resume_versions`).
  - **Target Job** picker (optional): same `jobs` selector as Interview Setup / Video Step 1 — `(+ New)` inline.
- CTA row: `Analyze Resume` (`secondary` AI button `auto_awesome`). Disabled until resume selected.

### 3.2 Analysis pipeline

`POST /api/resume-ai/analyze`

```
1. AuthZ + validate { resumeVersionId, jobId? }
2. Load resumeVersion.textContent + job? + career_profile (read)
3. Invoke ResumeAnalyzer service:

   Prompt contract (see docs/architecture/04_AI_ARCHITECTURE.md:1):
   - Return JSON: {
       summary: string,
       categoryScores: { ats, relevance, impact, clarity, structure } (0..100),
       suggestions: [
         {
           category: 'ats'|'relevance'|'impact'|'clarity'|'structure'|'evidence',
           target: { experienceId?, bulletIndex, originalText },
           suggestedText: string OR null (if question),
           prompt: string (if clarification needed, e.g. "What was the adoption %?"),
           reasoning: string,
           confidence: 0..1
         }
       ]
     }
   - Anti-fabrication constraint embedded (equivalent to SCRIPT non-fabrication prompt variant)
   - Cap: 8–16 suggestions, ranked; deduplicate by target bullet
   - If JD present, add relevance scoring per bullet

4. Persist resume_analyses { id, userId, resumeVersionId, jobId?, summary, categoryScores, model, promptHash }
5. For each suggestion → INSERT resume_suggestions { analysisId, ... , status='pending' }
6. Return analysisId
```

**Latency:** 6–10s target for a 1-page resume + JD; spinner + streaming is acceptable (see API architecture).

---

## 4. Flow — Analysis / Editor

### 4.1 Route `GET /resume-ai/[analysisId]`

**Bento (proposed — two-pane):**

```
<Header: Analysis Summary + Category chips (ATS 82 • Relevance 76 • Impact 64) + Summary paragraph + AI label>

<Two-pane>
  Left (45%): Original Bullets — stacked white cards
    [ ] "Worked on machine learning models."   ← original
  Right (55%): Suggestion — per-bullet card
    <Badge: category Impact> + AI spark icon
    <Diff: strikethrough original → highlighted suggestedText>
    <Reasoning: 1 line>("Add technology + verb + outcome")
    <Prompt if fabric-free question: "Could you quantify model accuracy lift?">
    [Row: Reject (border) | Edit (ghost) | Accept (secondary) ]
</Two-pane>

<Footer: Apply (n accepted) → creates new Resume Version  [primary, disabled if 0]  ]
         Download updated PDF (after apply)
```

**Category colors:** reuse chip system — `Strong/Needs Work` dots not needed here; use `label-sm` `rounded-[4px]` badges: `bg-indigo-50 text-secondary` for AI-suggested bullets, `bg-error-container` deferred for required fixes.

### 4.2 Suggestion lifecycle

For each `resume_suggestions` row:

```
status: pending
  ├─ (user clicks Accept)    → POST /api/resume-ai/suggestions/:id/accept
  │                            server validates suggestion still applies to this resumeVersion
  │                            status → 'accepted'
  ├─ (user clicks Reject)    → status → 'rejected'
  └─ (user clicks Edit)      → textarea opens (pre-filled with suggestedText or blank)
                               User edits → textarea → Save Edit
                               → status → 'accepted' with overridden editedText
```

Accepted suggestions are not yet written to the resume — they are staged.

### 4.3 Apply — Versioning

`POST /api/resume-ai/analyses/:analysisId/apply`

```
1. Gather all resume_suggestions where status='accepted' for this analysisId
2. Validate they belong to this user + this analysis (RLS)
3. Build new resumeVersion textContent by applying accepted diffs to the base resumeVersion's extracted fields
   (operate on structured data: experiences[].bullets[].text — not raw PDF bytes)
4. Compute hash(content) — if identical to latest version, return 409 "No net change — adjust or reject."
5. INSERT resume_versions { resumeId, versionNumber = max+1, content, hash, parentAnalysisId }
6. Optionally enqueue server-side PDF render (deferred: HTML→PDF via puppeteer; beyond MVP minimal text view is ok)
7. Mark analysis as appliedAt
8. Return new resumeVersionId + redirect GET /career-profile?highlight=new
```

All `resume_versions` are **immutable** — no UPDATE is ever issued; history remains readable at `GET /api/profile/resume-versions`.

---

## 5. Pedagogical Pattern

Every accepted change creates a teaching moment — the suggestion's `reasoning` is kept associated with the new version and can be re-surfaced in a small tooltip on the Career Profile experience bullet until dismissed.

Example (from PRD §5):

> Original: `"Worked on machine learning models."`
> Suggested: `"Developed machine learning classification models using Python and Scikit-learn."`
> Reasoning: `"Specify model type + technology + action verb; impact metric still missing — consider adding accuracy lift."`
> Next action: yellow dashed prompt card `Tell us more: what accuracy improvement did this drive?`

---

## 6. Acceptance Criteria

- [ ] `GET /resume-ai` requires a resume version; optional job picker reuses the shared Job selector and does not duplicate rows.
- [ ] `Analyze Resume` invokes analyzer and within 10s lands user in editor with summary + 8–16 suggestions, each categorized.
- [ ] No suggestion introduces a fabrication (metric, tool, responsibility not present in base resume or career profile) — verified by sampling; missing data yields a `prompt` question instead of hallucinated `+30%`.
- [ ] Per-suggestion Accept/Reject/Edit work and persist status.
- [ ] Edit opens inline textarea; saving uses the edited text for apply.
- [ ] `Apply` with ≥1 accepted suggestion creates an immutable new `resume_versions` row; with 0 it stays disabled; with no-net-change it errors 409.
- [ ] Applied version remains retrievable and linked to the originating `resume_analyses` row.
- [ ] Flow works both with and without a target job (generic vs job-tailored suggestions).
- [ ] All writes are RLS-scoped; user cannot analyze or mutate another user's resume versions.

---

## 7. Security Notes

- All `resume_analyses` + `resume_suggestions` rows gated by `user_id`.
- JD used for relevance scoring must not leak to public profile.
- Uploaded PDF for "Upload New" follows the same PDF validation as Flow 1a (MIME, 10 MB, not encrypted).

---

## 8. Open Questions

- Server-side PDF *re-rendering* quality: whether to ship a text-only "Resume Viewer" MVP vs an HTML→PDF render (puppeteer + template). Decision affects whether users can download a pixel-perfect updated PDF in v1. Documented in `docs/decisions/` + `docs/architecture/05_STORAGE_AND_VIDEO.md:1`.
- Relevance scoring calibration needs UX research once real JDs are used.
