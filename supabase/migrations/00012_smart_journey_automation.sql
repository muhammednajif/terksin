-- ============================================================
-- SMART JOURNEY AUTOMATION
-- trek_journeys, journey_tasks, journey_gear_items, journey_readiness_items
-- + Edge Function support
-- ============================================================

-- 1. TREK JOURNEYS
create table if not exists public.trek_journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  trek_id text not null,
  trek_name text not null,
  trek_location text,
  trek_image_url text,
  start_date date not null,
  end_date date not null,
  experience_level text check (experience_level in ('beginner','intermediate','advanced')),
  emergency_contact text,
  source text not null default 'manual_plan' check (source in ('manual_plan','expedition_booking','group_trek')),
  source_booking_id uuid,
  status text not null default 'planned' check (status in ('planned','preparing','active','awaiting_completion','completed','cancelled')),
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_user_trek_booking unique (user_id, trek_id, source_booking_id) deferrable initially deferred,
  constraint valid_dates check (end_date >= start_date)
);

create index if not exists idx_trek_journeys_user_id on public.trek_journeys(user_id);
create index if not exists idx_trek_journeys_status on public.trek_journeys(status);
create index if not exists idx_trek_journeys_trek_id on public.trek_journeys(trek_id);

alter table public.trek_journeys enable row level security;

-- RLS: users can read/update/delete their own journeys
create policy "Users can read own journeys"
  on public.trek_journeys for select
  using (auth.uid() = user_id);

create policy "Users can insert own journeys"
  on public.trek_journeys for insert
  with check (auth.uid() = user_id);

create policy "Users can update own journeys"
  on public.trek_journeys for update
  using (auth.uid() = user_id);

create policy "Users can delete own journeys"
  on public.trek_journeys for delete
  using (auth.uid() = user_id);

-- Admins can read all journeys (for support)
create policy "Admins can read all journeys"
  on public.trek_journeys for select
  using (coalesce((select role from public.profiles where id = auth.uid()), 'user') in ('admin','moderator'));

