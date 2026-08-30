# Phase 0 Consistency Review — CareerFlow AI

> **Review date:** 2026-08-30
> **Reviewer:** Lead Software Architect (Phase 0 review agent)
> **Scope:** Consistency audit of the Phase 0 blueprint before Phase 1 implementation. No application code was written; no architecture was changed by this review.
> **Documents inspected:** `GEMINI.md`, `ARCHITECTURE.md`, `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md`, `docs/product/01_PRODUCT_OVERVIEW.md`, `docs/product/02_USER_FLOWS.md`, `docs/product/04_INFORMATION_ARCHITECTURE.md`, `docs/architecture/01_SYSTEM_ARCHITECTURE.md`, `docs/architecture/02_DATABASE_SCHEMA.md`, `docs/architecture/03_API_ARCHITECTURE.md`, `docs/architecture/04_AI_ARCHITECTURE.md`, `docs/architecture/07_SECURITY.md`, `docs/decisions/ADR-001-TECHNOLOGY-STACK.md`, `docs/decisions/ADR-002-SHARED-CAREER-PROFILE.md`, `docs/decisions/ADR-003-AI-SERVICE-LAYER.md`, `docs/decisions/ADR-004-MINIMAL-PUBLIC-PROFILE.md` — plus cross-checked `docs/product/03_FEATURES.md`, `docs/architecture/05_STORAGE_AND_VIDEO.md`, `docs/architecture/06_ANALYTICS_ARCHITECTURE.md`, `docs/implementation/06_DEPLOYMENT.md` (open-question tracker) and `dising stitch/` asset inventory.

---

## 1. Methodology

1. Read every document listed above in full (via `Read` tool, verified by line-level inspection).
2. For each of the 18 required checks, traced the claim through **product → architecture → security → decisions** layers and compared the concrete field/table/route/role names.
3. Flagged a mismatch only when two documents make incompatible normative statements (e.g., one requires a separate table, another forbids it). Informational omissions that the blueprint already tracks as open questions (`docs/implementation/06_DEPLOYMENT.md:1` O-001…O-008) were noted but not treated as contradictions.
4. Classified every finding as `BLOCKER` (Phase 1 cannot start safely), `IMPORTANT` (must be resolved before the affected module ships, but does not stop Phase 1), or `NON-BLOCKING` (polish, wording, or future-phase design debt).

---

## 2. Check Results — Summary Table

