# Product Overview — CareerFlow AI

> **Source of truth** for Phase 0 blueprint. No application code is generated in this phase; this document defines the product vision, market positioning, and module boundaries that all downstream architecture and implementation files must conform to.

---

## 1. Vision Statement

**CareerFlow AI** is *one* integrated AI-powered career SaaS platform that turns a single **Career Profile** into three outcomes:

1. A recruiter-ready **Video Resume + Public Profile** (minimal, fast, shareable)
2. Measurable progress via an **AI Interview Coach** (dynamic, contextual, scored)
3. A higher-quality resume via **AI Resume Improvement** (ATS-aware, evidence-based, non-fabricating)

The user never uploads the same resume twice, never re-creates the same job context, and never feels they are switching between three unrelated products. Every module reads from and writes to the **Career Profile** — the central source of truth.

```
                    CAREER PROFILE (1 per user, versioned)
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
    VIDEO RESUME    AI INTERVIEW    RESUME AI
    + PUBLIC LINK   + TRAINING      + IMPROVEMENT
```

---

## 2. Problem + Audience

| Audience | Core pain | How CareerFlow AI resolves it |
|---|---|---|
| **Job seeker / career switcher** (primary) | Generic applications, low interview preparation, difficulty standing out to recruiters | One profile that tailors itself per job: AI job-alignment, scripted video intro, structured interview practice, iterative resume improvement |
| **Recruiter** (viewer of public link) | No time to parse long resumes, no signal on communication skills | Minimal public page: name + title + video (prominent) + resume view/download + copy link. No dashboard noise. |
| **Hiring-platform adjacent** (future) | N/A in MVP | Public profile is link-shareable without login; future embeds/APIs can build on the same `public_profiles` table |

**Non-audience (MVP):** Enterprises wanting ATS integrations, automated job applications, or bulk team management — explicitly out of scope until Phase ≥ 8.

---

## 3. Central Product Principle

### 3.1 The Career Profile is the single source of truth

A user uploads a resume **once**. The parser extracts:

- Personal info (name, title, location, contacts, links)
- Summary / About
- Experience (company, title, date range, location, bullets)
- Education (institution, degree, field, dates)
- Skills (groupable by category)
- Projects, Certifications, Awards (optional)

That extraction hydrates the editable **Career Profile** (`career_profiles` + child tables). All downstream features derive from it:

| Feature | Reads | Writes |
|---|---|---|
| Video Resume Step 1 (Match) | `career_profile` + selected `resume_version` + `job` | `job_matches` |
| Video Resume Step 2 (Script + Video) | `career_profile` + `job` + `job_match` | `videos` + `scripts` + `public_profiles` slug |
| Public Profile (public link) | `public_profile` + `video` + `resume_version` (signed URL) | `public_profile_views` (analytics) |
| Interview Coach setup/live/results | `career_profile` + `job` | `interviews` → `questions` → `answers` → `feedback` |
| Resume AI analysis/editor | `resume_versions` + optional `job` | `resume_analyses` → `resume_suggestions` → new `resume_version` |

**Rule:** No module may create its own duplicate of `users`, `resumes`, `jobs`, or `skills`. If a duplicate entity is proposed, it must be rejected in design review (`docs/decisions/ADR-002-SHARED-CAREER-PROFILE.md:1`).

### 3.2 One job = one context that all modules can reuse

```
User uploads resume  →  Career Profile
User creates Job     →  { title, company, description, status }  (e.g. "ML Engineer — Google")
        |
        +-- linked to a resume_version
        +-- linked to a job_match
        +-- linked to a video / public_profile
        +-- linked to zero or more interviews
        +-- linked to zero or more resume_analyses
```

Switching from *Video Resume* to *Interview Coach* when a Job already exists must **not** require re-upload or re-pasting the JD. The UI selector is: `Choose from My Applications` vs. `Create new job`.

---

## 4. Module Summary (Detailed specs in `docs/modules/`)

### Module 1 — Video Resume + Public Recruiter Profile (First to implement)

**Workflow:** 3 steps with enforced linear progression but reversible:

