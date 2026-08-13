-- ============================================================
-- Follow system: count triggers & notification INSERT policy
-- ============================================================

-- 1. Trigger functions for follower/following counts

create or replace function public.increment_followers_count()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.profiles
  set followers_count = followers_count + 1
  where id = new.following_id;
  update public.profiles
  set following_count = following_count + 1
  where id = new.follower_id;
  return new;
end;
$$;

create or replace function public.decrement_followers_count()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.profiles
  set followers_count = greatest(followers_count - 1, 0)
  where id = old.following_id;
  update public.profiles
  set following_count = greatest(following_count - 1, 0)
  where id = old.follower_id;
  return old;
end;
$$;

-- 2. Triggers on follows table

drop trigger if exists on_follow_insert on public.follows;
create trigger on_follow_insert
  after insert on public.follows
  for each row
  execute function public.increment_followers_count();

drop trigger if exists on_follow_delete on public.follows;
create trigger on_follow_delete
  after delete on public.follows
  for each row
  execute function public.decrement_followers_count();

-- 3. RLS: allow authenticated users to insert notifications
-- (needed so User A can create a notification for User B when following)

create policy "Authenticated users can insert notifications"
  on public.notifications
  for insert
  to authenticated
  with check (true);