| # | Check | Result | Classification | Evidence (primary) |
|---|-------|--------|----------------|---------------------|
| 1 | All modules use the same authenticated user model | **PASS** | — | `GEMINI.md:21` / `ARCHITECTURE.md:137` / `docs/decisions/ADR-002-SHARED-CAREER-PROFILE.md:22` / `docs/architecture/02_DATABASE_SCHEMA.md:41` |
| 2 | Career Profile is the shared source of truth | **PASS** | — | `docs/product/01_PRODUCT_OVERVIEW.md:42` / `ARCHITECTURE.md:9` / `docs/architecture/01_SYSTEM_ARCHITECTURE.md:242` |
| 3 | Resume and Resume Versions are shared across Video Resume, Interview Coach, Resume AI | **PASS with note** | **NON-BLOCKING** | `docs/architecture/02_DATABASE_SCHEMA.md:93` / `docs/product/01_PRODUCT_OVERVIEW.md:54` / `docs/decisions/ADR-002:26` — see §3.1 |
| 4 | Jobs are shared across all modules | **PASS** | — | `docs/decisions/ADR-002:27` / `ARCHITECTURE.md:182` / `docs/architecture/02_DATABASE_SCHEMA.md:109` |
| 5 | Public Profile is minimal and recruiter-focused | **PASS** | — | `docs/decisions/ADR-004-MINIMAL-PUBLIC-PROFILE.md:18` / `docs/modules/02_PUBLIC_PROFILE.md:1` / `PRODUCT_SPEC.md:29` |
| 6 | Public Profile Analytics are private to the profile owner | **PASS** | — | `docs/architecture/07_SECURITY.md:82` / `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:68` / `docs/modules/03_PUBLIC_ANALYTICS.md:1` |
| 7 | AI calls are isolated behind the AI service/provider layer | **PASS** | — | `GEMINI.md:41` / `docs/decisions/ADR-003-AI-SERVICE-LAYER.md:18` / `docs/architecture/04_AI_ARCHITECTURE.md:17` / `ARCHITECTURE.md:121` |
| 8 | AI cannot directly modify canonical user career data | **PASS with note** | **IMPORTANT** | `docs/product/02_USER_FLOWS.md:42` vs `docs/architecture/03_API_ARCHITECTURE.md:92` — see §3.2 |
| 9 | AI-generated resume improvements require user approval | **PASS** | — | `docs/product/03_FEATURES.md:224` / `docs/modules/05_RESUME_AI.md:1` / `docs/architecture/04_AI_ARCHITECTURE.md:222` |
| 10 | AI cannot fabricate resume facts | **PASS** | — | `GEMINI.md:86` / `docs/architecture/04_AI_ARCHITECTURE.md:130` / `docs/architecture/07_SECURITY.md:168` |
| 11 | Public profile data is separated from private data | **PASS** | — | `docs/architecture/07_SECURITY.md:98` / `ARCHITECTURE.md:212` / `docs/modules/02_PUBLIC_PROFILE.md:1` §4 table |
| 12 | RLS and authorization boundaries are documented | **PASS** | — | `docs/architecture/07_SECURITY.md:32` / `docs/architecture/02_DATABASE_SCHEMA.md:189` / `ARCHITECTURE.md:212` |
| 13 | File uploads have security requirements | **PASS** | — | `docs/architecture/07_SECURITY.md:120` / `docs/architecture/05_STORAGE_AND_VIDEO.md:17` / `docs/architecture/03_API_ARCHITECTURE.md:233` |
| 14 | Architecture does not require Python for MVP | **PASS** | — | `docs/decisions/ADR-001-TECHNOLOGY-STACK.md:35` / `ARCHITECTURE.md:243` / `docs/architecture/04_AI_ARCHITECTURE.md:254` |
| 15 | Architecture is compatible with OpenCode as the coding agent | **PASS** | — | `GEMINI.md:3` / `docs/decisions/ADR-001:1` — see §3.3 |
| 16 | Documentation does not contain contradictory technology choices | **PASS** | — | `ARCHITECTURE.md:44` / `docs/decisions/ADR-001:22` / `docs/implementation/01_PROJECT_FOUNDATION.md:1` §2 — see §3.4 |
| 17 | Future modules can be added without rewriting the foundation | **PASS** | — | `GEMINI.md:115` / `docs/decisions/ADR-002:52` / `ARCHITECTURE.md:155` + `docs/implementation/06_DEPLOYMENT.md:1` §Phase 7 |
| 18 | Identify any actual blockers for Phase 1 | **PASS — No blockers** | — | See §4 |

**Overall: 18/18 checks PASS (2 with non-blocking observations, 1 important clarification). No contradictions that prevent Phase 1.**

---

## 3. Detailed Findings

### 3.1 Check 3 — Resume / Resume Versions Sharing (NON-BLOCKING)

**Status:** PASS — shared system exists; observation on Interview Coach indirection.

- **What the blueprint says:**
  - `docs/architecture/02_DATABASE_SCHEMA.md:93` defines exactly one `resumes` → `resume_versions` (immutable, `version_number` monotonic). No per-module clone.
  - `docs/decisions/ADR-002:26` forbids `video_resumes` / `interview_resumes` tables and mandates `CareerProfileService` / `StorageService` as the single reader.
  - `docs/product/01_PRODUCT_OVERVIEW.md:54` reads: Resume AI `resume_versions + optional job` → new `resume_version`; Video Resume Step 1 `career_profile + selected resume_version + job` → `job_matches`.
  - `docs/product/03_FEATURES.md:175` Interview Setup inputs are `jobId` (pick existing or create new) — not a direct `resumeVersionId` picker.

- **Observation:** Interview Coach reuses **Career Profile** (which itself is hydrated from `resume_versions`) and **Jobs**, but does not surface a direct `resume_version` picker like the other two modules. This is *intentional* (the profile is the abstraction over resume history) and is consistent with `docs/architecture/01_SYSTEM_ARCHITECTURE.md:239` central graph `career_profiles → VideoService / InterviewService / ResumeAIService` → `JobService`. It is **not** a duplicate-system violation.

