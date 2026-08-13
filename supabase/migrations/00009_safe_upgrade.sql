-- ============================================================
-- Safe upgrade for existing TrailSync database
-- Rerunnable: safe to run multiple times.
-- Does NOT recreate existing tables or drop data.
-- ============================================================

-- ============================================================
-- 1. PROFILES: add admin role column
-- ============================================================
alter table public.profiles add column if not exists role text;
-- Ensure check constraint exists (column might exist from earlier partial run)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('user', 'moderator', 'admin'));
-- Set default for new rows only after column exists
alter table public.profiles alter column role set default 'user';
-- Backfill any existing null rows
update public.profiles set role = 'user' where role is null;

-- ============================================================
-- 2. SAFETY REPORTS: add status column for admin review
-- ============================================================
alter table public.safety_reports add column if not exists status text default 'pending';

-- ============================================================
-- 3. COMMUNITY REPORTS: widen status check to match admin UI
--    Original constraint: ('pending','reviewed','dismissed','actioned')
--    Admin UI sends:      ('pending','reviewed','resolved','dismissed')
-- ============================================================
alter table public.community_reports drop constraint if exists community_reports_status_check;
alter table public.community_reports add constraint community_reports_status_check
  check (status in ('pending','reviewed','dismissed','actioned','resolved'));

-- ============================================================
-- 4. EXPEDITION DEPARTURES (needed by Book Expedition feature)
-- ============================================================
create table if not exists public.expedition_departures (
  id uuid primary key default gen_random_uuid(),
  trek_id text not null,
  departure_date date not null,
  return_date date not null,
  total_seats integer not null check (total_seats > 0),
  available_seats integer not null check (available_seats >= 0),
  price numeric not null check (price >= 0),
  currency text default 'USD',
  status text not null default 'scheduled'
    check (status in ('scheduled', 'sold_out', 'cancelled', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint seats_not_exceed_total check (available_seats <= total_seats)
);

-- ============================================================
-- 5. EXPEDITION BOOKINGS (needed by Book Expedition feature)
-- ============================================================
create table if not exists public.expedition_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  trek_id text not null,
  trek_name text,
  trek_location text,
  departure_id uuid references public.expedition_departures(id) on delete restrict not null,
  departure_date date,
  return_date date,
  participant_count integer not null check (participant_count > 0),
  price_per_person numeric not null check (price_per_person >= 0),
  total_price numeric not null check (total_price >= 0),
  currency text default 'USD',
  status text not null default 'confirmed'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  booking_reference text unique not null,
  readiness_confirmed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 6. BOOKING PARTICIPANTS (needed by Book Expedition feature)
-- ============================================================
create table if not exists public.booking_participants (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.expedition_bookings(id) on delete cascade not null,
  full_name text not null,
  age integer,
  nationality text,
  emergency_contact text,
  experience_level text,
  created_at timestamptz default now()
);

-- ============================================================
-- 7. ADMIN AUDIT LOG
-- ============================================================
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

-- ============================================================
-- 8. ANNOUNCEMENTS
-- ============================================================
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

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on new tables
alter table public.expedition_departures enable row level security;
alter table public.expedition_bookings enable row level security;
alter table public.booking_participants enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.announcements enable row level security;

-- ============================================================
-- 9. PROFILES RLS: preserve existing "Users can update own profile",
--    add admin override alongside it (Postgres ORs multiple policies)
-- ============================================================
drop policy if exists "Admins can update any profile" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator'))
  );

-- ============================================================
-- 10. COMMUNITY REPORTS RLS: drop old verification_badge policy,
--     replace with role-based policy
-- ============================================================
drop policy if exists "Admins can view reports" on public.community_reports;
drop policy if exists "Admins and moderators can view reports" on public.community_reports;
drop policy if exists "Admins and moderators can update reports" on public.community_reports;

create policy "Admins and moderators can view reports"
  on public.community_reports for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator'))
  );

create policy "Admins and moderators can update reports"
  on public.community_reports for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator'))
  );

-- ============================================================
-- 11. EXPEDITION DEPARTURES RLS
-- ============================================================
drop policy if exists "Anyone can view scheduled departures" on public.expedition_departures;
drop policy if exists "Only authenticated users can insert departures" on public.expedition_departures;
drop policy if exists "Only authenticated users can update departures" on public.expedition_departures;
drop policy if exists "Admins can insert departures" on public.expedition_departures;
drop policy if exists "Admins can update departures" on public.expedition_departures;
drop policy if exists "Admins can delete departures" on public.expedition_departures;

create policy "Anyone can view scheduled departures"
  on public.expedition_departures for select
  using (true);

create policy "Admins can insert departures"
  on public.expedition_departures for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update departures"
  on public.expedition_departures for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete departures"
  on public.expedition_departures for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- 12. EXPEDITION BOOKINGS RLS
-- ============================================================
drop policy if exists "Users can view own bookings" on public.expedition_bookings;
drop policy if exists "Users can create own bookings" on public.expedition_bookings;
drop policy if exists "Users can update own bookings" on public.expedition_bookings;
drop policy if exists "Admins can view all bookings" on public.expedition_bookings;
drop policy if exists "Admins can update all bookings" on public.expedition_bookings;

create policy "Users can view own bookings"
  on public.expedition_bookings for select
  using (auth.uid() = user_id);

create policy "Admins can view all bookings"
  on public.expedition_bookings for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can create own bookings"
  on public.expedition_bookings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bookings"
  on public.expedition_bookings for update
  using (auth.uid() = user_id);

create policy "Admins can update all bookings"
  on public.expedition_bookings for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- 13. BOOKING PARTICIPANTS RLS