1. **Match Job** (`docs/modules/01_VIDEO_RESUME.md:1`): PDF upload + job title/company/JD → AI alignment analysis (strong/partial/missing skills, score as *alignment indicator* — never "hire probability").
2. **Script + Video** (`docs/modules/01_VIDEO_RESUME.md` Step 2): AI script draft from Resume + Profile + Job + Match → user edit/regenerate/shorten/make-natural → browser MediaRecorder capture → preview/retake → persists as `videos` row + storage object.
3. **Public Profile** (`docs/modules/02_PUBLIC_PROFILE.md:1`): Minimal page at `/p/[slug]`. Auth is NOT required to view. Contains: name, title, video (hero), View Resume, Download CV, Copy Link. No analytics, no match dashboard, no chat.

See also `docs/modules/03_PUBLIC_ANALYTICS.md:1` for private analytics visible only to the owner: view counts, referrers, device, geo.

### Module 2 — AI Interview Coach (`docs/modules/04_INTERVIEW_COACH.md:1`)

Dynamic interview, not a static form:

```
Question → Answer (video) → LLM analyzes answer → Follow-up → ... → Session complete → Feedback
```

Feedback dimensions: Content, Technical knowledge, Relevance, Communication, Structure (STAR), Conciseness, Confidence, Behavioral quality. User can practice weak areas, retry, compare over time.

Reuses the same `jobs` and `career_profile` created in Module 1.

### Module 3 — Resume AI (`docs/modules/05_RESUME_AI.md:1`)

ATS + relevance + impact + clarity + structure audit against optional target job. Produces accept/reject/edit suggestions. **Never fabricates** metrics, titles, or technologies — if data is missing, the AI must emit a prompt asking the user. Each accepted change spawns a new `resume_versions` row (immutable history).

---

## 5. Success Metrics (What "good" looks like per module)

| Module | MVP metric to instrument | Instrument location |
|---|---|---|
| Video Resume Step 1 | Time from upload to match result < 10s p95; parser extraction recall verified via manual QA | `job_matches.createdAt`, analytics events |
| Video Resume Step 2 | Script acceptance rate; video completion rate; retake count | `videos` lifecycle events |
| Public Profile | Share link copy rate; recruiter view-through (view → download/view resume) | `public_profile_views` → `analytics` |
| Interview Coach | Sessions started vs. completed; average feedback score trend per user | `interviews` + `interview_feedback` |
| Resume AI | % of suggestions accepted; new resume_version creation rate | `resume_suggestions` status |

All metrics flow through the shared analytics pipeline (`docs/architecture/06_ANALYTICS_ARCHITECTURE.md:1`).

---

## 6. Non-Goals for MVP

Explicitly postponed (documented so future agents do not invent them):

- ATS integrations (Greenhouse, Lever, Workday)
- Automated job applications / browser automation
- Team / enterprise accounts, RBAC beyond user + public viewer
- Native mobile apps (responsive web only)
- AI voice cloning / avatar video generation
- Python microservices pre-optimization (stay on Next.js server layer; note future Python option in `docs/architecture/04_AI_ARCHITECTURE.md:1`)

---

## 7. Open Assumptions (Tracked, not silently decided)

- AI provider defaults to **Gemini API** behind an abstraction; pricing/latency assumptions to be validated in Phase 1 spike.
- Resume PDF parsing via LLM + heuristic extraction (not OCR-heavy) — sufficient for text-based PDFs; scanned-image PDFs flagged as unsupported in MVP.
- Video storage uses **Supabase Storage** (not Mux/Cloudflare Stream yet); transcoding is deferred — object is stored as `video/webm` from MediaRecorder.
- Public profile slug is `nanoid`-style (8–10 chars) under `/p/[slug]`; no custom domains in MVP.

Full open questions are collected in `docs/implementation/06_DEPLOYMENT.md` → "Known Decisions and Open Questions".

---

## 8. Related Documents

- User flows: `docs/product/02_USER_FLOWS.md`
- Features matrix + acceptance criteria: `docs/product/03_FEATURES.md`
- Information architecture: `docs/product/04_INFORMATION_ARCHITECTURE.md`
- System architecture: `docs/architecture/01_SYSTEM_ARCHITECTURE.md`
- Technology ADR: `docs/decisions/ADR-001-TECHNOLOGY-STACK.md`
