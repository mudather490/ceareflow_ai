-- 013_analytics_events.sql
-- Phase 5 — Analytics: generic event model for Resume AI + Application/Public Profile Analytics
-- Extends 006_analytics.sql (public_profile_views) with normalized analytics_events

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  public_profile_id uuid references public.public_profiles(id) on delete cascade,
  event_type text not null check (event_type in ('profile_view','resume_download','video_play','job_application','interview_started','interview_completed','resume_analysis','video_resume_match','script_generated')),
  job_id uuid references public.jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb
);

create index if not exists idx_analytics_events_user_created on public.analytics_events(user_id, created_at desc);
create index if not exists idx_analytics_events_profile on public.analytics_events(public_profile_id, created_at desc);
create index if not exists idx_analytics_events_job on public.analytics_events(job_id);
create index if not exists idx_analytics_events_type on public.analytics_events(event_type);
create index if not exists idx_analytics_events_user_type_date on public.analytics_events(user_id, event_type, created_at desc);

alter table public.analytics_events enable row level security;

-- Owner-only CRUD
drop policy if exists "analytics_events owner crud" on public.analytics_events;
create policy "analytics_events owner crud"
  on public.analytics_events for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Also allow service_role inserts for public beacon (via service client bypasses RLS, but keep policy for completeness)
-- Public profile views already has its own table with anon insert; analytics_events stays owner-only and is populated server-side from trusted slug lookup

-- Ensure resume_analyses already has RLS from 009; no change needed
