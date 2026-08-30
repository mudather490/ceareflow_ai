-- 009_rls_policies.sql
-- Row Level Security (RLS) policies for all tables

-- Enable RLS on every table
alter table public.users enable row level security;
alter table public.career_profiles enable row level security;
alter table public.experiences enable row level security;
alter table public.education enable row level security;
alter table public.skills enable row level security;
alter table public.projects enable row level security;
alter table public.certifications enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_versions enable row level security;
alter table public.jobs enable row level security;
alter table public.job_matches enable row level security;
alter table public.scripts enable row level security;
alter table public.videos enable row level security;
alter table public.public_profiles enable row level security;
alter table public.public_profile_views enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_questions enable row level security;
alter table public.interview_answers enable row level security;
alter table public.interview_feedback enable row level security;
alter table public.interview_answer_feedback enable row level security;
alter table public.resume_analyses enable row level security;
alter table public.resume_suggestions enable row level security;

-- Users policy
create policy "users owner crud"
  on public.users for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- Career Profile policies
create policy "career_profiles owner crud"
  on public.career_profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "experiences owner crud"
  on public.experiences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "education owner crud"
  on public.education for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "skills owner crud"
  on public.skills for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "projects owner crud"
  on public.projects for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "certifications owner crud"
  on public.certifications for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Resumes & Versions
create policy "resumes owner crud"
  on public.resumes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "resume_versions owner select"
  on public.resume_versions for select
  using (user_id = auth.uid());

create policy "resume_versions owner insert"
  on public.resume_versions for insert
  with check (user_id = auth.uid());

create policy "resume_versions owner delete"
  on public.resume_versions for delete
  using (user_id = auth.uid());

-- Jobs & Matches
create policy "jobs owner crud"
  on public.jobs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "job_matches owner crud"
  on public.job_matches for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Video Resume
create policy "scripts owner crud"
  on public.scripts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "videos owner crud"
  on public.videos for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "public_profiles owner crud"
  on public.public_profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Whitelisted view for public profiles (unauthenticated reads)
create or replace view public.public_profile_public_view as
  select
    p.slug,
    p.user_id,
    p.video_id,
    p.resume_version_id,
    p.title_override,
    p.published_at,
    u.display_name,
    cp.headline_title,
    cp.summary,
    cp.location,
    cp.linkedin_url,
    cp.portfolio_url
  from public.public_profiles p
  join public.users u on u.id = p.user_id
  join public.career_profiles cp on cp.user_id = p.user_id
  where p.is_published = true;

grant select on public.public_profile_public_view to anon, authenticated;

-- Analytics views policies
create policy "anon insert views"
  on public.public_profile_views for insert
  with check (true);

create policy "owner read views"
  on public.public_profile_views for select
  using (public_profile_id in (
    select id from public.public_profiles where user_id = auth.uid()
  ));

-- Interviews policies
create policy "interviews owner crud"
  on public.interviews for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "interview_questions owner crud"
  on public.interview_questions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "interview_answers owner crud"
  on public.interview_answers for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "interview_feedback owner crud"
  on public.interview_feedback for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "interview_answer_feedback owner crud"
  on public.interview_answer_feedback for all
  using (
    interview_id in (select id from public.interviews where user_id = auth.uid())
  )
  with check (
    interview_id in (select id from public.interviews where user_id = auth.uid())
  );

-- Resume AI policies
create policy "resume_analyses owner crud"
  on public.resume_analyses for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "resume_suggestions owner crud"
  on public.resume_suggestions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
