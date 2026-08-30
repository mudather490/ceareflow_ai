-- 005_video_resume.sql
-- Video Resume: scripts, videos, public_profiles

create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  opening text not null,
  experience text not null,
  skills text not null,
  closing text not null,
  word_count int not null default 0,
  prompt_hash text,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_scripts_user_job unique (user_id, job_id)
);

create index if not exists idx_scripts_job_id on public.scripts(job_id);

create trigger on_scripts_updated
  before update on public.scripts
  for each row execute function public.handle_updated_at();

-- Videos
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  script_id uuid references public.scripts(id) on delete set null,
  storage_path text not null,
  thumbnail_path text,
  mime_type text not null default 'video/webm',
  duration_sec int,
  file_size_bytes bigint,
  status text not null default 'ready' check (status in ('processing','ready','failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_videos_job_id on public.videos(job_id);
create index if not exists idx_videos_user_id on public.videos(user_id);

-- Public Profiles
create table if not exists public.public_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  video_id uuid references public.videos(id) on delete set null,
  resume_version_id uuid not null references public.resume_versions(id) on delete cascade,
  slug text unique not null,
  is_published boolean not null default false,
  published_at timestamptz,
  title_override text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_public_profiles_slug on public.public_profiles(slug);
create index if not exists idx_public_profiles_user_created on public.public_profiles(user_id, created_at desc);

create trigger on_public_profiles_updated
  before update on public.public_profiles
  for each row execute function public.handle_updated_at();
