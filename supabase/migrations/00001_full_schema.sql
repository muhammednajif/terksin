-- ============================================================
-- TRAILSYNC FULL COMMUNITY DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- 0. EXTENSIONS
create extension if not exists "pgcrypto";

-- 1. PROFILES (extends auth.users)
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

-- 2. POSTS
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

-- 3. POST MEDIA
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

-- 4. POST LIKES
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.post_likes enable row level security;

-- 5. POST COMMENTS
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

-- 6. COMMENT LIKES
create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references public.post_comments(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(comment_id, user_id)
);

alter table public.comment_likes enable row level security;

-- 7. POST SAVES (bookmarks)
create table if not exists public.post_saves (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.post_saves enable row level security;

-- 8. POST SHARES
create table if not exists public.post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade,
  share_type text not null check (share_type in ('link','web_share','internal_user','group','chat')),
  created_at timestamptz default now()
);

alter table public.post_shares enable row level security;

-- 9. STORIES
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  media_url text not null,
  media_type text not null check (media_type in ('image','video')),
  caption text,
  location text,
  latitude float8,
  longitude float8,
  expires_at timestamptz default (now() + interval '24 hours'),
  like_count integer default 0,
  created_at timestamptz default now()
);

alter table public.stories enable row level security;

-- 10. STORY VIEWS
create table if not exists public.story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(story_id, user_id)
);

alter table public.story_views enable row level security;

-- 11. STORY LIKES
create table if not exists public.story_likes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(story_id, user_id)
);

alter table public.story_likes enable row level security;

-- 12. FOLLOWS
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(follower_id, following_id),
  check (follower_id != following_id)
);

alter table public.follows enable row level security;

-- 13. TREK EVENTS (Group Treks)
create table if not exists public.trek_events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  location text not null,
  meeting_point text,
  latitude float8,
  longitude float8,
  event_date date not null,
  start_time time not null,
  difficulty text check (difficulty in ('Easy','Moderate','Hard','Extreme')),
  total_seats integer not null,
  available_seats integer not null,
  price decimal(10,2) default 0,
  description text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.trek_events enable row level security;

-- 14. EVENT MEMBERS
create table if not exists public.event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.trek_events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'confirmed' check (status in ('confirmed','cancelled','waiting')),
  joined_at timestamptz default now(),
  unique(event_id, user_id)
);

alter table public.event_members enable row level security;

-- 15. CHALLENGES
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  goal_type text not null check (goal_type in ('distance_km','treks','waterfalls','night_treks','elevation_m','days_active')),
  goal_value float8 not null,
  reward_xp integer default 100,
  badge_name text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  created_at timestamptz default now()
);

alter table public.challenges enable row level security;

-- 16. CHALLENGE MEMBERS
create table if not exists public.challenge_members (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.challenges(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  progress float8 default 0,
  completed boolean default false,
  reward_claimed boolean default false,
  joined_at timestamptz default now(),
  completed_at timestamptz,
  unique(challenge_id, user_id)
);

alter table public.challenge_members enable row level security;

-- 17. USER ACTIVITIES (for XP tracking)
create table if not exists public.user_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  activity_type text not null check (activity_type in ('post','like','comment','share','trek_complete','route_created','review','challenge')),
  xp_earned integer not null default 0,
  reference_id uuid,
  created_at timestamptz default now()
);

alter table public.user_activities enable row level security;

-- 18. NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('follow','post_like','comment','reply','mention','trek_invite','event_update','challenge_complete','badge_earned','safety_alert')),
  title text not null,
  body text,
  actor_id uuid references public.profiles(id) on delete set null,
  reference_id uuid,
  reference_type text,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

-- 19. SAFETY REPORTS
create table if not exists public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  report_type text not null check (report_type in ('landslide','trail_closure','heavy_rain','flooding','wildlife','forest_fire','unsafe_bridge','missing_person','other')),
  location text,
  latitude float8,
  longitude float8,
  description text,
  severity text check (severity in ('low','medium','high','critical')),
  photo_url text,
  is_anonymous boolean default false,
  created_at timestamptz default now()
);

alter table public.safety_reports enable row level security;

-- 20. HASHTAGS
create table if not exists public.hashtags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  post_count integer default 0,
  created_at timestamptz default now()
);

alter table public.hashtags enable row level security;

-- 21. POST HASHTAGS
create table if not exists public.post_hashtags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  hashtag_id uuid references public.hashtags(id) on delete cascade not null,
  unique(post_id, hashtag_id)
);

