-- 003_resumes_and_versions.sql
-- Resumes and immutable version history

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null default 'My Resume',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resumes_user_id on public.resumes(user_id);

create trigger on_resumes_updated
  before update on public.resumes
  for each row execute function public.handle_updated_at();

-- Resume Versions (Append-only immutable)
create table if not exists public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  version_number int not null,
  file_path text,
  extracted_text text,
  parsed_data jsonb,
  hash text,
  source text not null check (source in ('upload', 'generated')),
  parent_analysis_id uuid,
  created_at timestamptz not null default now(),
  constraint uq_resume_version unique (resume_id, version_number)
);

create index if not exists idx_resume_versions_user_id_created on public.resume_versions(user_id, created_at desc);
create index if not exists idx_resume_versions_resume_id on public.resume_versions(resume_id);
