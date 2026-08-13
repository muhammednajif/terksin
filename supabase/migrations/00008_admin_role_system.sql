-- ============================================================
-- Admin Role System & Supporting Tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. ADD ROLE COLUMN TO PROFILES
alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'moderator', 'admin'));

-- 2. ADD STATUS TO SAFETY_REPORTS (for admin review workflow)
alter table public.safety_reports
  add column if not exists status text not null default 'pending'
  check (status in ('pending', 'reviewed', 'resolved', 'dismissed'));

-- 3. UPDATE COMMUNITY REPORTS RLS TO USE role COLUMN
-- (the old policy from 00001 was named "Admins can view reports" with verification_badge)
drop policy if exists "Admins can view reports" on public.community_reports;

create policy "Admins and moderators can view reports"
  on public.community_reports for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

create policy "Admins and moderators can update reports"
  on public.community_reports for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

-- 6. AUDIT LOG TABLE
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz default now()
);

alter table public.admin_audit_log enable row level security;

create policy "Admins can view audit log"
  on public.admin_audit_log for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Service can insert audit log"
  on public.admin_audit_log for insert
  with check (true);

-- 7. ANNOUNCEMENTS TABLE
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  title text not null,
  content text not null,
  target_audience text not null default 'all'
    check (target_audience in ('all', 'trekkers', 'moderators', 'admins')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  is_published boolean default false,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.announcements enable row level security;

create policy "Anyone can view published announcements"
  on public.announcements for select
  using (is_published = true);

create policy "Admins can manage announcements"
  on public.announcements for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 8. PROFILES RLS: Only admins can change roles
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator'))
  );

-- 9. HELPER FUNCTION: Check if user is admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'moderator')
  );
$$;

-- 10. AUTO-LOG FUNCTION (called from application)
create or replace function public.log_admin_action(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_details jsonb default null
)
returns void
language sql
security definer
as $$
  insert into public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_details);
$$;
