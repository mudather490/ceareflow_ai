-- 008_resume_ai.sql
-- Resume AI: analyses, suggestions

create table if not exists public.resume_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  resume_version_id uuid not null references public.resume_versions(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  summary text,
  category_scores jsonb not null default '{}'::jsonb,
  model text,
  prompt_hash text,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_resume_analyses_user_created on public.resume_analyses(user_id, created_at desc);

-- Suggestions
create table if not exists public.resume_suggestions (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.resume_analyses(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  category text not null check (category in ('ats','relevance','impact','clarity','structure','evidence')),
  target_experience_id uuid references public.experiences(id) on delete set null,
  target_bullet_index int,
  original_text text not null,
  suggested_text text,
  prompt_question text,
  reasoning text not null,
  confidence real not null check (confidence >= 0.0 and confidence <= 1.0),
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  edited_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resume_suggestions_analysis_status on public.resume_suggestions(analysis_id, status);

create trigger on_resume_suggestions_updated
  before update on public.resume_suggestions
  for each row execute function public.handle_updated_at();