-- 2. JOURNEY TASKS (automation schedule)
create table if not exists public.journey_tasks (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid references public.trek_journeys(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  task_type text not null check (task_type in (
    'preparation_7_days','conditions_3_days','readiness_1_day','trek_start','expected_completion','share_experience'
  )),
  title text not null,
  message text,
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','cancelled','failed')),
  sent_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  retry_count integer default 0,
  last_error text,
  created_at timestamptz default now()
);

create index if not exists idx_journey_tasks_due on public.journey_tasks(scheduled_for, status);
create index if not exists idx_journey_tasks_journey on public.journey_tasks(journey_id);
create index if not exists idx_journey_tasks_user on public.journey_tasks(user_id);

alter table public.journey_tasks enable row level security;

-- RLS: users can read their own tasks (UI needs to check status)
create policy "Users can read own tasks"
  on public.journey_tasks for select
  using (auth.uid() = user_id);

-- The Edge Function uses service_role so it bypasses RLS for writes.
-- Users should not insert/update/delete tasks directly.
create policy "Users cannot insert tasks"
  on public.journey_tasks for insert
  with check (false);

create policy "Users cannot update tasks"
  on public.journey_tasks for update
  using (false);

create policy "Users cannot delete tasks"
  on public.journey_tasks for delete
  using (false);

-- 3. JOURNEY GEAR ITEMS
create table if not exists public.journey_gear_items (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid references public.trek_journeys(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  item_name text not null,
  category text not null default 'other' check (category in ('clothing','footwear','navigation','food_water','safety','shelter','electronics','personal','other')),
  is_essential boolean default false,
  is_checked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_journey_gear_journey on public.journey_gear_items(journey_id);

alter table public.journey_gear_items enable row level security;

create policy "Users can read own gear"
  on public.journey_gear_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own gear"
  on public.journey_gear_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own gear"
  on public.journey_gear_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own gear"
  on public.journey_gear_items for delete
  using (auth.uid() = user_id);

-- 4. JOURNEY READINESS ITEMS
create table if not exists public.journey_readiness_items (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid references public.trek_journeys(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  label text not null,
  is_checked boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_journey_readiness_journey on public.journey_readiness_items(journey_id);

alter table public.journey_readiness_items enable row level security;

create policy "Users can read own readiness"
  on public.journey_readiness_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own readiness"
  on public.journey_readiness_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own readiness"
  on public.journey_readiness_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own readiness"
  on public.journey_readiness_items for delete
  using (auth.uid() = user_id);

-- 5. CREATE JOURNEY TASKS FUNCTION
-- Called when a journey is created/manually via trigger or application logic
create or replace function public.create_journey_tasks(p_journey_id uuid)
returns void as $$
declare
  v_user_id uuid;
  v_start_date date;
  v_end_date date;
  v_trek_name text;
  v_days_to_start integer;
begin
  select user_id, start_date, end_date, trek_name
  into v_user_id, v_start_date, v_end_date, v_trek_name
  from public.trek_journeys where id = p_journey_id;

  if not found then
    raise exception 'Journey not found';
  end if;

  v_days_to_start := (v_start_date - current_date);

  -- 7 days before: preparation reminder
  if v_days_to_start >= 7 then
    insert into public.journey_tasks (journey_id, user_id, task_type, title, message, scheduled_for)
    values (
      p_journey_id, v_user_id, 'preparation_7_days',
      'Start Preparing for ' || v_trek_name,
      'Your trek starts in 7 days. Review your fitness preparation and gear checklist.',
      (v_start_date - interval '7 days')::timestamptz
    );
  end if;

  -- 3 days before: conditions & gear check (only if >= 3 days out)
  if v_days_to_start >= 3 then
    insert into public.journey_tasks (journey_id, user_id, task_type, title, message, scheduled_for)
    values (
      p_journey_id, v_user_id, 'conditions_3_days',
      'Final Gear & Conditions Check',
      'Your trek starts in 3 days. Review the weather, trail conditions, and your gear checklist.',
      (v_start_date - interval '3 days')::timestamptz
    );
  end if;

  -- 1 day before: readiness
  if v_days_to_start >= 1 then
    insert into public.journey_tasks (journey_id, user_id, task_type, title, message, scheduled_for)
    values (
      p_journey_id, v_user_id, 'readiness_1_day',
      'Ready for Tomorrow?',
      'Complete your final readiness check, review your emergency contact, and save essential route information.',
      (v_start_date - interval '1 day')::timestamptz
    );
  end if;

  -- Trek day: mark active
  insert into public.journey_tasks (journey_id, user_id, task_type, title, message, scheduled_for)
  values (
    p_journey_id, v_user_id, 'trek_start',
    'Your Adventure Starts Today',
    'Your ' || v_trek_name || ' journey begins today. Open your journey dashboard for important information.',
    v_start_date::timestamptz
  );

  -- After expected end date: completion prompt
  insert into public.journey_tasks (journey_id, user_id, task_type, title, message, scheduled_for)
  values (
    p_journey_id, v_user_id, 'expected_completion',
    'How Was Your Trek?',
    'Did you complete your ' || v_trek_name || ' journey? Let us know how it went.',
    (v_end_date + interval '1 day')::timestamptz
  );
end;
$$ language plpgsql security definer;

-- 6. CREATE GEAR ITEMS FUNCTION
create or replace function public.create_default_gear_items(p_journey_id uuid)
returns void as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from public.trek_journeys where id = p_journey_id;
  if not found then return; end if;

  insert into public.journey_gear_items (journey_id, user_id, item_name, category, is_essential)
  values
    (p_journey_id, v_user_id, 'Backpack (40-60L)', 'clothing', true),
    (p_journey_id, v_user_id, 'Trekking Shoes', 'footwear', true),
    (p_journey_id, v_user_id, 'Moisture-Wicking Base Layer', 'clothing', true),
    (p_journey_id, v_user_id, 'Fleece or Insulating Layer', 'clothing', true),
    (p_journey_id, v_user_id, 'Waterproof Jacket', 'clothing', true),
    (p_journey_id, v_user_id, 'Trekking Pants', 'clothing', true),
    (p_journey_id, v_user_id, 'Warm Hat and Gloves', 'clothing', false),
    (p_journey_id, v_user_id, 'Trekking Poles', 'footwear', false),
    (p_journey_id, v_user_id, 'Map and Compass', 'navigation', true),
    (p_journey_id, v_user_id, 'GPS Device or Phone with Maps', 'navigation', true),
    (p_journey_id, v_user_id, 'Water Bottles or Hydration Bladder', 'food_water', true),
    (p_journey_id, v_user_id, 'High-Energy Snacks', 'food_water', true),
    (p_journey_id, v_user_id, 'First-Aid Kit', 'safety', true),
    (p_journey_id, v_user_id, 'Headlamp with Extra Batteries', 'safety', true),
    (p_journey_id, v_user_id, 'Whistle and Emergency Blanket', 'safety', true),
    (p_journey_id, v_user_id, 'Sunscreen and Sunglasses', 'personal', true),
    (p_journey_id, v_user_id, 'Toilet Paper and Hand Sanitizer', 'personal', false),
    (p_journey_id, v_user_id, 'Insect Repellent', 'personal', false),
    (p_journey_id, v_user_id, 'Multi-Tool or Knife', 'safety', false),
    (p_journey_id, v_user_id, 'Power Bank and Charging Cables', 'electronics', false);
end;
$$ language plpgsql security definer;

-- 7. CREATE READINESS ITEMS FUNCTION
create or replace function public.create_default_readiness_items(p_journey_id uuid)
returns void as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from public.trek_journeys where id = p_journey_id;
  if not found then return; end if;

  insert into public.journey_readiness_items (journey_id, user_id, label)
  values
    (p_journey_id, v_user_id, 'I reviewed the trek difficulty level'),
    (p_journey_id, v_user_id, 'I reviewed my required gear checklist'),
    (p_journey_id, v_user_id, 'I checked available weather information'),
    (p_journey_id, v_user_id, 'I reviewed available trail information'),
    (p_journey_id, v_user_id, 'I saved important emergency contacts'),
    (p_journey_id, v_user_id, 'I understand the route information available'),
    (p_journey_id, v_user_id, 'I have enough food and water planned'),
    (p_journey_id, v_user_id, 'I understand that community reports are not official emergency alerts');
end;
$$ language plpgsql security definer;

-- 8. UPDATE NOTIFICATION TYPE CHECK
-- Add new journey notification types to the existing check constraint
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('follow','post_like','comment','reply','mention','trek_invite','event_update','challenge_complete','badge_earned','safety_alert','journey_reminder','journey_completion','journey_safety'));

-- 9. JOURNEY XP FUNCTION (simple rule-based)
create or replace function public.award_journey_xp(p_journey_id uuid)
returns integer as $$
declare
  v_user_id uuid;
  v_trek_id text;
  v_difficulty text;
  v_duration_days integer;
  v_distance float8;
  v_base_xp integer;
  v_xp integer;
begin
  -- Get journey details
  select user_id, trek_id, (end_date - start_date) as duration
  into v_user_id, v_trek_id, v_duration_days
  from public.trek_journeys where id = p_journey_id;

  if not found then
    raise exception 'Journey not found';
  end if;

  -- Try to get difficulty from treks table (if exists) or default
  begin
    select difficulty, distance
    into v_difficulty, v_distance
    from public.treks where id = v_trek_id;
  exception when undefined_table then
    v_difficulty := 'moderate';
    v_distance := 0;
  end;

  if v_difficulty is null then v_difficulty := 'moderate'; end if;
  if v_distance is null then v_distance := 0; end if;

  -- Base XP by difficulty
  v_base_xp := case v_difficulty
    when 'Easy' then 200
    when 'Moderate' then 500
    when 'Hard' then 1000
    when 'Extreme' then 1500
    else 300
  end;

  -- Bonus for duration (per day)
  v_xp := v_base_xp + (coalesce(v_duration_days, 0) * 50);

  -- Bonus for distance (per km)
  if v_distance > 0 then
    v_xp := v_xp + (v_distance::integer * 2);
  end if;

  -- Update user profile
  update public.profiles
  set
    xp = xp + v_xp,
    completed_treks = completed_treks + 1,
    total_distance_km = coalesce(total_distance_km, 0) + coalesce(v_distance, 0),
    trekker_level = greatest(
      case
        when xp + v_xp >= 50000 then 6
        when xp + v_xp >= 15000 then 5
        when xp + v_xp >= 5000 then 4
        when xp + v_xp >= 2000 then 3
        when xp + v_xp >= 500 then 2
        else 1
      end, trekker_level
    )
  where id = v_user_id;

  return v_xp;
end;
$$ language plpgsql security definer;

-- Add trek_id to safety_reports for journey matching
alter table public.safety_reports
  add column if not exists trek_id text;

create index if not exists idx_safety_reports_trek_id on public.safety_reports(trek_id);

-- 10. SAFETY REPORT MATCHING FUNCTION
-- Finds active/upcoming journeys matching a safety report's trek_id
create or replace function public.match_safety_report_to_journeys(p_report_id uuid)
returns table (journey_id uuid, user_id uuid) as $$
declare
  v_trek_id text;
begin
  select trek_id into v_trek_id
  from public.safety_reports
  where id = p_report_id;

  if v_trek_id is null then return; end if;

  return query
  select tj.id, tj.user_id
  from public.trek_journeys tj
  where tj.trek_id = v_trek_id
    and tj.status in ('planned', 'preparing', 'active')
    and tj.end_date >= current_date;
end;
$$ language plpgsql security definer;
