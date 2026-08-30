-- 004_jobs.sql
-- Jobs and Job Matches (shared across modules)

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  company text not null,
  description text not null,
  description_hash text not null,
  status text not null default 'draft' check (status in ('draft','applied','interview','in_review','offer','closed')),
  source text not null default 'manual' check (source in ('video_resume','interview','resume_ai','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_user_id_updated on public.jobs(user_id, updated_at desc);
create index if not exists idx_jobs_user_hash on public.jobs(user_id, description_hash);

create trigger on_jobs_updated
  before update on public.jobs
  for each row execute function public.handle_updated_at();

-- Job Matches
create table if not exists public.job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  resume_version_id uuid not null references public.resume_versions(id) on delete cascade,
  score smallint not null check (score >= 0 and score <= 100),
  strong_matches text[] not null default '{}',
  partial_matches text[] not null default '{}',
  missing_weak text[] not null default '{}',
  talking_points text[] not null default '{}',
  ai_insight text,
  raw_analysis jsonb,
  model text,
  is_stale boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_matches_job_id_created on public.job_matches(job_id, created_at desc);
create index if not exists idx_job_matches_user_id on public.job_matches(user_id);
