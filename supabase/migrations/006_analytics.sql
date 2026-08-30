-- 006_analytics.sql
-- Analytics: public_profile_views

create table if not exists public.public_profile_views (
  id uuid primary key default gen_random_uuid(),
  public_profile_id uuid not null references public.public_profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  ip_hash text,
  user_agent text,
  referer text,
  country_code char(2),
  cta text not null default 'view'
);

create index if not exists idx_public_profile_views_profile_date on public.public_profile_views(public_profile_id, viewed_at desc);
create index if not exists idx_public_profile_views_dedup on public.public_profile_views(public_profile_id, ip_hash, viewed_at desc);