alter table public.post_hashtags enable row level security;

-- 22. USER MENTIONS
create table if not exists public.user_mentions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.post_comments(id) on delete cascade,
  mentioned_user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now()
);

alter table public.user_mentions enable row level security;

-- 23. COMMUNITY REPORTS (flag inappropriate content)
create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete cascade,
  report_type text not null check (report_type in ('spam','harassment','fake_info','dangerous','inappropriate','other')),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.post_comments(id) on delete cascade,
  description text,
  status text default 'pending' check (status in ('pending','reviewed','dismissed','actioned')),
  created_at timestamptz default now()
);

alter table public.community_reports enable row level security;

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_posts_author on public.posts(author_id);
create index idx_posts_created on public.posts(created_at desc);
create index idx_posts_type on public.posts(post_type);
create index idx_posts_visibility on public.posts(visibility);
create index idx_post_media_post on public.post_media(post_id);
create index idx_likes_post on public.post_likes(post_id);
create index idx_likes_user on public.post_likes(user_id);
create index idx_comments_post on public.post_comments(post_id);
create index idx_comments_parent on public.post_comments(parent_id);
create index idx_saves_user on public.post_saves(user_id);
create index idx_stories_user on public.stories(user_id);
create index idx_stories_expires on public.stories(expires_at);
create index idx_story_views_story on public.story_views(story_id);
create index idx_follows_follower on public.follows(follower_id);
create index idx_follows_following on public.follows(following_id);
create index idx_events_date on public.trek_events(event_date);
create index idx_events_organizer on public.trek_events(organizer_id);
create index idx_event_members_event on public.event_members(event_id);
create index idx_challenges_dates on public.challenges(start_date, end_date);
create index idx_notifications_user on public.notifications(user_id, is_read);
create index idx_activities_user on public.user_activities(user_id);
create index idx_reports_status on public.safety_reports(created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Profiles
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Posts
create policy "Public posts viewable by everyone"
  on public.posts for select
  using (visibility = 'public' or author_id = auth.uid());

create policy "Users can create posts"
  on public.posts for insert
  with check (auth.uid() = author_id);

create policy "Users can update own posts"
  on public.posts for update
  using (auth.uid() = author_id);

create policy "Users can delete own posts"
  on public.posts for delete
  using (auth.uid() = author_id);

-- Post Media
create policy "Media viewable by everyone"
  on public.post_media for select
  using (true);

create policy "Users can upload media for own posts"
  on public.post_media for insert
  with check (exists (select 1 from public.posts where id = post_id and author_id = auth.uid()));

-- Post Likes
create policy "Likes viewable by everyone"
  on public.post_likes for select
  using (true);

create policy "Users can like/unlike"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own likes"
  on public.post_likes for delete
  using (auth.uid() = user_id);

-- Comments
create policy "Comments viewable by everyone"
  on public.post_comments for select
  using (true);

create policy "Users can create comments"
  on public.post_comments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own comments"
  on public.post_comments for update
  using (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.post_comments for delete
  using (auth.uid() = user_id);

-- Comment Likes
create policy "Comment likes viewable by everyone"
  on public.comment_likes for select
  using (true);

create policy "Users can like/unlike comments"
  on public.comment_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own comment likes"
  on public.comment_likes for delete
  using (auth.uid() = user_id);

-- Saves
create policy "Users can see their own saves"
  on public.post_saves for select
  using (auth.uid() = user_id);

create policy "Users can save posts"
  on public.post_saves for insert
  with check (auth.uid() = user_id);

create policy "Users can unsave"
  on public.post_saves for delete
  using (auth.uid() = user_id);

-- Shares
create policy "Share counts viewable by everyone"
  on public.post_shares for select
  using (true);

create policy "Users can record shares"
  on public.post_shares for insert
  with check (auth.uid() = user_id);

-- Stories
create policy "Stories viewable by everyone"
  on public.stories for select
  using (expires_at > now());

create policy "Users can create stories"
  on public.stories for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own stories"
  on public.stories for delete
  using (auth.uid() = user_id);

-- Story Views
create policy "Story views insertable"
  on public.story_views for insert
  with check (auth.uid() = user_id);

create policy "Story views viewable by owner"
  on public.story_views for select
  using (exists (select 1 from public.stories where id = story_id and user_id = auth.uid()));

-- Story Likes
create policy "Story likes viewable by everyone"
  on public.story_likes for select
  using (true);

create policy "Users can like stories"
  on public.story_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own story likes"
  on public.story_likes for delete
  using (auth.uid() = user_id);

-- Follows
create policy "Follows viewable by everyone"
  on public.follows for select
  using (true);

create policy "Users can follow others"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- Trek Events
create policy "Events viewable by everyone"
  on public.trek_events for select
  using (true);

create policy "Users can create events"
  on public.trek_events for insert
  with check (auth.uid() = organizer_id);

create policy "Organizers can update events"
  on public.trek_events for update
  using (auth.uid() = organizer_id);

create policy "Organizers can delete events"
  on public.trek_events for delete
  using (auth.uid() = organizer_id);

-- Event Members
create policy "Members viewable by everyone"
  on public.event_members for select
  using (true);

create policy "Users can join events"
  on public.event_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave events"
  on public.event_members for delete
  using (auth.uid() = user_id);

-- Challenges
create policy "Challenges viewable by everyone"
  on public.challenges for select
  using (true);

-- Challenge Members
create policy "Challenge members viewable by everyone"
  on public.challenge_members for select
  using (true);

create policy "Users can join challenges"
  on public.challenge_members for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.challenge_members for update
  using (auth.uid() = user_id);

-- Activities
create policy "Users can view own activities"
  on public.user_activities for select
  using (auth.uid() = user_id);

-- Notifications
create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Users can delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- Safety Reports
create policy "Safety reports viewable by everyone"
  on public.safety_reports for select
  using (true);

create policy "Users can create safety reports"
  on public.safety_reports for insert
  with check (true);

-- Community Reports
create policy "Users can create reports"
  on public.community_reports for insert
  with check (auth.uid() = reporter_id);

create policy "Admins can view reports"
  on public.community_reports for select
  using (exists (select 1 from public.profiles where id = auth.uid() and verification_badge = true));

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
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
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Increment post like_count
create or replace function public.increment_post_likes()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.posts set like_count = like_count + 1 where id = new.post_id;
  return new;
end;
$$;

create or replace function public.decrement_post_likes()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists on_post_like_added on public.post_likes;
create trigger on_post_like_added
  after insert on public.post_likes
  for each row
  execute function increment_post_likes();

drop trigger if exists on_post_like_removed on public.post_likes;
create trigger on_post_like_removed
  after delete on public.post_likes
  for each row
  execute function decrement_post_likes();

-- Update post comment count
create or replace function increment_post_comments()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  if new.parent_id is not null then
    update public.post_comments set reply_count = reply_count + 1 where id = new.parent_id;
  end if;
  return new;
end;
$$;

create or replace function decrement_post_comments()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  if old.parent_id is not null then
    update public.post_comments set reply_count = greatest(reply_count - 1, 0) where id = old.parent_id;
  end if;
  return old;
end;
$$;

drop trigger if exists on_post_comment_added on public.post_comments;
create trigger on_post_comment_added
  after insert on public.post_comments
  for each row
  execute function increment_post_comments();

drop trigger if exists on_post_comment_removed on public.post_comments;
create trigger on_post_comment_removed
  after delete on public.post_comments
  for each row
  execute function decrement_post_comments();

-- Update event seats
create or replace function decrement_event_seats()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.trek_events set available_seats = greatest(available_seats - 1, 0) where id = new.event_id;
  return new;
end;
$$;

create or replace function increment_event_seats()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.trek_events set available_seats = available_seats + 1 where id = old.event_id;
  return old;
end;
$$;

drop trigger if exists on_event_member_joined on public.event_members;
create trigger on_event_member_joined
  after insert on public.event_members
  for each row
  execute function decrement_event_seats();

drop trigger if exists on_event_member_left on public.event_members;
create trigger on_event_member_left
  after delete on public.event_members
  for each row
  execute function increment_event_seats();

-- ============================================================
-- SEED DATA
-- ============================================================
insert into public.challenges (title, description, goal_type, goal_value, reward_xp, badge_name, start_date, end_date)
values
  ('Walk 20km This Week', 'Complete 20km of trekking this week', 'distance_km', 20, 200, 'Explorer Badge', now(), now() + interval '7 days'),
  ('Visit 3 Waterfalls', 'Visit and check in at 3 different waterfall locations', 'waterfalls', 3, 300, 'Waterfall Hunter', now(), now() + interval '30 days'),
  ('Complete a Night Trek', 'Complete one night trek adventure', 'night_treks', 1, 500, 'Night Trekker Badge', now(), now() + interval '60 days')
on conflict do nothing;