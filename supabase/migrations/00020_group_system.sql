-- ============================================================
-- MIGRATION 00020: Group Communication System
-- User Groups + Expedition Groups with full role management
-- Idempotent: safe to run multiple times
-- ============================================================

-- 0. EXTENSION
create extension if not exists "pgcrypto";

-- 1. GROUPS (unified: user groups + expedition groups)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  avatar_url text,
  banner_url text,
  group_type text not null default 'user' check (group_type in ('user','expedition','public','private')),
  visibility text not null default 'private' check (visibility in ('public','private','invite_only')),
  expedition_id uuid,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  max_members int default 100,
  is_locked boolean default false,
  is_archived boolean default false,
  expedition_status text check (expedition_status in ('planned','active','paused','completed','cancelled')),
  expedition_start timestamptz,
  expedition_end timestamptz,
  expedition_route jsonb,
  current_checkpoint text,
  current_weather jsonb,
  remaining_distance_km double precision,
  elevation_gain_m double precision,
  eta timestamptz,
  invite_code text unique default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. GROUP MEMBERS
create table if not exists public.group_members (
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner','leader','co_leader','guide','moderator','member','guest')),
  nickname text,
  joined_at timestamptz default now(),
  last_read_at timestamptz default now(),
  is_muted boolean default false,
  is_archived boolean default false,
  is_approved boolean default true,
  approved_by uuid references public.profiles(id) on delete set null,
  primary key (group_id, user_id)
);

-- 3. GROUP ROLES (custom role definitions)
create table if not exists public.group_roles (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  name text not null,
  color text default '#6366f1',
  priority int default 0,
  is_default boolean default false,
  created_at timestamptz default now(),
  unique(group_id, name)
);

-- 4. GROUP PERMISSIONS
create table if not exists public.group_permissions (
  role_id uuid references public.group_roles(id) on delete cascade not null,
  permission text not null,
  primary key (role_id, permission)
);

-- Default permissions
insert into public.group_roles (name, color, priority, is_default) values
  ('owner', '#f59e0b', 100, false),
  ('leader', '#10b981', 90, false),
  ('co_leader', '#3b82f6', 80, false),
  ('guide', '#8b5cf6', 70, false),
  ('moderator', '#06b6d4', 60, false),
  ('member', '#6b7280', 50, true),
  ('guest', '#9ca3af', 40, false)
on conflict (name) where name = 'member' do nothing;

-- 5. GROUP MESSAGES
create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete set null,
  content text,
  message_type text not null default 'text' check (message_type in (
    'text','image','video','audio','voice_note','document','location',
    'gpx','kml','route','waypoint','weather_card','expedition_card',
    'journey_card','checkpoint','poll','event','announcement',
    'sos_alert','emergency_broadcast','call_log','missed_call',
    'checklist','expense','shared_note','system'
  )),
  metadata jsonb default '{}'::jsonb,
  reply_to_id uuid references public.group_messages(id) on delete set null,
  thread_id uuid references public.group_messages(id) on delete set null,
  is_edited boolean default false,
  is_pinned boolean default false,
  is_deleted boolean default false,
  deleted_for uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. GROUP MESSAGE REACTIONS
