# Module 01 — Video Resume (Workflow 1 → 3)

> First module to be implemented. Covers the three-step workspace: **Match Job → Script + Video → Publish**. All other modules reuse artifacts created here (`jobs`, `job_matches`, `videos`, `public_profiles`) via the shared Career Profile.

Design refs: `video_resume_match_job_careerflow_ai`, `video_resume_match_results_careerflow_ai`, `video_resume_recorder_careerflow_ai` (screen + code inspected).

---

## 1. Purpose & Scope

Turn a **resume version + target job** into:

- a quantified *alignment indicator* (and coaching material), and
- a *personalized intro script* and *video* tailored to that job, and
- a *shareable recruiter link* that is minimal and fast.

**Out of scope:** AI avatar generation, automated video editing, teleprompter voice-over — all deferred.

---

## 2. Data Dependencies

**Reads:** `career_profiles` (hydrated), `resume_versions` (PDF + extracted fields), `jobs` (title/company/JD).

**Writes:** `jobs` (dedup), `job_matches`, `scripts`, `videos`, `public_profiles` (draft on video save).

```
career_profile ──┬── resume_version ──┐
                 │                    └──► job_match (AI)
                 └── job (title/company/JD) ──┘
                                              │
                          script (AI) ◄───────┘
                                              │
                          video (MediaRecorder) ◄──── script
                                              │
                          public_profile ◄─────┘  (slug, publish flag)
```

All FKs carry `user_id` for RLS; no cross-user reads.

---

## 3. Step 1 — Match Job

### 3.1 Screen composition (`video_resume_match_job_careerflow_ai`)

- Header: `Create Your Recruiter Profile` / `Generate a custom video pitch tailored to a specific role.`
- Stepper: **1 Match Job** active (`secondary` ring), 2/3 disabled.
- Bento 2-col grid: Left `Base Resume` card (radio group + Upload New), Right `Target Job Details` card (Job Title, Company, JD textarea + "Paste JD for AI matching" badge), footer CTA **Match My Resume** (`secondary` / indigo).
- Sidebar (desktop) `w-64` with `Video Resume` active, `New Application` CTA.

### 3.2 Inputs & validation

| Field | Type | Validation |
|---|---|---|
| `resumeVersionId` | FK `resume_versions.id` (or pending upload) | Required; must belong to `auth.user` |
| `jobTitle` | string ≤ 120 | Required; trim |
| `company` | string ≤ 120 | Required; trim |
| `jobDescription` | text | Required; min 50, max 20 000 chars; strip control chars |

PDF upload path (radio alternative **Upload New**): same validation as Profile flow (`application/pdf`, ≤10 MB, not encrypted). File is stored synchronously then its new `resumeVersionId` is bound to the match.

**Deduplication:** `jobs` are deduplicated by `sha256(lower(title)|lower(company)|normalizedJD)` per user. If hash exists and `updatedAt < 7 days`, reuse row; otherwise create new. Updates to title/company/JD patch the existing row and invalidate the old `job_match` (mark stale).

### 3.3 AI alignment pipeline

Server route `POST /api/video-resume/match`:

```
1. AuthZ check
2. Validate payload (zod)
3. Upsert job (dedup)
4. Invoke JobParser → { requirements[], requiredSkills[], niceToHave[], qualifications }
5. Invoke ResumeJobMatcher → { score 0..100, strongMatches[], partialMatches[], missingWeak[], talkingPoints[], aiInsight }
   Prompt must:
   - label score as "Job Alignment Indicator" (never probability)
   - use ONLY resume facts + JD requirements (no fabrication)
   - cap at 3-6 items per bucket
   - produce 2-3 talkingPoints tailored to closing gaps
6. Persist job_matches row (FK jobId, resumeVersionId, userId)
7. Return jobMatchId
Rate limit: 10 / hour / user (Redis or Supabase counter)
Timeout: 8s soft, 15s hard → retry affordance
```

### 3.4 Results screen (`video_resume_match_results_careerflow_ai`)