-- ============================================================
drop policy if exists "Users can view own booking participants" on public.booking_participants;
drop policy if exists "Users can add participants to own bookings" on public.booking_participants;

create policy "Users can view own booking participants"
  on public.booking_participants for select
  using (
    exists (
      select 1 from public.expedition_bookings
      where id = booking_id and user_id = auth.uid()
    )
  );

create policy "Users can add participants to own bookings"
  on public.booking_participants for insert
  with check (
    exists (
      select 1 from public.expedition_bookings
      where id = booking_id and user_id = auth.uid()
    )
  );

-- ============================================================
-- 14. ADMIN AUDIT LOG RLS
-- ============================================================
drop policy if exists "Admins can view audit log" on public.admin_audit_log;
drop policy if exists "Service can insert audit log" on public.admin_audit_log;

create policy "Admins can view audit log"
  on public.admin_audit_log for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Service can insert audit log"
  on public.admin_audit_log for insert
  with check (true);

-- ============================================================
-- 15. ANNOUNCEMENTS RLS
-- ============================================================
drop policy if exists "Anyone can view published announcements" on public.announcements;
drop policy if exists "Admins can manage announcements" on public.announcements;

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

-- ============================================================
-- 16. HELPER FUNCTIONS
-- ============================================================
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

-- ============================================================
-- 17. SEAT RESERVATION FUNCTIONS (needed by Book Expedition)
-- ============================================================
create or replace function public.reserve_expedition_seats(
  p_departure_id uuid,
  p_seats_needed integer
)
returns json
language plpgsql
security definer
as $$
declare
  v_available integer;
begin
  select available_seats into v_available
  from public.expedition_departures
  where id = p_departure_id
  for update;

  if not found then
    return json_build_object('success', false, 'error', 'Departure not found');
  end if;

  if v_available < p_seats_needed then
    return json_build_object('success', false, 'error', 'Not enough seats', 'available', v_available);
  end if;

  update public.expedition_departures
  set available_seats = available_seats - p_seats_needed,
      updated_at = now()
  where id = p_departure_id;

  return json_build_object('success', true);
end;
$$;

create or replace function public.restore_expedition_seats(
  p_departure_id uuid,
  p_seats integer
)
returns void
language plpgsql
security definer
as $$
begin
  update public.expedition_departures
  set available_seats = available_seats + p_seats,
      updated_at = now()
  where id = p_departure_id;
end;
$$;

-- ============================================================
-- 18. INDEXES for new tables
-- ============================================================
create index if not exists idx_expedition_departures_trek on public.expedition_departures(trek_id);
create index if not exists idx_expedition_departures_date on public.expedition_departures(departure_date);
create index if not exists idx_expedition_bookings_user on public.expedition_bookings(user_id);
create index if not exists idx_expedition_bookings_departure on public.expedition_bookings(departure_id);
create index if not exists idx_booking_participants_booking on public.booking_participants(booking_id);
create index if not exists idx_admin_audit_log_admin on public.admin_audit_log(admin_id);
create index if not exists idx_admin_audit_log_created on public.admin_audit_log(created_at desc);
create index if not exists idx_announcements_published on public.announcements(is_published, published_at);

-- ============================================================
-- 19. SEED DEPARTURES (only if table was just created)
-- ============================================================
insert into public.expedition_departures (trek_id, departure_date, return_date, total_seats, available_seats, price, currency, status)
select trek_id, departure_date, return_date, total_seats, available_seats, price, currency, status
from (values
  ('everest-base-camp'::text, '2026-08-15'::date, '2026-08-28'::date, 12, 8, 1200::numeric, 'USD'::text, 'scheduled'::text),
  ('everest-base-camp',       '2026-09-01',       '2026-09-14',       12, 4, 1200,        'USD',      'scheduled'),
  ('everest-base-camp',       '2026-09-20',       '2026-10-03',       12, 0, 1200,        'USD',      'sold_out'),
  ('everest-base-camp',       '2026-10-10',       '2026-10-23',       12, 10, 1300,       'USD',      'scheduled'),
  ('inca-trail',              '2026-08-20',       '2026-08-23',       10, 6, 750,         'USD',      'scheduled'),
  ('inca-trail',              '2026-09-10',       '2026-09-13',       10, 3, 750,         'USD',      'scheduled'),
  ('inca-trail',              '2026-10-05',       '2026-10-08',       10, 8, 800,         'USD',      'scheduled'),
  ('tour-du-mont-blanc',      '2026-07-20',       '2026-07-30',       8,  2, 1100,        'USD',      'scheduled'),
  ('tour-du-mont-blanc',      '2026-08-15',       '2026-08-25',       8,  5, 1100,        'USD',      'scheduled'),
  ('kilimanjaro-machame',     '2026-08-05',       '2026-08-11',       10, 6, 2200,        'USD',      'scheduled'),
  ('kilimanjaro-machame',     '2026-09-01',       '2026-09-07',       10, 4, 2200,        'USD',      'scheduled'),
  ('kilimanjaro-machame',     '2026-10-01',       '2026-10-07',       10, 7, 2300,        'USD',      'scheduled'),
  ('milford-track',           '2026-09-10',       '2026-09-13',       8,  5, 600,         'USD',      'scheduled'),
  ('milford-track',           '2026-10-15',       '2026-10-18',       8,  6, 600,         'USD',      'scheduled'),
  ('milford-track',           '2026-11-10',       '2026-11-13',       8,  8, 650,         'USD',      'scheduled')
) as v(trek_id, departure_date, return_date, total_seats, available_seats, price, currency, status)
where not exists (select 1 from public.expedition_departures);
