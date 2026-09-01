-- 014_phase6_completion_fixes.sql
-- Phase 6 — Final Application Completion & Integration Readiness
-- Fixes identified in migration audit: column naming alignment, missing timestamps, indexes.
-- No remote push performed in Phase 6; file is repository-only for final integration review.

-- -------------------------------------------------------------------
-- 1. videos: align file_size_bytes canonical column and add updated_at
-- 005 defined file_size_bytes, but application code mistakenly used file_size.
-- Ensure both exist for backward compat during rollout, with file_size as alias if needed.
-- -------------------------------------------------------------------
alter table public.videos add column if not exists file_size_bytes bigint;
alter table public.videos add column if not exists file_size bigint;
alter table public.videos add column if not exists updated_at timestamptz not null default now();

-- Backfill file_size <-> file_size_bytes for any existing rows where one is set
update public.videos set file_size_bytes = file_size where file_size_bytes is null and file_size is not null;
update public.videos set file_size = file_size_bytes where file_size is null and file_size_bytes is not null;

-- Keep updated_at fresh
create or replace function public.handle_videos_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_videos_updated on public.videos;
create trigger on_videos_updated
  before update on public.videos
  for each row execute function public.handle_videos_updated_at();

-- -------------------------------------------------------------------
-- 2. public_profiles: ensure updated_at trigger exists (already in 005, verify)
-- -------------------------------------------------------------------
create or replace function public.handle_public_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_public_profiles_updated on public.public_profiles;
create trigger on_public_profiles_updated
  before update on public.public_profiles
  for each row execute function public.handle_public_profiles_updated_at();

-- -------------------------------------------------------------------
-- 3. jobs: ensure index on source for analytics filtering
-- -------------------------------------------------------------------
create index if not exists idx_jobs_source on public.jobs(source);

-- -------------------------------------------------------------------
-- 4. analytics_events retention note (no DDL): table is append-only, RLS owner crud.
-- Ensure index for trends query (user_id, event_type, created_at) exists — 013 already creates it.
-- Add index for public_profile_id lookups if missing
-- -------------------------------------------------------------------
create index if not exists idx_analytics_events_public_profile on public.analytics_events(public_profile_id);

-- -------------------------------------------------------------------
-- 5. public_profile_views: ensure RLS enabled (was enabled in 009, re-assert)
-- -------------------------------------------------------------------
alter table public.public_profile_views enable row level security;

-- -------------------------------------------------------------------
-- 6. resume_analyses: ensure updated_at not needed, but index on job_id for job-specific trends
-- -------------------------------------------------------------------
create index if not exists idx_resume_analyses_job on public.resume_analyses(job_id);

-- -------------------------------------------------------------------
-- 7. Verify foreign keys are correct: no action needed — documented for integration review
-- Hosted check: All tables have user_id FK to users(id) on delete cascade per 002/003/004/005/007/008.
