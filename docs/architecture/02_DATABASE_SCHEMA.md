# Database Schema — CareerFlow AI

> Conceptual specification — no SQL migrations are generated in Phase 0. Every table lists purpose, ownership, key fields, relationships, indexes, and security. The schema is the contractual shape; migrations will follow this contract verbatim.

**Engine:** PostgreSQL (Supabase managed). **Access control:** Row Level Security (RLS) + `auth.uid()` on every row-bearing table. Storage buckets are separate from this schema but cross-referenced.

---

## 1. Entity Graph

```
auth.users (Supabase managed)
     │
     │ 1:1 profile trigger
     ▼
   users ──────► career_profiles ──┬─► experiences (1:N)
     │                             ├─► education (1:N)
     │                             ├─► skills (1:N, grouped)
     │                             ├─► projects (1:N)
     │                             └─► certifications (1:N)
     │
     ├─► resumes ──► resume_versions (immutable, versioned)
     │
     ├─► jobs ──► job_matches ─┐
     │     │                   ├─► videos ──► public_profiles ──► public_profile_views
     │     │                   └─► scripts
     │     │
     │     ├─► interviews ──► interview_questions
     │     │                    └─► interview_answers ──► interview_answer_feedback
     │     │                    └─► interview_feedback (session scoring)
     │     │
     │     └─► resume_analyses ──► resume_suggestions
     │
     └─► settings (optional KV row per user)
```

All arrows `ON DELETE CASCADE` from `users` unless explicitly `RESTRICT` (public_profiles keep analytics by design — see §10).

---

## 2. Table: `users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, FK `auth.users.id` | Created by `handle_new_user` trigger |
| `email` | text | unique, not null | Snapped from `auth.email` at signup |
| `display_name` | text | nullable | Freeform |
| `avatar_url` | text | nullable | |
| `created_at` / `updated_at` | timestamptz | `now()` | |
| `deleted_at` | timestamptz | nullable | soft-delete prep; hard delete cascades |

RLS: `user_id` is the `id` itself (no separate `user_id` column).

## 3. Table: `career_profiles`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK `users.id` | unique (one profile per user) + index |
| `headline_title` | text nullable | e.g. "Senior Product Designer & UX Strategist" |
| `summary` | text nullable | About paragraph |
| `location` | text nullable | "San Francisco, CA" |
| `contact_email` | text nullable | may differ from auth email |
| `linkedin_url` | text nullable | |
| `portfolio_url` | text nullable | |
| `completion_score` | smallint | cached; 0–100 computed on write (not on read) |
| `last_edited_at` | timestamptz | `now()` |

Child tables reference `career_profile_id` preferring profile scoping (rather than bare `user_id`) to keep profile-versioning future-proof; a convenience FK `user_id` exists redundantly for RLS short-circuit.

## 4. Children of `career_profiles`

### `experiences`

`id UUID PK`, `career_profile_id FK`, `user_id FK`, `company text`, `title text`, `location text nullable`, `start_date date nullable`, `end_date date nullable`, `is_current boolean`, `bullets jsonb` (array of `{ text:string, order:number }`), `order_index smallint`.

### `education`

`id UUID PK`, `career_profile_id FK`, `user_id FK`, `institution text`, `degree text`, `field text nullable`, `start_date date nullable`, `end_date date nullable`, `is_current boolean`, `description text nullable`.

### `skills`

`id UUID PK`, `career_profile_id FK`, `user_id FK`, `name text` (unique per profile), `category text nullable` (e.g. "Design", "Engineering"), `proficiency smallint nullable` (unused in MVP, placeholder).

### `projects`

`id UUID PK`, `career_profile_id FK`, `user_id FK`, `name text`, `description text`, `url text nullable`, `tech_stack text[] nullable`, `order_index smallint`.

### `certifications`

`id UUID PK`, `career_profile_id FK`, `user_id FK`, `name text`, `issuer text nullable`, `issued_date date nullable`, `url text nullable`.

## 5. Resumes & Versions

### `resumes`

Logical document (container). One row per `user_id` is the expected shape; MVP may create 1 per user on first upload then reuse.

