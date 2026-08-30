-- 007_interviews.sql
-- Interviews, questions, answers, feedback

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  career_profile_version_id uuid,
  interview_type text not null default 'mixed' check (interview_type in ('behavioral','technical','mixed')),
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  question_count int not null default 5,
  status text not null default 'creating' check (status in ('creating','active','abandoned','completed','feedback_ready')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_interviews_user_created on public.interviews(user_id, created_at desc);
create index if not exists idx_interviews_job_id on public.interviews(job_id);

-- Questions
create table if not exists public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  question_text text not null,
  hint text,
  order_index smallint not null default 0,
  source text not null default 'llm_initial' check (source in ('llm_initial','llm_followup','llm_pivot')),
  status text not null default 'pending' check (status in ('pending','active','answered','skipped')),
  created_at timestamptz not null default now()
);

create index if not exists idx_interview_questions_interview_order on public.interview_questions(interview_id, order_index);

-- Answers
create table if not exists public.interview_answers (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  question_id uuid not null references public.interview_questions(id) on delete cascade,
  storage_path text,
  mime_type text default 'video/webm',
  duration_sec int,
  transcript text,
  status text not null default 'ready' check (status in ('uploading','ready','failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_interview_answers_question on public.interview_answers(question_id);

-- Feedback (session-level)
create table if not exists public.interview_feedback (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid unique not null references public.interviews(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  overall_score smallint not null check (overall_score >= 0 and overall_score <= 100),
  label text not null check (label in ('needs_work','developing','proficient','strong')),
  dimensions jsonb not null default '{}'::jsonb,
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  ai_recommendation text,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists idx_interview_feedback_user on public.interview_feedback(user_id);

-- Answer feedback (per-answer)
create table if not exists public.interview_answer_feedback (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  question_id uuid not null references public.interview_questions(id) on delete cascade,
  answer_id uuid not null references public.interview_answers(id) on delete cascade,
  dimension_scores jsonb default '{}'::jsonb,
  feedback text,
  created_at timestamptz not null default now()
);
