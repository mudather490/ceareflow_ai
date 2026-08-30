-- 002_core_profile.sql
-- Career Profile and associated child tables

create table if not exists public.career_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.users(id) on delete cascade,
  headline_title text,
  summary text,
  location text,
  contact_email text,
  linkedin_url text,
  portfolio_url text,
  completion_score smallint not null default 0 check (completion_score >= 0 and completion_score <= 100),
  last_edited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_career_profiles_user_id on public.career_profiles(user_id);

create trigger on_career_profiles_updated
  before update on public.career_profiles
  for each row execute function public.handle_updated_at();

-- Experiences
create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  career_profile_id uuid not null references public.career_profiles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  company text not null,
  title text not null,
  location text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  bullets jsonb not null default '[]'::jsonb,
  order_index smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_experiences_profile_id on public.experiences(career_profile_id);
create index if not exists idx_experiences_user_id on public.experiences(user_id);

create trigger on_experiences_updated
  before update on public.experiences
  for each row execute function public.handle_updated_at();

-- Education
create table if not exists public.education (
  id uuid primary key default gen_random_uuid(),
  career_profile_id uuid not null references public.career_profiles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  institution text not null,
  degree text not null,
  field text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_education_profile_id on public.education(career_profile_id);
create index if not exists idx_education_user_id on public.education(user_id);

create trigger on_education_updated
  before update on public.education
  for each row execute function public.handle_updated_at();

-- Skills
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  career_profile_id uuid not null references public.career_profiles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  category text,
  proficiency smallint check (proficiency is null or (proficiency >= 0 and proficiency <= 100)),
  created_at timestamptz not null default now(),
  constraint uq_skills_profile_name unique (career_profile_id, name)
);

create index if not exists idx_skills_profile_id on public.skills(career_profile_id);
create index if not exists idx_skills_user_id on public.skills(user_id);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  career_profile_id uuid not null references public.career_profiles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text not null,
  url text,
  tech_stack text[] default '{}',
  order_index smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_profile_id on public.projects(career_profile_id);
create index if not exists idx_projects_user_id on public.projects(user_id);

create trigger on_projects_updated
  before update on public.projects
  for each row execute function public.handle_updated_at();

-- Certifications
create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  career_profile_id uuid not null references public.career_profiles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  issuer text,
  issued_date date,
  url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_certifications_profile_id on public.certifications(career_profile_id);
create index if not exists idx_certifications_user_id on public.certifications(user_id);
