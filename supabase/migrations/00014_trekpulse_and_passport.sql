-- ============================================================
-- TREKPULSE + ADVENTURE PASSPORT
-- Sits on top of existing architecture. Does not modify any
-- existing tables or break existing features.
-- ============================================================

-- ============================================================
-- PART 1: TREKPULSE — Trail Intelligence
-- ============================================================

create table if not exists public.trekpulse_trail_scores (
  trek_id text primary key,
  score integer not null default 75 check (score between 0 and 100),
  weather_status text check (weather_status in ('good','moderate','poor','unknown')),
  community_activity text check (community_activity in ('high','moderate','low','none')),
  trail_risk text check (trail_risk in ('low','moderate','high','extreme','unknown')),
  group_trek_available boolean default false,
  journey_activity_count integer default 0,
  trail_confidence text check (trail_confidence in ('high','medium','low')),
  last_updated timestamptz default now(),
  popular boolean default false,
  recent_incidents boolean default false
);

alter table public.trekpulse_trail_scores enable row level security;
drop policy if exists "Anyone can read trekpulse scores" on public.trekpulse_trail_scores;
create policy "Anyone can read trekpulse scores" on public.trekpulse_trail_scores for select using (true);
drop policy if exists "Service role manages scores" on public.trekpulse_trail_scores;
create policy "Service role manages scores" on public.trekpulse_trail_scores for all using (false);

create table if not exists public.trekpulse_reports (
  id uuid primary key default gen_random_uuid(),
  trek_id text not null,
  user_id uuid references public.profiles(id) on delete set null,
  report_type text not null check (report_type in ('trail_condition','weather','safety','crowding','wildlife','route_change','other')),
  severity text not null check (severity in ('info','advisory','warning','danger')),
  title text not null,
  message text not null,
  source text not null default 'community' check (source in ('community','safety_report','automation','official')),
  source_id text,
  is_resolved boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_trekpulse_reports_trek on public.trekpulse_reports(trek_id);
create index if not exists idx_trekpulse_reports_severity on public.trekpulse_reports(severity);
alter table public.trekpulse_reports enable row level security;
drop policy if exists "Anyone can read trekpulse reports" on public.trekpulse_reports;
create policy "Anyone can read trekpulse reports" on public.trekpulse_reports for select using (true);
drop policy if exists "Auth users can insert reports" on public.trekpulse_reports;
create policy "Auth users can insert reports" on public.trekpulse_reports for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own reports" on public.trekpulse_reports;
create policy "Users can update own reports" on public.trekpulse_reports for update using (auth.uid() = user_id);

-- Seed trekpulse scores for all known treks
insert into public.trekpulse_trail_scores (trek_id, score, weather_status, community_activity, trail_risk, group_trek_available, journey_activity_count, trail_confidence, popular)
select t.id, 
  case when t.difficulty = 'Easy' then 85 when t.difficulty = 'Moderate' then 75 when t.difficulty = 'Hard' then 65 else 55 end,
  'good', 'moderate', 'low', true, floor(random() * 20 + 5)::int, 'medium', true
from (select distinct id, difficulty from (values 
  ('everest-base-camp','Hard'),('annapurna-circuit','Moderate'),('mount-fuji-yoshida','Moderate'),
  ('inca-trail','Moderate'),('patagonia-o-circuit','Hard'),('tour-du-mont-blanc','Moderate'),
  ('camino-frances','Moderate'),('kilimanjaro-machame','Hard'),('john-muir-trail','Hard'),
  ('west-coast-trail','Hard'),('milford-track','Moderate')
) as t(id, difficulty)) t
on conflict (trek_id) do nothing;

-- ============================================================
-- PART 2: ADVENTURE PASSPORT
-- ============================================================

create table if not exists public.passport_stamps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  journey_id uuid references public.trek_journeys(id) on delete cascade,
  trek_id text not null,
  trek_name text not null,
  completed_at timestamptz not null default now(),
  difficulty text,
  distance_km float8,
  xp_earned integer default 0,
  location text,
  image_url text,
  country text,
  continent text,
  summary text,
  unique (user_id, journey_id)
);