Bento: Left (col 4) score ring + AI insight mini-card; Right (col 8) skills breakdown + talking points list.

- **Score ring:** SVG pair `r=45`, `stroke-dasharray 282.7`, `stroke-dashoffset = 282.7 * (1 - score/100)` (verified in inspected code: 82% → offset 50.8). Color `#4648d4` (secondary). Label under: "Strong alignment…" / gap summary.
- **Skills chips:** `Strong Match` (green dot) `bg-surface` etc., `Partial` yellow, `Missing / Weak` `bg-error-container text-error`. Chips are `rounded-full text-label-sm`.
- **Talking Points:** list items with `check_circle` + title + description in white inset card `hover:shadow-[0px_4px_20px_rgba(15,23,42,0.05)]`.
- **CTAs:** `Edit Job` (border) returns; `Create My Introduction` (secondary/indigo) proceeds to Step 2.

**UX states:** loading spinner while match pending; error banner with retry; empty JD blocked.

### 3.5 Acceptance criteria — Step 1

- [ ] User can pick an existing resume radio OR upload new PDF and proceed without reload.
- [ ] All three job fields required; inline errors; JD badge present.
- [ ] Match CTA has disabled+pending states and avoids double submit.
- [ ] Successful match renders results page with correct score ring math, chips partitioned correctly, ≥2 talking points.
- [ ] Score caption reads "alignment indicator" and does NOT imply hiring probability.
- [ ] "Create My Introduction" forwards with preserved `jobMatchId`; "Edit Job" returns with fields pre-filled.

---

## 4. Step 2 — Personalized Script + Video Recorder

### 4.1 Script generation

Trigger: auto on entering Step 2 if no `scripts` row for this `(userId, jobId)`; also on user action.

Inputs to `ScriptGenerator`:

```json
{
  "careerProfile": { "name","title","summary","experiences","skills","projects" },
  "resumeVersionId": "uuid",
  "job": { "title","company","description" },
  "jobMatch": { "strongMatches","missingWeak","talkingPoints" }
}
```

**Prompt invariants (enforce in `docs/architecture/04_AI_ARCHITECTURE.md:1`):**

1. Do NOT invent: experience, metrics, tech stacks, responsibilities, education, company names.
2. For missing evidence needed to make a claim, emit `[BRACKET PLACEHOLDER: ask user for X]` and the UI surfaces a yellow dashed `Ask User` badge.
3. Target 90–150 seconds spoken duration (~120–190 words); broken into `opening | experience | skills | closing`.
4. Tone: natural, confident, recruiter-focused (not salesy); use first person.
5. Call out `talkingPoints` explicitly in the `experience`/`skills` section where they close a gap.

Outputs persisted as `scripts` { `opening`, `experience`, `skills`, `closing`, `wordCount`, `promptHash`, `model`, `createdAt` }. Updating `career_profile` or `job` does not auto-overwrite the script — user must Regenerate.

**Script UI** (left panel, `lg:w-5/12`):

- Sticky header: `AI Script` + Regenerate (refresh) + Edit (pencil) icons; floating `Generated` badge (indigo-100) on content.
- Vertical timeline (pl-6 + `before:w-[2px]` rail + orange→gray dots per section on `video_resume_recorder_careerflow_ai`).
- Four section cards (white, rounded-lg, border-slate-200, `shadow-sm` on hover).
- Footer: italic note "This script is personalized …" + pair `Shorten` (border) / `Use Teleprompter` (secondary) buttons. Extended variants: `Regenerate` (re-run), `Shorten` (~30% reduction), `Make Natural` (rewrite for conversational).

### 4.2 Video recording

**Shell** (right panel, `flex-1 bg-neutral-900`):

- Top HUD: red pulsing `REC` + `00:00:00` timer (`glass-card` pill) + settings gear.
- Teleprompter overlay: centered, `text-2xl font-display` white over gradient, scrolling at `teleprompterSpeed` (user slider hidden in MVP). Controlled via `Use Teleprompter` button.
- Bottom controls: large red record ring (`w-20 h-20 border-4 border-white/30` with inner `bg-red-500`) + secondary row `Audio On` / `Blur BG`.
- Background: webcam stream (`getUserMedia({video:true,audio:true})`). For now `Blur BG` is a stub (future: client-side segmentation or server flag).
- Post-capture: `Preview` modal with `<video controls>` + `Retake` + `Save`; or **Upload Video** fallback input.

