-- ============================================================
-- User Analytics: email access, event tracking
-- Rerunnable: all statements use IF NOT EXISTS / OR REPLACE
-- ============================================================

-- 1. User events tracking table
create table if not exists public.user_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  event_type text not null,
  page_path text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_user_events_user_id on public.user_events(user_id);
create index if not exists idx_user_events_created_at on public.user_events(created_at desc);

-- 2. RLS: only admins can read, authenticated users can insert their own
alter table public.user_events enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Admins can read all events') then
    create policy "Admins can read all events" on public.user_events
      for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can insert own events') then
    create policy "Users can insert own events" on public.user_events
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- 3. Function to log user events (called from frontend)
create or replace function public.log_user_event(
  p_event_type text,
  p_page_path text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
as $$
  insert into public.user_events (user_id, event_type, page_path, metadata)
  values (auth.uid(), p_event_type, p_page_path, p_metadata);
$$;

-- 4. Function to get user emails (admin only, reads from auth.users)
create or replace function public.get_user_emails()
returns table (id uuid, email text)
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Not authorized';
  end if;
  return query select u.id::uuid, u.email::text from auth.users u;
end;
$$;

-- 5. Function to get user events with filters (admin only)
create or replace function public.get_user_events(
  p_user_id uuid default null,
  p_event_type text default null,
  p_limit int default 500
)
returns table (
  id uuid,
  user_id uuid,
  event_type text,
  page_path text,
  metadata jsonb,
  created_at timestamptz,
  display_name text,
  email text
)
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Not authorized';
  end if;
  return query
    select
      e.id, e.user_id, e.event_type, e.page_path, e.metadata, e.created_at,
      p.display_name, u.email::text
    from public.user_events e
    left join public.profiles p on p.id = e.user_id
    left join auth.users u on u.id = e.user_id
    where (p_user_id is null or e.user_id = p_user_id)
      and (p_event_type is null or e.event_type = p_event_type)
    order by e.created_at desc
    limit p_limit;
end;
$$;