create index if not exists idx_passport_stamps_user on public.passport_stamps(user_id);
create index if not exists idx_passport_stamps_trek on public.passport_stamps(trek_id);
alter table public.passport_stamps enable row level security;
drop policy if exists "Users can read own stamps" on public.passport_stamps;
create policy "Users can read own stamps" on public.passport_stamps for select using (auth.uid() = user_id);
drop policy if exists "Service role manages stamps" on public.passport_stamps;
create policy "Service role manages stamps" on public.passport_stamps for all using (false);

create table if not exists public.achievements_definitions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  icon text,
  category text check (category in ('exploration','distance','elevation','special','social','milestone')),
  requirement_type text not null,
  requirement_value integer not null,
  sort_order integer default 0
);

alter table public.achievements_definitions enable row level security;
drop policy if exists "Anyone can read achievements" on public.achievements_definitions;
create policy "Anyone can read achievements" on public.achievements_definitions for select using (true);

insert into public.achievements_definitions (key, name, description, icon, category, requirement_type, requirement_value, sort_order) values
  ('first_trek', 'First Trek', 'Complete your first trek', 'Mountain', 'milestone', 'completed_treks', 1, 1),
  ('weekend_explorer', 'Weekend Explorer', 'Complete 3 treks', 'Calendar', 'milestone', 'completed_treks', 3, 2),
  ('mountain_hunter', 'Mountain Hunter', 'Complete 5 treks', 'Mountain', 'exploration', 'completed_treks', 5, 3),
  ('forest_wanderer', 'Forest Wanderer', 'Complete a trek in a forest region', 'Trees', 'exploration', 'forest_treks', 1, 4),
  ('100k_club', '100 KM Club', 'Hike 100km total', 'Footprints', 'distance', 'total_distance_km', 100, 5),
  ('500k_club', '500 KM Club', 'Hike 500km total', 'Footprints', 'distance', 'total_distance_km', 500, 6),
  ('high_altitude', 'High Altitude Explorer', 'Reach 3000m elevation', 'ArrowUpFromLine', 'elevation', 'highest_elevation', 3000, 7),
  ('night_trekker', 'Night Trekker', 'Complete a midnight or early morning trek', 'Moon', 'special', 'night_treks', 1, 8),
  ('adventure_master', 'Adventure Master', 'Complete 10 treks', 'Award', 'milestone', 'completed_treks', 10, 9),
  ('globetrotter', 'Globetrotter', 'Trek in 3 different countries', 'Globe', 'exploration', 'countries', 3, 10),
  ('peak_bagger', 'Peak Baggar', 'Complete 3 mountain treks', 'Triangle', 'exploration', 'mountain_treks', 3, 11)
on conflict (key) do nothing;

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  achievement_id uuid references public.achievements_definitions(id) on delete cascade not null,
  journey_id uuid references public.trek_journeys(id) on delete set null,
  unlocked_at timestamptz default now(),
  unique (user_id, achievement_id)
);

create index if not exists idx_user_achievements_user on public.user_achievements(user_id);
alter table public.user_achievements enable row level security;
drop policy if exists "Users can read own achievements" on public.user_achievements;
create policy "Users can read own achievements" on public.user_achievements for select using (auth.uid() = user_id);
drop policy if exists "Service role manages achievements" on public.user_achievements;
create policy "Service role manages achievements" on public.user_achievements for all using (false);

create table if not exists public.passport_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_xp integer default 0,
  completed_treks integer default 0,
  countries integer default 0,
  states integer default 0,
  cities integer default 0,
  peaks integer default 0,
  waterfalls integer default 0,
  forests integer default 0,
  deserts integer default 0,
  highest_altitude_m float8 default 0,
  longest_trek_km float8 default 0,
  lifetime_distance_km float8 default 0,
  lifetime_elevation_m float8 default 0,
  current_streak integer default 0,
  longest_streak integer default 0,
  updated_at timestamptz default now()
);

