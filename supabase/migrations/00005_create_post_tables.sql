-- ============================================================
-- MIGRATION: Create all tables needed for Create Post flow
-- Idempotent: safe to run multiple times.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- 0. PROFILES (if not already present)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  bio text,
  avatar_url text,
  cover_url text,
  location text,
  latitude float8,
  longitude float8,
  trekker_level integer default 1,
  verification_badge boolean default false,
  followers_count integer default 0,
  following_count integer default 0,
  completed_treks integer default 0,
  total_distance_km float8 default 0,
  highest_elevation_m float8 default 0,
  reputation_score integer default 0,
  xp integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- 1. POSTS
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete cascade not null,
  post_type text not null check (post_type in ('Trek Experience','Photo Post','Trek Story','Route Review','Safety Update','Question','Achievement','Group Trek Announcement')),
  caption text,
  trek_location text,
  latitude float8,
  longitude float8,
  rating integer check (rating between 1 and 5),
  distance_km float8,
  duration_hours float8,
  weather_temp_c float8,
  weather_condition text,
  difficulty text check (difficulty in ('Easy','Moderate','Hard','Extreme')),
  route_id uuid,
  hashtags text[] default '{}',
  visibility text default 'public' check (visibility in ('public','followers','group','private')),
  is_edited boolean default false,
  like_count integer default 0,
  comment_count integer default 0,
  share_count integer default 0,
  save_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.posts enable row level security;

-- 2. POST MEDIA
create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  media_url text not null,
  media_type text not null check (media_type in ('image','video')),
  width integer,
  height integer,
  file_size integer,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table public.post_media enable row level security;

-- 3. POST LIKES
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.post_likes enable row level security;

-- 4. POST COMMENTS
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  parent_id uuid references public.post_comments(id) on delete cascade,
  content text not null,
  like_count integer default 0,
  reply_count integer default 0,
  is_edited boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.post_comments enable row level security;

-- 5. POST SAVES
create table if not exists public.post_saves (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.post_saves enable row level security;

-- 6. POST SHARES
create table if not exists public.post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade,
  share_type text not null check (share_type in ('link','web_share','internal_user','group','chat')),
  created_at timestamptz default now()
);

alter table public.post_shares enable row level security;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Profiles
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Posts
drop policy if exists "Public posts viewable by everyone" on public.posts;
create policy "Public posts viewable by everyone"
  on public.posts for select using (visibility = 'public' or author_id = auth.uid());

drop policy if exists "Users can create posts" on public.posts;
create policy "Users can create posts"
  on public.posts for insert with check (auth.uid() = author_id);

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
  on public.posts for update using (auth.uid() = author_id);

drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
  on public.posts for delete using (auth.uid() = author_id);

-- Post Media
drop policy if exists "Media viewable by everyone" on public.post_media;
create policy "Media viewable by everyone"
  on public.post_media for select using (true);

drop policy if exists "Users can upload media for own posts" on public.post_media;
create policy "Users can upload media for own posts"
  on public.post_media for insert
  with check (exists (select 1 from public.posts where id = post_id and author_id = auth.uid()));

-- Post Likes
drop policy if exists "Likes viewable by everyone" on public.post_likes;
create policy "Likes viewable by everyone"
  on public.post_likes for select using (true);

drop policy if exists "Users can like/unlike" on public.post_likes;
create policy "Users can like/unlike"
  on public.post_likes for insert with check (auth.uid() = user_id);

drop policy if exists "Users can remove own likes" on public.post_likes;
create policy "Users can remove own likes"
  on public.post_likes for delete using (auth.uid() = user_id);

-- Comments
drop policy if exists "Comments viewable by everyone" on public.post_comments;
create policy "Comments viewable by everyone"
  on public.post_comments for select using (true);

drop policy if exists "Users can create comments" on public.post_comments;
create policy "Users can create comments"
  on public.post_comments for insert with check (auth.uid() = user_id);

-- Saves
drop policy if exists "Users can see their own saves" on public.post_saves;
create policy "Users can see their own saves"
  on public.post_saves for select using (auth.uid() = user_id);

drop policy if exists "Users can save posts" on public.post_saves;
create policy "Users can save posts"
  on public.post_saves for insert with check (auth.uid() = user_id);

drop policy if exists "Users can unsave" on public.post_saves;
create policy "Users can unsave"
  on public.post_saves for delete using (auth.uid() = user_id);

-- Shares
drop policy if exists "Share counts viewable by everyone" on public.post_shares;
create policy "Share counts viewable by everyone"
  on public.post_shares for select using (true);

drop policy if exists "Users can record shares" on public.post_shares;
create policy "Users can record shares"
  on public.post_shares for insert with check (auth.uid() = user_id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_posts_author on public.posts(author_id);
create index if not exists idx_posts_created on public.posts(created_at desc);
create index if not exists idx_posts_type on public.posts(post_type);
create index if not exists idx_posts_visibility on public.posts(visibility);
create index if not exists idx_post_media_post on public.post_media(post_id);
create index if not exists idx_likes_post on public.post_likes(post_id);
create index if not exists idx_likes_user on public.post_likes(user_id);
create index if not exists idx_comments_post on public.post_comments(post_id);
create index if not exists idx_saves_user on public.post_saves(user_id);

-- ============================================================
-- LIKES COUNTER TRIGGERS
-- ============================================================
create or replace function public.increment_post_likes()
returns trigger language plpgsql security definer as $$
begin
  update public.posts set like_count = like_count + 1 where id = new.post_id;
  return new;
end;
$$;

create or replace function public.decrement_post_likes()
returns trigger language plpgsql security definer as $$
begin
  update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists on_post_like_added on public.post_likes;
create trigger on_post_like_added
  after insert on public.post_likes
  for each row execute function increment_post_likes();

drop trigger if exists on_post_like_removed on public.post_likes;
create trigger on_post_like_removed
  after delete on public.post_likes
  for each row execute function decrement_post_likes();

-- Comment counter
create or replace function increment_post_comments()
returns trigger language plpgsql security definer as $$
begin
  update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  return new;
end;
$$;

create or replace function decrement_post_comments()
returns trigger language plpgsql security definer as $$
begin
  update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists on_post_comment_added on public.post_comments;
create trigger on_post_comment_added
  after insert on public.post_comments
  for each row execute function increment_post_comments();

drop trigger if exists on_post_comment_removed on public.post_comments;
create trigger on_post_comment_removed
  after delete on public.post_comments
  for each row execute function decrement_post_comments();