`id UUID PK`, `user_id FK`, `title text` (e.g. "Senior Product Designer"), `created_at timestamptz`.

### `resume_versions` (immutable, append-only)

`id UUID PK`, `resume_id FK`, `user_id FK`, `version_number int` (monotonic per `resume_id`), `file_path text nullable` (storage key `resumes/{userId}/{versionId}.pdf`, may be null if profile-derived only), `extracted_text text nullable` (plain extraction for LLM), `hash text` (`sha256(content)` for dedup), `source enum ('upload','generated')`, `parent_analysis_id UUID FK resume_analyses.id nullable`, `created_at timestamptz`.

**Rule:** Never `UPDATE` rows in this table; new versions are always `INSERT`. Consumers read `max(version_number)`.

Index: unique `(resume_id, version_number)`, index `(user_id, created_at desc)`.

## 6. Jobs & Matches

### `jobs`

`id UUID PK`, `user_id FK`, `title text`, `company text`, `description text` (full JD), `description_hash text` (`sha256(normalized description)`), `status enum ('draft','applied','interview','in_review','offer','closed') default 'draft'`, `source enum ('video_resume','interview','resume_ai','manual')`, `created_at`, `updated_at`.

Index: unique composition proxy via application dedup (hash), plus `(user_id, updated_at desc)` for My Applications listing.

### `job_matches`

One per `(job_id, resume_version_id)` — most recent is canonical; history kept.

`id UUID PK`, `user_id FK`, `job_id FK`, `resume_version_id FK`, `score smallint` (0–100), `strong_matches text[]`, `partial_matches text[]`, `missing_weak text[]`, `talking_points text[]` (bulleted coaching), `ai_insight text` (one-line), `raw_analysis jsonb` (LLM full output), `model text`, `is_stale boolean default false`, `created_at`.

Index: `(job_id, created_at desc)` to fetch latest.

## 7. Video Resume

### `scripts`

`id UUID PK`, `user_id FK`, `job_id FK`, `opening text`, `experience text`, `skills text`, `closing text`, `word_count int`, `prompt_hash text`, `model text`, `created_at`, `updated_at` (only for scaffold variants).

Constraint: unique `(user_id, job_id)` — one live script per job; history is audit via `raw_analysis` not separate rows for MVP.

### `videos`

`id UUID PK`, `user_id FK`, `job_id FK`, `script_id FK nullable`, `storage_path text` (`videos/{userId}/{jobId}/{videoId}.webm`), `thumbnail_path text nullable`, `mime_type text`, `duration_sec int nullable`, `file_size_bytes int nullable`, `status enum ('processing','ready','failed')`, `created_at`.

### `public_profiles`

`id UUID PK`, `user_id FK`, `job_id FK` (the job context the public page was published around), `video_id FK nullable` (the hero video), `resume_version_id FK`, `slug text unique` (nanoid10), `is_published boolean default false`, `published_at timestamptz nullable`, `title_override text nullable` (optional public headline different from job), `created_at`, `updated_at`.

Index: unique `slug`; composite `(user_id, created_at desc)`.

### `public_profile_views`

(see `docs/modules/03_PUBLIC_ANALYTICS.md:1` but repeated for completeness)

`id UUID PK`, `public_profile_id FK CASCADE`, `viewed_at timestamptz default now()`, `ip_hash text nullable`, `user_agent text nullable`, `referer text nullable`, `country_code char(2) nullable`, `cta text default 'view'`.

Index: `(public_profile_id, viewed_at)`, partial `(public_profile_id, ip_hash)` for dedup.

## 8. Interviews

### `interviews`

`id UUID PK`, `user_id FK`, `job_id FK`, `career_profile_version_id UUID nullable` (optional snapshot), `interview_type enum ('behavioral','technical','mixed')`, `difficulty enum ('easy','medium','hard')`, `question_count int`, `status enum ('creating','active','abandoned','completed','feedback_ready')`, `started_at timestamptz`, `completed_at timestamptz nullable`, `created_at`.

### `interview_questions`

`id UUID PK`, `interview_id FK`, `user_id FK`, `question_text text`, `hint text nullable`, `order_index smallint`, `source enum ('llm_initial','llm_followup','llm_pivot')`, `status enum ('pending','active','answered','skipped')`, `created_at`.