MediaRecorder config:

```js
const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
let chunks = []; mr.ondataavailable = e => chunks.push(e.data);
mr.onstop = () => {
  const blob = new Blob(chunks, { type: 'video/webm' });
  // validate duration ≤ 180s via <video>.duration
  // POST /api/video-resume/video { jobId, blob }
};
```

Constraints: ≤ 180 s (auto-stop), single track per capture, fallback `video/mp4` for Safari.

**Storage path:** `videos/{userId}/{jobId}/{uuid}.webm`. Row `videos` holds `storagePath`, `mimeType`, `durationSec`, `fileSize`, `status` (`processing|ready|failed`), `thumbnailPath` (auto-generated first frame server-side later).

### 4.3 Acceptance criteria — Step 2

- [ ] Entering Step 2 with no script auto-generates one (skeleton → cards); existing script loads instantly.
- [ ] Edit inline persists; Regenerate replaces; Shorten reduces word count; Make Natural preserves placeholders.
- [ ] No script contains fabricated metrics (audited: placeholders appear when data absent; no hallucinated `+30%`).
- [ ] Camera permission denial shows helper copy + Upload fallback; timer enforces ≤180s; teleprompter toggle works mid-recording.
- [ ] Save persists video to Storage + `videos` row; Preview → Retake discards; Edit back-navigation preserves script.
- [ ] After save, a draft `public_profiles` row exists with `isPublished=false` and unique slug.

---

## 5. Step 3 — Publish

Route `GET /video-resume/publish/[profileId]` (not mocked but analogous to `public_profile` preview):

- Share card: `Copy Link` (`/p/{slug}`) + **Preview** (iframe recruiter page `?preview=true` which uses auth, bypasses publish flag) + **Edit** (back to Step 2).
- Publish switch → `PATCH /api/public-profile/:id { isPublished: true }`. Unpublish flips back; slug is unchanged.
- Owner analytics stub links to `GET /analytics?profileId=`.

**Acceptance criteria:**

- [ ] Copy Link writes canonical URL and toasts.
- [ ] Publish makes `GET /p/[slug]` return 200 publicly; Unpublish reverts to 404 within 5s.
- [ ] Preview iframe matches recruiter rendering.

---

## 6. Error & Edge Handling Summary

| Condition | Behavior |
|---|---|
| Job JD too short (<50) | Inline label error; CTA disabled |
| AI match timeout | Banner "Analysis is taking longer…" + Retry |
| Script generation rate-limit | 10/min/user; shows cooldown |
| MediaRecorder not supported | Show Upload input directly |
| Uploaded video >100 MB / >180s | Toast + re-select helper |
| Leaving Step 2 mid-record | `beforeunload` warning if blob dirty |
| Double publish click | Idempotent `isPublished=true` |

---

## 7. Security Notes

- RLS: `job_matches`, `scripts`, `videos`, `public_profiles` all scoped by `user_id`.
- Public reads (`/p/[slug]`) go through a service-role bypass that only exposes `{ name, title, location, summary, experiences, education, skills, videoUrl (signed), resumeUrl (signed) }` — never `job_description`, `job_match`, or `analytics`.
- Signed URLs: TTL 60s for resume; 300s for video stream; generated server-side.
- Signed view beacon `POST /api/public/:slug/view` is public but rate-limited (10/hour/IP) and never returns row data.

---

## 8. Implementation Phasing

- Phase 3a: Step 1 (job + match pipeline)
- Phase 3b: Step 2 (script + recorder)
- Phase 3c: Step 3 (publish/share) + public analytics stub
- Each phase independently testable behind feature flag `videoResume` (`docs/implementation/02_VIDEO_RESUME.md:1`).

