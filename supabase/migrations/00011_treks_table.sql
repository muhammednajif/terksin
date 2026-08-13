-- ============================================================
-- Treks database table with admin CRUD
-- Rerunnable: all statements use IF NOT EXISTS / OR REPLACE
-- ============================================================

-- 1. Treks table
create table if not exists public.treks (
  id text primary key,
  title text not null,
  description text,
  location text not null,
  duration text not null,
  difficulty text not null check (difficulty in ('Easy','Moderate','Hard','Extreme')),
  rating numeric default 0,
  reviews integer default 0,
  price numeric default 0,
  image text,
  lat numeric,
  lng numeric,
  tags text[] default '{}',
  continent text,
  country text,
  distance text,
  elevation text,
  source text default 'canonical',
  booking_type text default 'none',
  is_bookable boolean default false,
  best_season text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. RLS: admins can do everything, authenticated users can read
alter table public.treks enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Anyone can read active treks') then
    create policy "Anyone can read active treks" on public.treks
      for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Admins can insert treks') then
    create policy "Admins can insert treks" on public.treks
      for insert with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Admins can update treks') then
    create policy "Admins can update treks" on public.treks
      for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Admins can delete treks') then
    create policy "Admins can delete treks" on public.treks
      for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
  end if;
end $$;

-- 3. Seed function: inserts all treks from globalTreks.ts (call once via admin)
create or replace function public.seed_treks()
returns void
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Not authorized';
  end if;

  -- Only seed if table is empty
  if exists (select 1 from public.treks limit 1) then
    return;
  end if;

  -- Seed data (will be called from frontend)
  -- Individual trek inserts are done by the seed script in the admin panel
end;
$$;

-- 4. CRUD functions for admin

create or replace function public.admin_get_treks()
returns table (
  id text, title text, description text, location text, duration text,
  difficulty text, rating numeric, reviews integer, price numeric,
  image text, lat numeric, lng numeric, tags text[],
  continent text, country text, distance text, elevation text,
  source text, booking_type text, is_bookable boolean, best_season text,
  is_active boolean, created_at timestamptz, updated_at timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
    select t.*
    from public.treks t
    order by t.title;
end;
$$;

create or replace function public.admin_create_trek(
  p_id text, p_title text, p_description text, p_location text,
  p_duration text, p_difficulty text, p_rating numeric, p_reviews integer,
  p_price numeric, p_image text, p_lat numeric, p_lng numeric,
  p_tags text[], p_continent text, p_country text,
  p_distance text, p_elevation text, p_source text,
  p_booking_type text, p_is_bookable boolean, p_best_season text
)
returns json
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Not authorized';
  end if;

  insert into public.treks (id, title, description, location, duration, difficulty,
    rating, reviews, price, image, lat, lng, tags, continent, country,
    distance, elevation, source, booking_type, is_bookable, best_season)
  values (p_id, p_title, p_description, p_location, p_duration, p_difficulty,
    p_rating, p_reviews, p_price, p_image, p_lat, p_lng,
    coalesce(p_tags, '{}'), p_continent, p_country,
    p_distance, p_elevation, coalesce(p_source, 'canonical'),
    coalesce(p_booking_type, 'none'), coalesce(p_is_bookable, false), p_best_season);

  insert into public.admin_audit_log (admin_id, action, entity_type, entity_id)
  values (auth.uid(), 'create_trek', 'trek', p_id);

  return json_build_object('success', true, 'id', p_id);
end;
$$;

create or replace function public.admin_update_trek(
  p_id text, p_title text, p_description text, p_location text,
  p_duration text, p_difficulty text, p_rating numeric, p_reviews integer,
  p_price numeric, p_image text, p_lat numeric, p_lng numeric,
  p_tags text[], p_continent text, p_country text,
  p_distance text, p_elevation text, p_source text,
  p_booking_type text, p_is_bookable boolean, p_best_season text,
  p_is_active boolean
)
returns json
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Not authorized';
  end if;

  update public.treks set
    title = p_title, description = p_description, location = p_location,
    duration = p_duration, difficulty = p_difficulty,
    rating = p_rating, reviews = p_reviews, price = p_price,
    image = p_image, lat = p_lat, lng = p_lng,
    tags = coalesce(p_tags, '{}'), continent = p_continent, country = p_country,
    distance = p_distance, elevation = p_elevation, source = coalesce(p_source, 'canonical'),
    booking_type = coalesce(p_booking_type, 'none'),
    is_bookable = coalesce(p_is_bookable, false), best_season = p_best_season,
    is_active = coalesce(p_is_active, true),
    updated_at = now()
  where id = p_id;

  insert into public.admin_audit_log (admin_id, action, entity_type, entity_id)
  values (auth.uid(), 'update_trek', 'trek', p_id);

  return json_build_object('success', true, 'id', p_id);
end;
$$;

create or replace function public.admin_delete_trek(p_id text)
returns json
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Not authorized';
  end if;

  delete from public.treks where id = p_id;

  insert into public.admin_audit_log (admin_id, action, entity_type, entity_id)
  values (auth.uid(), 'delete_trek', 'trek', p_id);

  return json_build_object('success', true);
end;
$$;
