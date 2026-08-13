-- ============================================================
-- Expedition Booking System
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. EXPEDITION DEPARTURES

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

alter table public.expedition_departures enable row level security;

create policy "Anyone can view scheduled departures"
  on public.expedition_departures for select
  using (true);

create policy "Only authenticated users can insert departures"
  on public.expedition_departures for insert
  to authenticated
  with check (auth.role() = 'authenticated');

create policy "Only authenticated users can update departures"
  on public.expedition_departures for update
  to authenticated
  using (auth.role() = 'authenticated');

-- 2. EXPEDITION BOOKINGS

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

alter table public.expedition_bookings enable row level security;

create policy "Users can view own bookings"
  on public.expedition_bookings for select
  using (auth.uid() = user_id);

create policy "Users can create own bookings"
  on public.expedition_bookings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bookings"
  on public.expedition_bookings for update
  using (auth.uid() = user_id);

-- 3. BOOKING PARTICIPANTS

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

alter table public.booking_participants enable row level security;

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

-- 4. ATOMIC SEAT RESERVATION FUNCTION

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
  v_result json;
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

-- 5b. SEAT RESTORE FUNCTION (for cancellations)

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

-- 5. SEED DEPARTURES FOR CANONICAL EXPEDITIONS

insert into public.expedition_departures (trek_id, departure_date, return_date, total_seats, available_seats, price, currency, status) values
  ('everest-base-camp', '2026-08-15', '2026-08-28', 12, 8, 1200, 'USD', 'scheduled'),
  ('everest-base-camp', '2026-09-01', '2026-09-14', 12, 4, 1200, 'USD', 'scheduled'),
  ('everest-base-camp', '2026-09-20', '2026-10-03', 12, 0, 1200, 'USD', 'sold_out'),
  ('everest-base-camp', '2026-10-10', '2026-10-23', 12, 10, 1300, 'USD', 'scheduled'),
  ('inca-trail', '2026-08-20', '2026-08-23', 10, 6, 750, 'USD', 'scheduled'),
  ('inca-trail', '2026-09-10', '2026-09-13', 10, 3, 750, 'USD', 'scheduled'),
  ('inca-trail', '2026-10-05', '2026-10-08', 10, 8, 800, 'USD', 'scheduled'),
  ('tour-du-mont-blanc', '2026-07-20', '2026-07-30', 8, 2, 1100, 'USD', 'scheduled'),
  ('tour-du-mont-blanc', '2026-08-15', '2026-08-25', 8, 5, 1100, 'USD', 'scheduled'),
  ('kilimanjaro-machame', '2026-08-05', '2026-08-11', 10, 6, 2200, 'USD', 'scheduled'),
  ('kilimanjaro-machame', '2026-09-01', '2026-09-07', 10, 4, 2200, 'USD', 'scheduled'),
  ('kilimanjaro-machame', '2026-10-01', '2026-10-07', 10, 7, 2300, 'USD', 'scheduled'),
  ('milford-track', '2026-09-10', '2026-09-13', 8, 5, 600, 'USD', 'scheduled'),
  ('milford-track', '2026-10-15', '2026-10-18', 8, 6, 600, 'USD', 'scheduled'),
  ('milford-track', '2026-11-10', '2026-11-13', 8, 8, 650, 'USD', 'scheduled')
on conflict do nothing;