- **Why NON-BLOCKING:** No separate resume store exists. The indirection is documented and aligns with the "one upload → profile → all modules" principle. A future reviewer could misread it as "Interview Coach doesn't share resumes," so a one-line clarification is recommended (see §5 Recommendation R-01), but Phase 1 is unaffected (Phase 1 only seeds the profile + resume_version seed; Interview ships in Phase 5).

### 3.2 Check 8 — AI Cannot Directly Modify Canonical Career Data (IMPORTANT)

**Status:** PASS with clarification required before Phase 2 merge.

- **What the blueprint says (consistent path):**
  - `docs/product/02_USER_FLOWS.md:42` Flow 1a: `POST /api/profile/resume` → storage → `ResumeParser` → **Review extracted data sheet** → user edits → `PATCH /api/profile` persists. AI extraction is staged for user review, not auto-committed.
  - `docs/product/03_FEATURES.md:42` F-00.2 AC: user can edit any field and it persists after reload; parser is "AI-assisted but user can override every field."
  - `docs/architecture/04_AI_ARCHITECTURE.md:43` service catalogue: Resume Parser outputs a DTO, callee decides to persist.
  - Resume AI (`docs/modules/05_RESUME_AI.md:1` §4–5) is strictly `pending → accepted/rejected/edited → Apply → new resume_version`. No AI write to `career_profiles` without `Apply`.

- **Apparent tension (wording, not schema):**
  - `docs/architecture/03_API_ARCHITECTURE.md:92` line for `POST /api/profile/resume` says "Triggers `CareerProfileService.hydrateFromResumeVersion(resumeVersionId)` (LLM parser) asynchronously — the response is immediate ... the profile hydration is observed via polling or SWR revalidation." Read literally, this suggests the parser's output hydrates `career_profiles` without an explicit user-confirm gate, which would conflict with Flow 1a's review sheet and with the principle "AI cannot directly modify canonical data."

- **Resolution (evidence-backed):** The schema and flows make clear that `career_profiles` is the canonical row and `resume_versions` is the immutable history; hydration is *proposal* state. The 03_API_ARCHITECTURE paragraph is describing the **extraction + staging** continuation, not an immediate `UPDATE career_profiles`. The review sheet remains the commit point before any `career_profiles` child rows are upserted. No contradictory table or route bypasses the review gate.

- **Why IMPORTANT (not BLOCKER):** The wording in 03_API_ARCHITECTURE §2.2 could be misimplemented as auto-commit on upload if read in isolation. Phase 1 (foundation) is not blocked, but **before Phase 2** the line should be tightened to: "Enqueues extraction; result is written to a **staging/pending review** buffer (or returned as DTO for the Review sheet) and only persisted to `career_profiles` after the user's `PATCH /api/profile` confirmation." See §5 Recommendation R-02.

### 3.3 Check 15 — OpenCode Compatibility (PASS)

- **What the blueprint says:**
  - `GEMINI.md:3` — "This file survives provider changes (Gemini, OpenCode, Claude, …) — do not delete it even when the project uses OpenCode as the CLI."
  - `PRODUCT_SPEC.md:1` header routes changes through `docs/product/` (tool-agnostic).
  - `docs/decisions/ADR-001-TECHNOLOGY-STACK.md:1` stack pins Next.js/Supabase/Gemini **provider** (not the coding agent); no step assumes `gemini` CLI must drive the build.
  - `docs/decisions/ADR-003-AI-SERVICE-LAYER.md:52` alternative "Use `mcp__azure__*`" was *considered and deferred* — not mandated — so OpenCode does not conflict with a required MCP surface.

- **Result:** The blueprint is agent-portable. OpenCode, Gemini CLI, or any future agent operates against the same file tree and ADRs. No doc hard-codes a `gemini` CLI command as the build step; Phase 1 commands in `docs/implementation/01_PROJECT_FOUNDATION.md:1` are `npm`/`npx` only. No issue.

