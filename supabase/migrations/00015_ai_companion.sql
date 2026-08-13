-- ============================================================
-- AI TREK COMPANION
-- Proactive, context-aware digital trekking partner
-- Extends existing architecture — no existing tables modified
-- ============================================================

-- ============================================================
-- PART 1: COMPANION MEMORY
-- Persists user preferences + onboarding state
-- ============================================================

create table if not exists public.ai_companion_memory (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  companion_enabled boolean default true,
  sidebar_collapsed boolean default false,
  onboarded boolean default false,
  updated_at timestamptz default now()
);

alter table public.ai_companion_memory enable row level security;
drop policy if exists "Users manage own companion memory" on public.ai_companion_memory;
create policy "Users manage own companion memory" on public.ai_companion_memory
  for all using (auth.uid() = user_id);

-- ============================================================
-- PART 2: COMPANION INSIGHTS CACHE
-- Generated insights stored for performance
-- ============================================================

create table if not exists public.ai_companion_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  priority text not null check (priority in ('critical','warning','suggestion','information')),
  category text not null check (category in ('weather','community','journey','safety','gear','fitness','achievement','trekpulse','social','readiness','general')),
  title text not null,
  message text not null,
  source text not null,
  source_label text,
  confidence text check (confidence in ('high','medium','low')),
  action_label text,
  action_path text,
  context_page text,
  is_dismissed boolean default false,
  is_read boolean default false,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_companion_insights_user on public.ai_companion_insights(user_id, created_at desc);
alter table public.ai_companion_insights enable row level security;
drop policy if exists "Users read own insights" on public.ai_companion_insights;
create policy "Users read own insights" on public.ai_companion_insights
  for select using (auth.uid() = user_id);
drop policy if exists "Users manage own insights" on public.ai_companion_insights;
create policy "Users manage own insights" on public.ai_companion_insights
  for all using (auth.uid() = user_id);

-- ============================================================
-- PART 3: RPC — GET COMPANION CONTEXT
-- Returns all data the companion needs in one call
-- ============================================================

create or replace function public.get_companion_context(p_user_id uuid)
returns jsonb as $$
declare
  v_result jsonb;
  v_active_journey jsonb;
  v_upcoming_journey jsonb;
  v_completed_count integer;
  v_total_xp integer;
  v_unread_count integer;
begin
  -- Active journey (in progress)
  select jsonb_build_object(
    'id', j.id, 'trek_id', j.trek_id, 'trek_name', j.trek_name,
    'start_date', j.start_date, 'end_date', j.end_date,
    'status', j.status, 'experience_level', j.experience_level,
    'trek_location', j.trek_location
  ) into v_active_journey
  from public.trek_journeys j
  where j.user_id = p_user_id and j.status = 'active'
  order by j.start_date desc limit 1;

  -- Upcoming journey
  select jsonb_build_object(
    'id', j.id, 'trek_id', j.trek_id, 'trek_name', j.trek_name,
    'start_date', j.start_date, 'end_date', j.end_date,
    'status', j.status, 'experience_level', j.experience_level,
    'trek_location', j.trek_location
  ) into v_upcoming_journey
  from public.trek_journeys j
  where j.user_id = p_user_id and j.status in ('planned', 'preparing')
  order by j.start_date asc limit 1;

  select count(*) into v_completed_count
  from public.trek_journeys
  where user_id = p_user_id and status = 'completed';

  select coalesce(xp, 0) into v_total_xp
  from public.profiles where id = p_user_id;

  select count(*) into v_unread_count
  from public.notifications
  where user_id = p_user_id and is_read = false;

  v_result := jsonb_build_object(
    'active_journey', v_active_journey,
    'upcoming_journey', v_upcoming_journey,
    'completed_treks', v_completed_count,
    'total_xp', v_total_xp,
    'unread_notifications', v_unread_count
  );

  return v_result;
end;
$$ language plpgsql security definer;

-- ============================================================
-- PART 4: RPC — DISMISS INSIGHT
-- ============================================================

create or replace function public.dismiss_companion_insight(p_insight_id uuid)
returns void as $$
begin
  update public.ai_companion_insights
  set is_dismissed = true
  where id = p_insight_id and user_id = auth.uid();
end;
$$ language plpgsql security definer;

-- ============================================================
-- PART 5: RPC — INIT COMPANION MEMORY
-- ============================================================

create or replace function public.init_companion_memory()
returns void as $$
begin
  insert into public.ai_companion_memory (user_id, companion_enabled, onboarded)
  values (auth.uid(), true, false)
  on conflict (user_id) do nothing;
end;
$$ language plpgsql security definer;
