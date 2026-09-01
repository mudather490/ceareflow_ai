-- 011_phase3_fixes.sql
-- Align job_matches / public_profiles with Phase 3 DTOs (breakdown, nullable resume_version_id)

-- Make resume_version_id nullable on job_matches (user may match without explicit version)
alter table public.job_matches alter column resume_version_id drop not null;

-- Add breakdown jsonb column for structured breakdown items (label, status, detail)
alter table public.job_matches add column if not exists breakdown jsonb not null default '[]'::jsonb;

-- Keep legacy arrays in sync via trigger is optional; we store breakdown as source of truth.
-- Allow raw_analysis to stay jsonb; no change.

-- Make public_profiles.resume_version_id nullable (draft profile may exist before resume version resolved)
alter table public.public_profiles alter column resume_version_id drop not null;

-- Ensure scripts table isidempotent for Phase 3 usage (already exists, no change)

-- Ensure videos table supports nullable script_id (already set)
-- No bucket changes required