### 3.4 Check 16 — Contradictory Technology Choices (PASS)

Audited the canonical stack phrase across documents:

| Document | Stack phrase |
|---|---|
| `ARCHITECTURE.md:44` | Next.js 14+ App Router + React 18 + TypeScript strict + Tailwind + shadcn/ui |
| `docs/decisions/ADR-001:22` | Same row (Frontend/Validation/Backend/DB/Auth/Storage/AI/Video/Deploy) |
| `docs/architecture/01_SYSTEM_ARCHITECTURE.md:106` | Same, plus `zod` + `react-hook-form` |
| `docs/implementation/01_PROJECT_FOUNDATION.md:1` §2 | Same versions, adds `nanoid` explicitly |
| `DESIGN_SYSTEM.md:1` §8 checklist | Same Tailwind token mapping + `shadcn.json` baseColor `slate` |

No contradictions found:

- Package manager is uniformly `npm` (ADR-001). No doc prescribes `pnpm`/`yarn`.
- Database is uniformly Supabase Postgres + Auth + Storage (no doc reintroduces Firebase/Prisma as required — ADR-001 lists Prisma as *deferred*).
- AI provider is uniformly Gemini behind `lib/ai/providers/gemini.ts` with `AI_PROVIDER` switch and `MockProvider` for CI (no doc hard-requires OpenAI).
- Video is uniformly `MediaRecorder` MVP, caps `resumes 10 MB / videos 100 MB / 180s` (`docs/architecture/05_STORAGE_AND_VIDEO.md:9` matches `docs/architecture/07_SECURITY.md:122`). No doc reintroduces Mux/Cloudflare Stream as mandatory.
- Python is uniformly deferred (`ADR-001:35`, `ARCHITECTURE.md:243`, `docs/architecture/04_AI_ARCHITECTURE.md:254` sketch the FastAPI sidecar as *future option*, not MVP).

---

## 4. Cross-Cutting Consistency Verification

### 4.1 Auth → RLS → Public/Private Separation (Checks 1, 6, 11, 12)

- All private tables list `RLS: user_id = auth.uid()` (`docs/architecture/02_DATABASE_SCHEMA.md:189`, `docs/architecture/07_SECURITY.md:32`). Public surface is the narrow exception: `public_profiles` via whitelisting view (`is_published=true`, limited columns) and `public_profile_views` `INSERT` allow + owner-only `SELECT` (`07_SECURITY.md:53`).
- `ARCHITECTURE.md:212` security boundaries diagram, `docs/product/04_INFORMATION_ARCHITECTURE.md:180` IA Constraints, and `docs/architecture/06_ANALYTICS_ARCHITECTURE.md:155` all restate: analytics is owner-only, beacon never echoes PII, public page never contains `/analytics` URL. No divergence.

### 4.2 File Upload Security (Check 13)

- Three layers repeat identically: client `accept` + handler MIME + magic + size + duration + UUID key + private bucket `fileSizeLimit` (`docs/architecture/07_SECURITY.md:120`, `docs/architecture/05_STORAGE_AND_VIDEO.md:17`, `docs/architecture/03_API_ARCHITECTURE.md:233`). Limits are consistent: 10 MB resumes, 100 MB videos / interview answers, 180s / 120s caps. No doc weakens a layer.

### 4.3 AI Isolation & Non-Fabrication (Checks 7, 8, 10)

- 9 services are enumerated identically in `ARCHITECTURE.md:131`, `docs/architecture/01_SYSTEM_ARCHITECTURE.md:63`, `docs/architecture/04_AI_ARCHITECTURE.md:43`, and `docs/decisions/ADR-003:12`.
- Anti-fabrication preamble `[NEEDS_USER: ...]` + yellow-dashed prompt card + output validator is cited in `GEMINI.md:86`, `docs/architecture/04_AI_ARCHITECTURE.md:130`, `docs/architecture/07_SECURITY.md:168`, and module specs `01_VIDEO_RESUME.md:1` §4.1 / `05_RESUME_AI.md:1` §1. No doc suggests a service may bypass it.

### 4.4 Information Architecture vs API Catalogue (Checks 4, 5)

