# ADR-002 — Shared Career Profile as Single Source of Truth

- **Status:** Accepted
- **Date:** 2026-08-30 (Phase 0)
- **Deciders:** Product Architect + UX Systems Architect (Phase 0 agent)
- **Related:** `docs/product/01_PRODUCT_OVERVIEW.md:1`, `docs/architecture/02_DATABASE_SCHEMA.md:1`

---

## 1. Context

Three AI modules — Video Resume, Interview Coach, and Resume AI — all operate on the same candidate data (name, title, summary, experience, education, skills, projects). A naive implementation (three teams in parallel) would spawn three `user` tables and three `resume` tables, forcing duplicates and making job-context reuse impossible. Product rule §2 states the **Career Profile is the single source of truth** and §6 lists the intended shared schema.

No design mock requires independent resume/auth subsystems — navigation across all authenticated routes shows the same `Active Career Profile` header, confirming the central concept is already embedded in the design.

## 2. Decision

There is **one** shared representation of candidate identity, resume history, and job context across the whole system:

### 2.1 Entities that are singletons (not per-module copies)

| Concept | Table(s) | Owning service | Duplication forbidden |
|---|---|---|---|
| User | `users` + `auth.users` | Supabase Auth trigger | `video_resume_users`, `interview_users` — forbidden |
| Career Profile | `career_profiles` + `experiences`, `education`, `skills`, `projects`, `certifications` | `CareerProfileService` | Any `module_*_profile` variant is forbidden |
| Resume history | `resumes` + `resume_versions` (immutable) | `CareerProfileService` / `StorageService` | Each module reads from the same `resume_versions` picker |
| Job | `jobs` | `JobService` (shared deduplication logic) | No `video_jobs` / `interview_jobs` parallel tables |

### 2.2 How modules interact with the shared state

- **Video Resume Step 1** creates a `jobs` row (or reuses a deduped one) and links it to `resume_version_id`; downstream `VideoService` also creates `job_matches`/`scripts`/`videos`/`public_profiles` `FK job_id`.
- **Interview Coach** *reuses* `jobs`: the setup page's Job picker calls `JobService.listAllForUser` across all prior modules (filter `source` only for display grouping). Selecting an existing Job id avoids re-pasting the JD. Creating a new job via Interview still writes the same `jobs` table.
- **Resume AI** optionally takes a `job_id` (when job exists) or runs generic analysis otherwise; it reads the same `resume_versions` radios and enriches `career_profiles` on `apply`.
- **My Applications / Dashboard** list `jobs` ordered by `updated_at desc`, aggregated across modules.

### 2.3 Versioning rule

New facts are **append-only**: editing a bullet via `Resume AI` `apply` creates a new `resume_versions` row `versionNumber = max+1`. No `UPDATE` applies to `resume_versions`. Active edits to `career_profiles` fields are mutable via `PATCH` but history is reconstructable via `resume_versions` writes.

## 3. Alternatives Considered

| Alternative | Why rejected |
|---|---|
| Per-module resume/profile tables | Guarantees split identity, duplicate uploads, and a 3× storage/auth surface; the spec explicitly forbids it (`Product Vision §6`). |
| Separate `jobs` table per module (simpler joins) | Breaks job reuse across Video↔Interview: user would re-paste JD for the same company. The single `jobs` + `description_hash` dedup solves this without sacrificing per-module scoping. |
| Event-sourced Resume store (append-only + computed projection) | Nice in theory, overkill for <5k profiles/month; the `versionNumber` monotonic + immutable insert model already gives replay + audit with less indirection. |

## 4. Consequences

- **Positive:** One upload, one parser, one job creation; each module CTA is shorter (pic existing vs new). Analytics across modules aggregates by `job_id` not cross-module joins.
- **Positive:** Data migration cost is zero — no post-facto unifying job.
- **Negative:** Future field additions (e.g. a new profile facet needed by only one module) still add a column to the shared `career_profiles` table — mitigated by the opt `jsonb` extensions for experimental fields (post-ADR debate).
- **Negative:** Traffic spikes on Resume AI writes affect Video Resume reads — mitigated by Postgres connection pool and PGBouncer through Supabase.

## 5. Compliance

- Any proposal that introduces a new table named `*_users`, `*_profiles`, `*_resumes`, or `*_jobs` must be rejected unless the existing row-bearing table is extended instead and a superseding ADR is filed.
- Codegen lint: `grep -R 'create table.*_users\|.*_profiles\|.*_resumes' supabase/migrations` must return empty or the PR fails.
- Product flow change that would duplicate job creation (JD re-entry required for a pre-existing job) is a regression against this ADR and will be blocked.

