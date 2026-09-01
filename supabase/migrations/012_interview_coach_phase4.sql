-- 012_interview_coach_phase4.sql
-- Phase 4 — Interview Coach: extend existing interview tables to satisfy spec STEP 3 without breaking Phase 1-3
-- Reuses 007_interviews.sql tables; adds spec-required fields and normalizes status handling

-- -------------------------------------------------------------------
-- Interviews: add updated_at and expand status to support spec's draft/in_progress/completed
-- Existing status values: creating, active, abandoned, completed, feedback_ready
-- Spec status values: draft, in_progress, completed
-- We support union of all for backward compat
-- -------------------------------------------------------------------
alter table public.interviews add column if not exists updated_at timestamptz not null default now();

-- Drop old check constraint if exists (auto-named)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'interviews_status_check' and conrelid = 'public.interviews'::regclass
  ) then
    alter table public.interviews drop constraint interviews_status_check;
  end if;
end $$;

alter table public.interviews
  add constraint interviews_status_check
  check (status in ('creating','active','abandoned','completed','feedback_ready','draft','in_progress'));

-- Keep updated_at fresh
create or replace function public.handle_interview_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_interviews_updated on public.interviews;
create trigger on_interviews_updated
  before update on public.interviews
  for each row execute function public.handle_interview_updated_at();

-- -------------------------------------------------------------------
-- Interview Questions: add category, difficulty, ideal_focus (spec STEP 3)
-- Existing columns: question_text, hint, order_index, source, status
-- New: category, difficulty, ideal_focus map 1:1 to spec
-- -------------------------------------------------------------------
alter table public.interview_questions add column if not exists category text check (category in ('behavioral','technical','role_specific','company','resume_based','situational'));
alter table public.interview_questions add column if not exists difficulty text check (difficulty in ('easy','medium','hard'));
alter table public.interview_questions add column if not exists ideal_focus text;

-- Backfill existing rows with defaults where null (safe for schema cache)
update public.interview_questions set category = 'behavioral' where category is null;
update public.interview_questions set difficulty = 'medium' where difficulty is null;

-- -------------------------------------------------------------------
-- Interview Answers: add spec fields answer, feedback, score, updated_at
-- Existing columns: storage_path, mime_type, duration_sec, transcript, status
-- transcript remains for video transcription / typed fallback; answer is canonical text field per spec
-- feedback/score mirror interview_answer_feedback but denormalized here for simple spec compliance
-- -------------------------------------------------------------------
alter table public.interview_answers add column if not exists answer text;
alter table public.interview_answers add column if not exists feedback text;
alter table public.interview_answers add column if not exists score smallint check (score >= 0 and score <= 100);
alter table public.interview_answers add column if not exists updated_at timestamptz not null default now();

create or replace function public.handle_interview_answer_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_interview_answers_updated on public.interview_answers;
create trigger on_interview_answers_updated
  before update on public.interview_answers
  for each row execute function public.handle_interview_answer_updated_at();

-- -------------------------------------------------------------------
-- Indexes for new query patterns (category filtering, score sorting)
-- -------------------------------------------------------------------
create index if not exists idx_interview_questions_category on public.interview_questions(category);
create index if not exists idx_interview_answers_question_score on public.interview_answers(question_id, score);