- Sitemap (`docs/product/04_INFORMATION_ARCHITECTURE.md:20`) routes `/p/[slug]`, `/video-resume/*`, `/interview/*`, `/resume-ai/*`, `/analytics*` map 1:1 to API catalogue (`docs/architecture/03_API_ARCHITECTURE.md:60`) — e.g., IA `POST /api/public/[slug]/view` ↔ API catalogue §2.5 same path, IA `GET /analytics` ↔ analytics arch §2.4 same RLS predicate.
- Public shell (wordmark + Save/Share only, no dashboard nav) is identical in `docs/product/04_INFORMATION_ARCHITECTURE.md:122`, `DESIGN_SYSTEM.md:1` §7, and `docs/decisions/ADR-004:26`.

### 4.5 Extensibility Without Rewrite (Check 17)

- `GEMINI.md:115` §22 forbids cross-module direct imports, funnels reuse through `JobService`/`CareerProfileService`/`StorageService`/`AnalyticsService`.
- `docs/decisions/ADR-002:52` mitigates future field growth via `jsonb` extensions.
- `docs/architecture/01_SYSTEM_ARCHITECTURE.md:242` shared-services diagram and `docs/implementation/06_DEPLOYMENT.md:1` Phase 7 (cross-module sweep) both plan incremental addition. No foundation rewrite is implied.

---

## 5. Issues Register

### BLOCKER — 0

*No blocker exists. Phase 1 (Project Foundation) can start without any architecture change.*

### IMPORTANT — 1

| ID | Title | Affected docs | Severity | Description & Recommendation |
|---|-------|---------------|----------|-------------------------------|
| I-01 | Clarify resume-parser hydration is staged, not auto-committed to `career_profiles` | `docs/architecture/03_API_ARCHITECTURE.md:92` vs `docs/product/02_USER_FLOWS.md:42` | **IMPORTANT** | **Description:** 03_API_ARCHITECTURE §2.2 line "Triggers `CareerProfileService.hydrateFromResumeVersion` ... the profile hydration is observed via polling" can be misread as AI directly writing canonical `career_profiles` rows, which would violate the product guarantee that AI never modifies canonical data without user action (Check 8, `GEMINI.md:86`, Flow 1a review sheet). **Recommendation (docs-only, before Phase 2 PR):** Edit `docs/architecture/03_API_ARCHITECTURE.md:92` to: "Enqueues `ResumeParser` extraction; the DTO is returned for the **Review extracted data** sheet and is persisted to `career_profiles` *only* after the user's confirming `PATCH /api/profile` (Flow 1a). No `career_profiles` child row is auto-committed on upload." Add a one-line xref to `docs/product/02_USER_FLOWS.md:42`. No schema or code change required. |

### NON-BLOCKING — 3

| ID | Title | Affected docs | Severity | Description & Recommendation |
|---|-------|---------------|----------|-------------------------------|
| N-01 | Document that Interview Coach reuses resumes *via Career Profile* (not via direct picker) | `docs/product/01_PRODUCT_OVERVIEW.md:54` table row for Interview Coach | **NON-BLOCKING** | **Description:** The reads/writes table correctly lists Interview Coach as `Reads career_profile + job` (no `resume_version` column). A reviewer doing Check 3 could expect an explicit `resume_version` picker per module. The sharing is indirect (profile ← resume_versions) and is already correct, but benefits from a clarifying footnote. **Recommendation:** Add footnote to that table row: "Via hydrated `career_profiles` (derived from `resume_versions`); no separate interview-scoped resume table — see `docs/decisions/ADR-002:29`." |
| N-02 | Stitched-folder inventory count wording | `PRODUCT_SPEC.md:81` — "15 directories in `dising stitch/` were inspected" | **NON-BLOCKING** | **Description:** The sentence counts `careerflow_ai/DESIGN.md` as a directory for inventory purposes; the actual `dising stitch/` listing is 14 screen folders + 1 design-token folder. The audit itself inspected all 14 screen folders + the token file (no screen is missing), so the product guarantee is sound; the phrase is just inventory wording. **Recommendation:** Rephrase to "14 screen directories + `careerflow_ai/DESIGN.md` token file (15 inspected entries)" at next docs polish. No blocker. |
| N-03 | Overall Readiness metric formula is tracked but not yet specified | `docs/product/02_USER_FLOWS.md:204` — "Overall Readiness A-" / `docs/product/03_FEATURES.md:54` AC | **NON-BLOCKING** | **Description:** Dashboard readiness is specced as derived, not fabricated, but no formula is frozen (open question `docs/implementation/06_DEPLOYMENT.md:1` O-008). This is intentionally deferred — Profile completeness + recent interview + resume score weighting is to be validated in Phase 1 spike. **Recommendation:** No doc change now; track O-008 and resolve before Dashboard polish (Phase 2). Phase 1 shell can render a placeholder derived from completion % only. |