alter table public.passport_stats enable row level security;
drop policy if exists "Users can read own passport stats" on public.passport_stats;
create policy "Users can read own passport stats" on public.passport_stats for select using (auth.uid() = user_id);
drop policy if exists "Service role manages passport stats" on public.passport_stats;
create policy "Service role manages passport stats" on public.passport_stats for all using (false);

-- ============================================================
-- PART 3: TREKPULSE SCORING ENGINE
-- ============================================================

create or replace function public.calculate_trekpulse_score(p_trek_id text)
returns void as $$
declare
  v_recent_reports integer;
  v_active_journeys integer;
  v_recent_posts integer;
  v_safety_reports integer;
  v_severity_penalty integer := 0;
  v_popularity_bonus integer := 0;
  v_community_score integer;
  v_final_score integer;
begin
  -- Count recent negative reports (last 7 days)
  select count(*) into v_recent_reports
  from public.trekpulse_reports
  where trek_id = p_trek_id and created_at > now() - interval '7 days'
    and severity in ('warning', 'danger');

  -- Count active journeys
  select count(*) into v_active_journeys
  from public.trek_journeys
  where trek_id = p_trek_id and status in ('planned', 'preparing', 'active');

  -- Count recent community posts (last 14 days)
  select count(*) into v_recent_posts
  from public.community_posts
  where trek_id = p_trek_id and created_at > now() - interval '14 days';

  -- Count safety reports
  select count(*) into v_safety_reports
  from public.safety_reports
  where trek_id = p_trek_id and created_at > now() - interval '30 days';

  -- Calculate penalty from severe reports
  v_severity_penalty := least(v_recent_reports * 15, 50);

  -- Popularity bonus (based on active interest)
  v_popularity_bonus := least(v_active_journeys * 3, 20);

  -- Community activity score (0-30)
  v_community_score := least(v_recent_posts * 5 + v_active_journeys, 30);

  -- Final score: base 75 + community - severity + popularity
  v_final_score := 75 + v_community_score - v_severity_penalty + v_popularity_bonus;
  v_final_score := greatest(0, least(100, v_final_score));

  -- Update the trail score record
  insert into public.trekpulse_trail_scores (trek_id, score, weather_status, community_activity, trail_risk, journey_activity_count, trail_confidence, last_updated, recent_incidents)
  values (
    p_trek_id,
    v_final_score,
    'good',
    case when v_recent_posts >= 5 then 'high' when v_recent_posts >= 2 then 'moderate' else 'low' end,
    case when v_recent_reports >= 3 then 'high' when v_recent_reports >= 1 then 'moderate' else 'low' end,
    v_active_journeys,
    case when v_final_score >= 80 then 'high' when v_final_score >= 50 then 'medium' else 'low' end,
    now(),
    v_recent_reports > 0
  )
  on conflict (trek_id) do update set
    score = excluded.score,
    weather_status = excluded.weather_status,
    community_activity = excluded.community_activity,
    trail_risk = excluded.trail_risk,
    journey_activity_count = excluded.journey_activity_count,
    trail_confidence = excluded.trail_confidence,
    last_updated = excluded.last_updated,
    recent_incidents = excluded.recent_incidents;
end;
$$ language plpgsql security definer;

-- ============================================================
-- PART 4: TREK STAMP CREATION
-- ============================================================

create or replace function public.create_trek_stamp(p_journey_id uuid)
returns void as $$
declare
  v_journey record;
  v_stamp_id uuid;
begin
  select tj.*, p.xp, p.total_distance_km
  into v_journey
  from public.trek_journeys tj
  left join public.profiles p on p.id = tj.user_id
  where tj.id = p_journey_id and tj.status = 'completed';

  if not found then
    raise exception 'Journey not found or not completed';
  end if;

  insert into public.passport_stamps (user_id, journey_id, trek_id, trek_name, completed_at, difficulty, distance_km, xp_earned, location)
  values (
    v_journey.user_id, p_journey_id, v_journey.trek_id, v_journey.trek_name,
    v_journey.completed_at, v_journey.experience_level, 
    (select nullif(v_journey.total_distance_km, 0)),
    (select xp from public.profiles where id = v_journey.user_id) - coalesce((select sum(xp_earned) from public.passport_stamps where user_id = v_journey.user_id), 0),
    v_journey.trek_location
  )
  on conflict (user_id, journey_id) do nothing;