Index: `(interview_id, order_index)`.

### `interview_answers`

`id UUID PK`, `interview_id FK`, `user_id FK`, `question_id FK`, `storage_path text nullable` (`interview-answers/{userId}/{interviewId}/{questionId}.webm`), `mime_type text nullable`, `duration_sec int nullable`, `transcript text nullable`, `status enum ('uploading','ready','failed')`, `created_at`.

### `interview_feedback` (session-level)

`id UUID PK`, `interview_id FK unique`, `user_id FK`, `overall_score smallint`, `label enum ('needs_work','developing','proficient','strong')`, `dimensions jsonb` (`{ communication, technical, structureSTAR, confidence, conciseness, relevance }` each 0..100), `strengths text[]`, `weaknesses text[]`, `ai_recommendation text` (markdown), `model text`, `created_at`.

### `interview_answer_feedback` (optional per-answer)

`id UUID PK`, `interview_id FK`, `question_id FK`, `answer_id FK`, `dimension_scores jsonb`, `feedback text`, `created_at`.

## 9. Resume AI

### `resume_analyses`

`id UUID PK`, `user_id FK`, `resume_version_id FK`, `job_id FK nullable`, `summary text`, `category_scores jsonb` (`{ats,relevance,impact,clarity,structure}`), `model text`, `prompt_hash text`, `applied_at timestamptz nullable`, `created_at`.

### `resume_suggestions`

`id UUID PK`, `analysis_id FK`, `user_id FK`, `category enum ('ats','relevance','impact','clarity','structure','evidence')`, `target_experience_id UUID nullable`, `target_bullet_index int`, `original_text text`, `suggested_text text nullable`, `prompt_question text nullable` (when not fabricating), `reasoning text`, `confidence real` (0..1), `status enum ('pending','accepted','rejected')`, `edited_text text nullable`, `created_at`, `updated_at`.

Index: `(analysis_id, status)`.

---

## 10. RLS Policies (conceptual; actual `CREATE POLICY` in `docs/architecture/07_SECURITY.md:1`)

```
-- Authenticated tables (all except public_profile_views anon insert):
USING (user_id = auth.uid())  |  WITH CHECK (user_id = auth.uid())

-- public_profiles special-case:
--   (a) anon view for GET /p/[slug] — uses view public_profile_public_view
--       which only selects { slug, headline_title, summary, name, video_signed_url*, resume_signed_url* }
--       filtered by is_published = true.
--   (b) authenticated owner policy: USING (user_id = auth.uid())

-- public_profile_views:
--   INSERT: allow anon when public_profile_id resolves to a published profile
--   SELECT: only owner via join: USING (public_profile_id in (select id from public_profiles where user_id = auth.uid()))
```

All policies deny by default.

---

## 11. Invariants & Constraints

1. One `career_profiles` row per `user_id` (unique constraint).
2. `resume_versions` are immutable; no `UPDATE` permission granted even to owner beyond trigger-managed timestamps.
3. `public_profiles.slug` is immutable after insert; `is_published` toggles with no side-effect on analytics history.
4. `jobs.description_hash` is not a unique constraint but application-layer deduplicates — avoids unique-index collision on JD edits mid-flow.
5. Every FK carries a redundant `user_id` for RLS short-circuit + safe join filters.

---

## 12. Migrations (sequence — Phase 0 does not run these)

```
001_init_users_and_trigger.sql         — users + handle_new_user
002_core_profile.sql                   — career_profiles + children
003_resumes_and_versions.sql           — resumes, resume_versions
004_jobs.sql                           — jobs, job_matches
005_video_resume.sql                   — scripts, videos, public_profiles
006_analytics.sql                      — public_profile_views
007_interviews.sql                     — interviews + children
008_resume_ai.sql                      — resume_analyses + suggestions
009_rls_policies.sql                   — enable RLS + policies
010_storage_buckets.sql                — create 3 private buckets + limits
```

If a future module needs a new column on a core table, it must add the column — not duplicate the table — and record the change in `docs/decisions/`.