> No additional contradictions were found across the inspected documents. The open questions already tracked in `docs/implementation/06_DEPLOYMENT.md:1` (O-001…O-008) remain the authoritative deferred-design list; they are not re-classified here.

---

## 6. Architecture Status

| Dimension | Status | Notes |
|-----------|--------|-------|
| **Product ↔ Architecture alignment** | ✅ **COHERENT** | Career Profile as truth, job reuse, minimal public surface, private analytics, AI isolation, and no-Python MVP are restated identically across product, system, API, AI, security, and ADR layers. |
| **Database contract** | ✅ **SOUND** | 20+ tables, immutable `resume_versions`, `nanoid10` slug, dedup `description_hash` hashed at app layer, RLS + whitelisting view — no contradictory table or missing FK. |
| **Security contract** | ✅ **SOUND** | RLS per table, `user_id = auth.uid()` double-check, file upload 3-layer validation, prompt injection / fabrication guards, signed URLs (60s/300s), no secrets in client. Review checklist at `docs/architecture/07_SECURITY.md:212` is the PR gate. |
| **AI contract** | ✅ **SOUND** | 9 services behind `lib/ai/services/*` → `lib/ai/providers/*` → `getAIProvider()`, `MockProvider` for offline CI, anti-fabrication preamble + validator coverage. |
| **Public surface contract** | ✅ **SOUND** | Minimal centered `simplified_resume_public_profile` chosen (`ADR-004`), 2 richer variants explicitly rejected with rationale, public/private data table enforced. |
| **Extensibility** | ✅ **READY** | Shared services (`CareerProfileService`, `JobService`, `StorageService`, `AnalyticsService`) are the only cross-module seams; per-module tables are local. Future modules can add via `jsonb` column extension without duplicating tables. |

---

## 7. Phase 0 Verdict

| Question | Answer |
|----------|--------|
| **Is the architecture safe to build on?** | **Yes.** The blueprint is internally consistent, security-doubled (handler + RLS), and extensible. |
| **Are there blockers for Phase 1?** | **No.** Phase 1 (Next.js + Tailwind tokens + shadcn/ui + Supabase clients + middleware auth + nav shells) has no prerequisite that is underspecified — `docs/implementation/01_PROJECT_FOUNDATION.md:1` can be executed as written. |
| **Must anything be changed before Phase 1 starts?** | **No.** No document needs to be edited to unblock Phase 1. The single IMPORTANT item (I-01) is a wording tightening that should land *before Phase 2* (Career Profile hydration), not before scaffolding. The 3 non-blocking items can ride with the next docs polish PR. |
| **Go / No-Go for Phase 1** | **GO** ✅ |

---

## 8. Recommendations for the Phase 1 Handoff

1. **Land I-01 before Phase 2** (one-paragraph edit to `docs/architecture/03_API_ARCHITECTURE.md:92` clarifying staged hydration).
2. **Consider N-01 footnotes** at the next docs pass so future Check-3 reviewers don't re-open the indirect-resume question.
3. **Keep `GEMINI.md` as the session pre-read** for every OpenCode/Gemini CLI session — the file already declares OpenCode compatibility (`GEMINI.md:3`), so no agent-specific fork is needed.
4. **When Phase 1 lands, add its Vercel preview URL to `docs/implementation/06_DEPLOYMENT.md:1` Phase 10 checklist** (keeps the open-question tracker live).

---

*End of Phase 0 Consistency Review. This document is the only artifact created by this review task. No architecture file was modified.*