end;
$$ language plpgsql security definer;

-- ============================================================
-- PART 5: ACHIEVEMENT CHECKER
-- ============================================================

create or replace function public.check_and_award_achievements(p_user_id uuid, p_journey_id uuid default null)
returns table (achievement_key text, achievement_name text) as $$
declare
  v_stats record;
  v_ach record;
begin
  select coalesce(ps.completed_treks, 0) as completed_treks,
         coalesce(ps.lifetime_distance_km, 0) as lifetime_distance_km,
         coalesce(ps.countries, 0) as countries,
         coalesce(ps.highest_altitude_m, 0) as highest_altitude_m
  into v_stats
  from public.passport_stats ps
  where ps.user_id = p_user_id;

  if not found then
    v_stats.completed_treks := 0;
    v_stats.lifetime_distance_km := 0;
    v_stats.countries := 0;
    v_stats.highest_altitude_m := 0;
  end if;

  for v_ach in
    select ad.id, ad.key, ad.name, ad.requirement_type, ad.requirement_value
    from public.achievements_definitions ad
    where not exists (
      select 1 from public.user_achievements ua
      where ua.user_id = p_user_id and ua.achievement_id = ad.id
    )
  loop
    if (v_ach.requirement_type = 'completed_treks' and v_stats.completed_treks >= v_ach.requirement_value)
      or (v_ach.requirement_type = 'total_distance_km' and v_stats.lifetime_distance_km >= v_ach.requirement_value)
      or (v_ach.requirement_type = 'countries' and v_stats.countries >= v_ach.requirement_value)
      or (v_ach.requirement_type = 'highest_elevation' and v_stats.highest_altitude_m >= v_ach.requirement_value)
    then
      insert into public.user_achievements (user_id, achievement_id, journey_id)
      values (p_user_id, v_ach.id, p_journey_id)
      on conflict (user_id, achievement_id) do nothing;

      if found then
        return query select v_ach.key, v_ach.name;
      end if;
    end if;
  end loop;
end;
$$ language plpgsql security definer;

-- ============================================================
-- PART 6: TREKPULSE ALERT MATCHING
-- ============================================================

create or replace function public.match_trekpulse_alerts(p_report_trek_id text, p_report_title text, p_report_message text)
returns void as $$
declare
  v_match record;
begin
  for v_match in
    select tj.id, tj.user_id, tj.trek_name
    from public.trek_journeys tj
    where tj.trek_id = p_report_trek_id
      and tj.status in ('planned', 'preparing', 'active')
      and tj.end_date >= current_date
  loop
    insert into public.notifications (user_id, type, title, body, reference_id, reference_type)
    values (
      v_match.user_id,
      'journey_safety',
      '⚠ TrekPulse Alert: ' || p_report_title,
      'A new community report matches your planned ' || v_match.trek_name || ' journey.' || E'\n' || p_report_message,
      v_match.id,
      'journey'
    )
    on conflict do nothing;
  end loop;
end;
$$ language plpgsql security definer;

-- ============================================================
-- PART 7: SYNC EXISTING DATA TO PASSPORT
-- ============================================================

-- Backfill passport_stats for existing users with completed journeys
insert into public.passport_stats (user_id, total_xp, completed_treks, lifetime_distance_km, updated_at)
select p.id, coalesce(p.xp, 0),
  (select count(*) from public.trek_journeys tj where tj.user_id = p.id and tj.status = 'completed'),
  coalesce(p.total_distance_km, 0),
  now()
from public.profiles p
where exists (select 1 from public.trek_journeys tj where tj.user_id = p.id and tj.status = 'completed')
on conflict (user_id) do nothing;