create table if not exists public.group_message_reactions (
  message_id uuid references public.group_messages(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now(),
  primary key (message_id, user_id, emoji)
);

-- 7. GROUP READ RECEIPTS
create table if not exists public.group_read_receipts (
  message_id uuid references public.group_messages(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  read_at timestamptz default now(),
  primary key (message_id, user_id)
);

-- 8. GROUP ATTACHMENTS
create table if not exists public.group_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.group_messages(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_name text not null,
  file_size int not null,
  file_type text not null,
  file_url text not null,
  thumbnail_url text,
  width int,
  height int,
  duration int,
  storage_path text,
  created_at timestamptz default now()
);

-- 9. GROUP EVENTS
create table if not exists public.group_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  created_by uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  event_type text not null check (event_type in (
    'trek','meetup','training','social','expedition','camping','other'
  )),
  location text,
  latitude double precision,
  longitude double precision,
  start_time timestamptz not null,
  end_time timestamptz,
  all_day boolean default false,
  max_attendees int,
  created_at timestamptz default now()
);

create table if not exists public.group_event_attendees (
  event_id uuid references public.group_events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','maybe')),
  primary key (event_id, user_id)
);

-- 10. GROUP CHECKLISTS
create table if not exists public.group_checklists (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  created_by uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  checklist_type text not null default 'general' check (checklist_type in ('general','packing','pre_trip','safety','equipment','custom')),
  is_completed boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.group_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid references public.group_checklists(id) on delete cascade not null,
  content text not null,
  is_checked boolean default false,
  checked_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 11. GROUP EXPENSES
create table if not exists public.group_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  paid_by uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  amount decimal(10,2) not null,
  currency text default 'INR',
  category text check (category in (
    'transport','food','accommodation','equipment','guide','permits',
    'emergency','other'
  )),
  split_type text default 'equal' check (split_type in ('equal','custom','percentage')),
  notes text,
  receipt_url text,
  created_at timestamptz default now()
);

create table if not exists public.group_expense_splits (
  expense_id uuid references public.group_expenses(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount decimal(10,2) not null,
  is_paid boolean default false,
  primary key (expense_id, user_id)
);

-- 12. GROUP ANNOUNCEMENTS
create table if not exists public.group_announcements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  content text not null,
  priority text default 'normal' check (priority in ('normal','high','urgent','emergency')),
  is_pinned boolean default false,
  created_at timestamptz default now()
);

-- 13. GROUP SOS ALERTS
create table if not exists public.group_sos_alerts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  latitude double precision not null,
  longitude double precision not null,
  altitude double precision,
  battery_pct int,
  alert_type text not null default 'sos' check (alert_type in (
    'sos','medical','lost','weather_warning','wildlife','trail_closure',
    'landslide','flash_flood','battery_low','low_signal'
  )),
  message text,
  status text default 'active' check (status in ('active','acknowledged','resolved')),
  acknowledged_by uuid[] default '{}',
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- 14. GROUP LOCATION SHARES
create table if not exists public.group_location_shares (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  altitude double precision,
  speed double precision,
  heading double precision,
  battery_pct int,
  is_active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 15. GROUP SHARED ROUTES
create table if not exists public.group_shared_routes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  route_type text not null check (route_type in ('gpx','kml','treksin_route','planned')),
  file_url text,
  thumbnail_url text,
  distance_km double precision,
  elevation_gain_m double precision,
  waypoints jsonb default '[]',
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- 16. GROUP SHARED WAYPOINTS
create table if not exists public.group_shared_waypoints (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  latitude double precision not null,
  longitude double precision not null,
  elevation double precision,
  waypoint_type text not null check (waypoint_type in (
    'camp','water_source','danger','parking','peak','food',
    'emergency_point','viewpoint','summit','shelter','cave',
    'pass','lake','forest','bridge','river_crossing'
  )),
  title text,
  description text,
  created_at timestamptz default now()
);

-- 17. GROUP CALL ROOMS
create table if not exists public.group_call_rooms (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  started_by uuid references public.profiles(id) on delete cascade not null,
  call_type text not null check (call_type in ('voice','video','group_voice','group_video','broadcast')),
  status text default 'active' check (status in ('active','ended')),
  participants jsonb default '[]',
  duration_seconds int,
  created_at timestamptz default now(),
  ended_at timestamptz
);

-- 18. GROUP INVITE LINKS
create table if not exists public.group_invite_links (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  created_by uuid references public.profiles(id) on delete cascade not null,
  code text not null unique default encode(gen_random_bytes(4), 'hex'),
  qr_code_url text,
  expires_at timestamptz,
  max_uses int,
  use_count int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 19. GROUP TYPING EVENTS
create table if not exists public.group_typing_events (
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  is_typing boolean default false,
  updated_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_group_messages_group on public.group_messages(group_id, created_at desc);
create index if not exists idx_group_events_group on public.group_events(group_id, start_time);
create index if not exists idx_group_announcements_group on public.group_announcements(group_id, created_at desc);
create index if not exists idx_group_sos_alerts_group on public.group_sos_alerts(group_id, status);
create index if not exists idx_group_location_shares_group on public.group_location_shares(group_id, is_active);
create index if not exists idx_group_expenses_group on public.group_expenses(group_id);
create index if not exists idx_group_checklists_group on public.group_checklists(group_id);
create index if not exists idx_group_shared_routes_group on public.group_shared_routes(group_id);
create index if not exists idx_group_shared_waypoints_group on public.group_shared_waypoints(group_id);

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- Get group members with profiles
create or replace function public.get_group_members(group_id uuid)
returns json
language plpgsql security definer
as $$
declare
  result json;
begin
  select json_agg(
    json_build_object(
      'group_id', gm.group_id,
      'user_id', gm.user_id,
      'role', gm.role,
      'nickname', gm.nickname,
      'joined_at', gm.joined_at,
      'last_read_at', gm.last_read_at,
      'is_muted', gm.is_muted,
      'is_archived', gm.is_archived,
      'is_approved', gm.is_approved,
      'profile', (select to_jsonb(p.*) from profiles p where p.id = gm.user_id)
    )
  )
  into result
  from public.group_members gm
  where gm.group_id = get_group_members.group_id
  and gm.is_approved = true;
  return coalesce(result, '[]'::json);
end;
$$;

-- Join group via invite code
create or replace function public.join_group_by_code(invite_code text)
returns uuid
language plpgsql security definer
as $$
declare
  v_group_id uuid;
  v_link record;
begin
  select g.id, gil.max_uses, gil.use_count, gil.expires_at into v_group_id, v_link.max_uses, v_link.use_count, v_link.expires_at
  from public.group_invite_links gil
  join public.groups g on g.id = gil.group_id
  where gil.code = invite_code and gil.is_active = true
  limit 1;

  if v_group_id is null then
    raise exception 'Invalid or expired invite code';
  end if;

  if v_link.expires_at is not null and v_link.expires_at < now() then
    raise exception 'Invite link has expired';
  end if;

  if v_link.max_uses is not null and v_link.use_count >= v_link.max_uses then
    raise exception 'Invite link has reached maximum uses';
  end if;

  insert into public.group_members (group_id, user_id, role, is_approved)
  values (v_group_id, auth.uid(), 'member', true)
  on conflict (group_id, user_id) do nothing;

  update public.group_invite_links
  set use_count = use_count + 1
  where code = invite_code;

  return v_group_id;
end;
$$;

-- Get unread message count for a group
create or replace function public.get_group_unread_count(group_id uuid, user_id uuid)
returns int
language plpgsql security definer
as $$
declare
  v_count int;
  v_last_read timestamptz;
begin
  select last_read_at into v_last_read
  from public.group_members
  where group_id = get_group_unread_count.group_id
    and user_id = get_group_unread_count.user_id;

  if v_last_read is null then
    select count(*) into v_count
    from public.group_messages
    where group_id = get_group_unread_count.group_id
      and sender_id != user_id
      and is_deleted = false;
  else
    select count(*) into v_count
    from public.group_messages
    where group_id = get_group_unread_count.group_id
      and created_at > v_last_read
      and sender_id != user_id
      and is_deleted = false;
  end if;

  return v_count;
end;
$$;

-- Get all groups for a user with unread counts
create or replace function public.get_user_groups(p_user_id uuid)
returns json
language plpgsql security definer
as $$
declare
  result json;
begin
  select json_agg(sub) into result
  from (
    select
      g.*,
      (select get_group_unread_count(g.id, p_user_id)) as unread_count,
      (select row_to_json(m.*) from (
        select gm.*, row_to_json(p.*) as profile
        from public.group_members gm
        join public.profiles p on p.id = gm.user_id
        where gm.group_id = g.id and gm.is_approved = true
        order by gm.role = 'owner' desc, gm.joined_at
        limit 5
      ) m) as last_active_members
    from public.groups g
    join public.group_members gm on gm.group_id = g.id and gm.user_id = p_user_id
    order by g.updated_at desc
  ) sub;
  return coalesce(result, '[]'::json);
end;
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_roles enable row level security;
alter table public.group_permissions enable row level security;
alter table public.group_messages enable row level security;
alter table public.group_message_reactions enable row level security;
alter table public.group_read_receipts enable row level security;
alter table public.group_attachments enable row level security;
alter table public.group_events enable row level security;
alter table public.group_event_attendees enable row level security;
alter table public.group_checklists enable row level security;
alter table public.group_checklist_items enable row level security;
alter table public.group_expenses enable row level security;
alter table public.group_expense_splits enable row level security;
alter table public.group_announcements enable row level security;
alter table public.group_sos_alerts enable row level security;
alter table public.group_location_shares enable row level security;
alter table public.group_shared_routes enable row level security;
alter table public.group_shared_waypoints enable row level security;
alter table public.group_call_rooms enable row level security;
alter table public.group_invite_links enable row level security;
alter table public.group_typing_events enable row level security;

-- Helper: check if user is member
create or replace function public.is_group_member(group_id uuid, user_id uuid)
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from public.group_members
    where group_id = is_group_member.group_id
      and user_id = is_group_member.user_id
      and is_approved = true
  );
$$;

-- Helper: check if user has role
create or replace function public.has_group_role(group_id uuid, user_id uuid, required_roles text[])
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from public.group_members
    where group_id = has_group_role.group_id
      and user_id = has_group_role.user_id
      and role = any(required_roles)
      and is_approved = true
  );
$$;

-- GROUPS: members can view; anyone can create
drop policy if exists "Members can view groups" on public.groups;
create policy "Members can view groups"
  on public.groups for select
  using (
    visibility = 'public'
    or owner_id = auth.uid()
    or is_group_member(id, auth.uid())
  );

drop policy if exists "Users can create groups" on public.groups;
create policy "Users can create groups"
  on public.groups for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Owner can update group" on public.groups;
create policy "Owner can update group"
  on public.groups for update
  using (owner_id = auth.uid() or has_group_role(id, auth.uid(), array['leader','co_leader']))
  with check (owner_id = auth.uid() or has_group_role(id, auth.uid(), array['leader','co_leader']));

-- GROUP MEMBERS: members can view; owner can manage
drop policy if exists "Members can view group members" on public.group_members;
create policy "Members can view group members"
  on public.group_members for select
  using (is_group_member(group_id, auth.uid()) or user_id = auth.uid());

drop policy if exists "Users can join" on public.group_members;
create policy "Users can join"
  on public.group_members for insert
  with check (user_id = auth.uid());

drop policy if exists "Owner can manage members" on public.group_members;
create policy "Owner can manage members"
  on public.group_members for update
  using (is_group_member(group_id, auth.uid()) and has_group_role(group_id, auth.uid(), array['owner','leader','co_leader','moderator']));

-- GROUP MESSAGES: members can CRUD
drop policy if exists "Members can view messages" on public.group_messages;
create policy "Members can view messages"
  on public.group_messages for select
  using (is_group_member(group_id, auth.uid()));

drop policy if exists "Members can insert messages" on public.group_messages;
create policy "Members can insert messages"
  on public.group_messages for insert
  with check (is_group_member(group_id, auth.uid()) and sender_id = auth.uid());

drop policy if exists "Members can update own messages" on public.group_messages;
create policy "Members can update own messages"
  on public.group_messages for update
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

-- REACTIONS: members can manage
drop policy if exists "Members can manage reactions" on public.group_message_reactions;
create policy "Members can manage reactions"
  on public.group_message_reactions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- READ RECEIPTS: members can manage
drop policy if exists "Members can manage read receipts" on public.group_read_receipts;
create policy "Members can manage read receipts"
  on public.group_read_receipts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ATTACHMENTS: members can CRUD
drop policy if exists "Members can manage attachments" on public.group_attachments;
create policy "Members can manage attachments"
  on public.group_attachments for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- EVENTS: members can CRUD
drop policy if exists "Members can view events" on public.group_events;
create policy "Members can view events"
  on public.group_events for select
  using (is_group_member(group_id, auth.uid()));

drop policy if exists "Members can create events" on public.group_events;
create policy "Members can create events"
  on public.group_events for insert
  with check (is_group_member(group_id, auth.uid()) and created_by = auth.uid());

drop policy if exists "Members can update own events" on public.group_events;
create policy "Members can update own events"
  on public.group_events for update
  using (created_by = auth.uid());

-- CHECKLISTS: members can CRUD
drop policy if exists "Members can manage checklists" on public.group_checklists;
create policy "Members can manage checklists"
  on public.group_checklists for all
  using (is_group_member(group_id, auth.uid()))
  with check (created_by = auth.uid());

drop policy if exists "Members can manage checklist items" on public.group_checklist_items;
create policy "Members can manage checklist items"
  on public.group_checklist_items for all
  using (exists (select 1 from public.group_checklists c where c.id = checklist_id and is_group_member(c.group_id, auth.uid())));

-- EXPENSES: members can CRUD
drop policy if exists "Members can view expenses" on public.group_expenses;
create policy "Members can view expenses"
  on public.group_expenses for select
  using (is_group_member(group_id, auth.uid()));

drop policy if exists "Members can create expenses" on public.group_expenses;
create policy "Members can create expenses"
  on public.group_expenses for insert
  with check (is_group_member(group_id, auth.uid()) and paid_by = auth.uid());

-- ANNOUNCEMENTS: leaders+ can create, all members view
drop policy if exists "Members can view announcements" on public.group_announcements;
create policy "Members can view announcements"
  on public.group_announcements for select
  using (is_group_member(group_id, auth.uid()));

drop policy if exists "Leaders can create announcements" on public.group_announcements;
create policy "Leaders can create announcements"
  on public.group_announcements for insert
  with check (has_group_role(group_id, auth.uid(), array['owner','leader','co_leader','guide']));

-- SOS: all members can view, own create/update
drop policy if exists "Members can view SOS" on public.group_sos_alerts;
create policy "Members can view SOS"
  on public.group_sos_alerts for select
  using (is_group_member(group_id, auth.uid()));

drop policy if exists "Members can create SOS" on public.group_sos_alerts;
create policy "Members can create SOS"
  on public.group_sos_alerts for insert
  with check (user_id = auth.uid());

-- LOCATION SHARES: members can view, own create
drop policy if exists "Members can view locations" on public.group_location_shares;
create policy "Members can view locations"
  on public.group_location_shares for select
  using (is_group_member(group_id, auth.uid()));

drop policy if exists "Users can manage own location" on public.group_location_shares;
create policy "Users can manage own location"
  on public.group_location_shares for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- SHARED ROUTES: members can view, own create
drop policy if exists "Members can view routes" on public.group_shared_routes;
create policy "Members can view routes"
  on public.group_shared_routes for select
  using (is_group_member(group_id, auth.uid()));

drop policy if exists "Members can create routes" on public.group_shared_routes;
create policy "Members can create routes"
  on public.group_shared_routes for insert
  with check (user_id = auth.uid());

-- SHARED WAYPOINTS: members can view, own create
drop policy if exists "Members can view waypoints" on public.group_shared_waypoints;
create policy "Members can view waypoints"
  on public.group_shared_waypoints for select
  using (is_group_member(group_id, auth.uid()));

drop policy if exists "Members can create waypoints" on public.group_shared_waypoints;
create policy "Members can create waypoints"
  on public.group_shared_waypoints for insert
  with check (user_id = auth.uid());

-- CALL ROOMS: members can view, own create
drop policy if exists "Members can view calls" on public.group_call_rooms;
create policy "Members can view calls"
  on public.group_call_rooms for select
  using (is_group_member(group_id, auth.uid()));

drop policy if exists "Members can create calls" on public.group_call_rooms;
create policy "Members can create calls"
  on public.group_call_rooms for insert
  with check (started_by = auth.uid());

-- INVITE LINKS: members can view, leaders create
drop policy if exists "Members can view invites" on public.group_invite_links;
create policy "Members can view invites"
  on public.group_invite_links for select
  using (is_group_member(group_id, auth.uid()));

drop policy if exists "Leaders can manage invites" on public.group_invite_links;
create policy "Leaders can manage invites"
  on public.group_invite_links for all
  using (created_by = auth.uid() or has_group_role(group_id, auth.uid(), array['owner','leader','co_leader']))
  with check (created_by = auth.uid());

-- TYPING: members can manage own
drop policy if exists "Members can manage typing" on public.group_typing_events;
create policy "Members can manage typing"
  on public.group_typing_events for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================
alter publication supabase_realtime add table public.group_messages;
alter publication supabase_realtime add table public.group_message_reactions;
alter publication supabase_realtime add table public.group_typing_events;
alter publication supabase_realtime add table public.group_sos_alerts;
alter publication supabase_realtime add table public.group_location_shares;
alter publication supabase_realtime add table public.group_announcements;
alter publication supabase_realtime add table public.group_call_rooms;

-- ============================================================
-- TRIGGERS
-- ============================================================
create or replace function public.update_group_updated_at()
returns trigger as $$
begin
  update public.groups set updated_at = now() where id = NEW.group_id;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists on_group_message_insert on public.group_messages;
create trigger on_group_message_insert
  after insert on public.group_messages
  for each row execute function public.update_group_updated_at();

-- Auto-add owner as member
create or replace function public.auto_add_group_owner()
returns trigger as $$
begin
  insert into public.group_members (group_id, user_id, role, is_approved)
  values (NEW.id, NEW.owner_id, 'owner', true)
  on conflict do nothing;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists on_group_created_add_owner on public.groups;
create trigger on_group_created_add_owner
  after insert on public.groups
  for each row execute function public.auto_add_group_owner();
