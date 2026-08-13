-- ============================================================
-- MIGRATION: Auto-create profile on user signup
-- Run this in Supabase SQL Editor if not already applied.
-- Idempotent: safe to run multiple times.
-- ============================================================

-- Drop existing trigger first to allow re-creation
drop trigger if exists on_auth_user_created on auth.users;

-- Create or replace the function (idempotent)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      'user_' || substr(new.id::text, 1, 8)
    ),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.email
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      null
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Re-create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- RLS: Ensure profiles policies exist
-- ============================================================

-- Allow users to read any profile
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Allow users to insert their own profile (needed if trigger fails)
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Allow users to update only their own profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
