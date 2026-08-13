-- ============================================================
-- MIGRATION: Additional tables for real functionality
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. SAVED TREKS (for bookmarking treks from the Explore/TrekDetails pages)
create table if not exists public.saved_treks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  trek_id text not null,
  created_at timestamptz default now(),
  unique(user_id, trek_id)
);
alter table public.saved_treks enable row level security;

create policy "Users can view own saved treks"
  on public.saved_treks for select
  using (auth.uid() = user_id);

create policy "Users can save treks"
  on public.saved_treks for insert
  with check (auth.uid() = user_id);

create policy "Users can unsave treks"
  on public.saved_treks for delete
  using (auth.uid() = user_id);

-- 2. NEWSLETTER SUBSCRIPTIONS
create table if not exists public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);
alter table public.newsletter_subscriptions enable row level security;

create policy "Anyone can subscribe"
  on public.newsletter_subscriptions for insert
  with check (true);

-- 3. NOTIFICATION PREFERENCES (per user)
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  push_enabled boolean default true,
  email_enabled boolean default false,
  updated_at timestamptz default now()
);
alter table public.notification_preferences enable row level security;

create policy "Users can manage own notification prefs"
  on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. INDEX for notification queries
create index if not exists idx_notifications_user_unread
  on public.notifications(user_id, is_read)
  where is_read = false;
