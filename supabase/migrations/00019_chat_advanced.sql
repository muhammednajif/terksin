-- ============================================================
-- MIGRATION 00019: Advanced Expedition Chat System
-- Adds all tables, columns, RPCs, RLS for Treksin Chat v2
-- Idempotent: safe to run multiple times
-- ============================================================

-- 0. ALTER EXISTING TABLES
alter table public.chat_messages
  add column if not exists is_deleted boolean default false,
  add column if not exists deleted_for uuid[] default '{}',
  add column if not exists is_draft boolean default false,
  add column if not exists is_starred boolean default false,
  add column if not exists is_bookmarked boolean default false,
  add column if not exists is_delivered boolean default false,
  add column if not exists delivered_at timestamptz,
  add column if not exists seen_at timestamptz,
  add column if not exists message_type text not null default 'text'
    check (message_type in (
      'text','image','video','location','gpx_route','map',
      'trail_card','expedition_invite','poll','voice_note',
      'document','achievement_card','badge_unlock','journey_share',
      'weather_alert','emergency_alert','system_automation',
      'gif','checkpoint','campsite','equipment_checklist',
      'elevation_graph','live_trek','live_location','sos_alert',
      'waypoint','expedition_album','weather_card','journey_card',
      'live_checkpoint','screen_recording','audio','zip','gpx','kml',
      'route_share','call_log','missed_call'
    ));

alter table public.chat_conversations
  add column if not exists is_archived boolean default false,
  add column if not exists is_pinned boolean default false,
  add column if not exists mute_until timestamptz,
  add column if not exists description text,
  add column if not exists cover_url text,
  add column if not exists invite_code text unique,
  add column if not exists max_members int default 50;

alter table public.chat_participants
  add column if not exists is_archived boolean default false,
  add column if not exists role text not null default 'member'
    check (role in ('leader','co_leader','moderator','member')),
  add column if not exists joined_at timestamptz default now(),
  add column if not exists nickname text,
  add column if not exists draft text,
  add column if not exists draft_updated_at timestamptz;

-- 1. NEW TABLES

-- Live Trek tracking
create table if not exists public.chat_live_treks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  conversation_id uuid references public.chat_conversations(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  elevation double precision,
  distance_km double precision,
  avg_speed_kmh double precision,
  battery_pct int,
  weather_temp_c double precision,
  weather_condition text,
  eta timestamptz,
  is_active boolean default true,
  started_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, conversation_id)
);

-- Live Location sharing
create table if not exists public.chat_live_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  conversation_id uuid references public.chat_conversations(id) on delete cascade not null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  altitude double precision,
  speed double precision,
  heading double precision,
  battery_pct int,
  expires_at timestamptz,
  duration text check (duration in ('15min','1hour','until_stopped')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SOS Alerts
create table if not exists public.chat_sos_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  conversation_id uuid references public.chat_conversations(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  altitude double precision,
  battery_pct int,
  nearest_trail text,
  emergency_message text,
  status text not null default 'active' check (status in ('active','acknowledged','resolved','false_alarm')),
  acknowledged_by uuid[] default '{}',
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- Waypoints
create table if not exists public.chat_waypoints (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.chat_conversations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message_id uuid references public.chat_messages(id) on delete set null,
  latitude double precision not null,
  longitude double precision not null,
  elevation double precision,
  waypoint_type text not null check (waypoint_type in (
    'camp','water_source','danger','parking','peak',
    'food','emergency_point','viewpoint','river_crossing',
    'bridge','shelter','cave','summit','pass','lake','forest'
  )),
  title text,
  description text,
  created_at timestamptz default now()
);

-- Expedition Albums
create table if not exists public.chat_expedition_albums (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.chat_conversations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message_id uuid references public.chat_messages(id) on delete set null,
  title text,
  description text,
  cover_url text,
  photo_count int default 0,
  journey_summary jsonb,
  created_at timestamptz default now()
);

create table if not exists public.chat_album_media (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references public.chat_expedition_albums(id) on delete cascade not null,
  media_url text not null,
  thumbnail_url text,
  media_type text not null check (media_type in ('image','video')),
  width int,
  height int,
  file_size int,
  latitude double precision,
  longitude double precision,
  caption text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Checkpoints
create table if not exists public.chat_checkpoints (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.chat_conversations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message_id uuid references public.chat_messages(id) on delete set null,
  name text not null,
  latitude double precision,
  longitude double precision,
  elevation double precision,
  checkpoint_type text not null check (checkpoint_type in (
    'reached','next','rest_stop','camp_setup','departure','waypoint'
  )),
  eta timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- Polls
create table if not exists public.chat_polls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.chat_conversations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message_id uuid references public.chat_messages(id) on delete set null,
  question text not null,
  options jsonb not null,
  is_multiple_choice boolean default false,
  is_anonymous boolean default false,
  expires_at timestamptz,
  is_closed boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.chat_poll_votes (
  poll_id uuid references public.chat_polls(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  option_index int not null,
  created_at timestamptz default now(),
  primary key (poll_id, user_id)
);

-- Call Logs
create table if not exists public.chat_call_logs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.chat_conversations(id) on delete cascade not null,
  caller_id uuid references public.profiles(id) on delete cascade not null,
  callee_ids uuid[] not null,
  call_type text not null check (call_type in ('voice','video','group_voice','group_video')),
  status text not null check (status in ('ringing','connected','missed','ended','rejected')),
  duration_seconds int,
  started_at timestamptz default now(),
  ended_at timestamptz
);

-- Invite Links
create table if not exists public.chat_invite_links (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.chat_conversations(id) on delete cascade not null,
  created_by uuid references public.profiles(id) on delete cascade not null,
  code text not null unique default encode(gen_random_bytes(6), 'hex'),
  expires_at timestamptz,
  max_uses int,
  use_count int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Mentions
create table if not exists public.chat_mentions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.chat_messages(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Trail Reports (utilities)
create table if not exists public.chat_trail_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  conversation_id uuid references public.chat_conversations(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  report_type text not null check (report_type in (
    'trail_condition','wildlife_sighting','danger_alert','rockfall',
    'flood_warning','trail_closure','lost_equipment','medical_assistance',
    'nearby_rescue','camp_availability','water_source_update'
  )),
  severity text check (severity in ('low','medium','high','critical')),
  description text,
  photo_url text,
  created_at timestamptz default now()
);

-- Bookmarks
create table if not exists public.chat_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  message_id uuid references public.chat_messages(id) on delete cascade not null,
  label text,
  created_at timestamptz default now(),
  unique(user_id, message_id)
);

-- Draft messages (per user per conversation)
create table if not exists public.chat_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  conversation_id uuid references public.chat_conversations(id) on delete cascade not null,
  content text,
  reply_to_id uuid references public.chat_messages(id) on delete set null,
  updated_at timestamptz default now(),
  unique(user_id, conversation_id)
);

-- Offline message queue
create table if not exists public.chat_offline_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  conversation_id uuid references public.chat_conversations(id) on delete cascade not null,
  payload jsonb not null,
  status text default 'pending' check (status in ('pending','sent','failed')),
  retry_count int default 0,
  created_at timestamptz default now()
);

-- 2. INDEXES
create index if not exists idx_chat_live_treks_active on public.chat_live_treks(is_active);
create index if not exists idx_chat_live_locations_active on public.chat_live_locations(is_active);
create index if not exists idx_chat_sos_alerts_status on public.chat_sos_alerts(status);
create index if not exists idx_chat_waypoints_conv on public.chat_waypoints(conversation_id);
create index if not exists idx_chat_album_media_album on public.chat_album_media(album_id);
create index if not exists idx_chat_checkpoints_conv on public.chat_checkpoints(conversation_id);
create index if not exists idx_chat_polls_conv on public.chat_polls(conversation_id);
create index if not exists idx_chat_call_logs_conv on public.chat_call_logs(conversation_id, started_at desc);
create index if not exists idx_chat_mentions_user on public.chat_mentions(user_id, is_read);
create index if not exists idx_chat_trail_reports_conv on public.chat_trail_reports(conversation_id);
create index if not exists idx_chat_bookmarks_user on public.chat_bookmarks(user_id);
create index if not exists idx_chat_drafts_user on public.chat_drafts(user_id);
create index if not exists idx_chat_offline_queue_user on public.chat_offline_queue(user_id, status);

-- 3. RPC FUNCTIONS

-- Get message read receipts
create or replace function public.get_message_read_receipts(p_message_ids uuid[])
returns table (message_id uuid, user_id uuid, read_at timestamptz)
language sql security definer as $$
  select message_id, user_id, read_at
  from public.chat_read_receipts
  where message_id = any(p_message_ids);
$$;

-- Create direct conversation (idempotent)
create or replace function public.create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql security definer
as $fn$
declare
  v_conv_id uuid;
begin
  select cp1.conversation_id into v_conv_id
  from public.chat_participants cp1
  join public.chat_participants cp2 on cp2.conversation_id = cp1.conversation_id
  where cp1.user_id = auth.uid()
    and cp2.user_id = other_user_id
    and not exists (
      select 1 from public.chat_participants cp3
      where cp3.conversation_id = cp1.conversation_id
        and cp3.user_id not in (auth.uid(), other_user_id)
    );
  if v_conv_id is null then
    insert into public.chat_conversations (created_by)
    values (auth.uid())
    returning id into v_conv_id;
    insert into public.chat_participants (conversation_id, user_id, role)
    values (v_conv_id, auth.uid(), 'leader'),
           (v_conv_id, other_user_id, 'member');
  end if;
  return v_conv_id;
end;
$fn$;

-- Get conversation participants (bypasses RLS)
create or replace function public.get_conversation_participants(conv_id uuid)
returns json
language plpgsql security definer
as $pfn$
declare
  result json;
begin
  select json_agg(
    json_build_object(
      'conversation_id', cp.conversation_id,
      'user_id', cp.user_id,
      'role', cp.role,
      'is_admin', cp.is_admin,
      'is_muted', cp.is_muted,
      'is_archived', cp.is_archived,
      'joined_at', cp.joined_at,
      'last_read_at', cp.last_read_at,
      'nickname', cp.nickname,
      'draft', cp.draft,
      'profile', (select to_jsonb(p.*) from profiles p where p.id = cp.user_id)
    )
  )
  into result
  from public.chat_participants cp
  where cp.conversation_id = conv_id;
  return coalesce(result, '[]'::json);
end;
$pfn$;

-- Search messages across conversations
create or replace function public.search_all_messages(user_id uuid, search_query text)
returns table (message_id uuid, conversation_id uuid, content text, created_at timestamptz, sender_name text)
language plpgsql security definer
as $$
begin
  return query
  select m.id, m.conversation_id, m.content, m.created_at,
    coalesce(p.display_name, p.username, 'Unknown') as sender_name
  from public.chat_messages m
  join public.chat_participants cp on cp.conversation_id = m.conversation_id and cp.user_id = user_id
  left join public.profiles p on p.id = m.sender_id
  where m.content ilike '%' || search_query || '%'
    and m.is_deleted = false
    and not (m.deleted_for @> array[user_id])
  order by m.created_at desc
  limit 50;
end;
$$;

-- Get shared media for a conversation
create or replace function public.get_conversation_media(conv_id uuid, media_type text default null)
returns table (id uuid, message_id uuid, file_url text, thumbnail_url text, file_type text, created_at timestamptz)
language sql security definer
as $$
  select a.id, a.message_id, a.file_url, a.thumbnail_url, a.file_type, a.created_at
  from public.chat_attachments a
  join public.chat_messages m on m.id = a.message_id
  where m.conversation_id = conv_id
    and (media_type is null or a.file_type like media_type || '%')
  order by a.created_at desc
  limit 100;
$$;

-- Get shared routes for a conversation
create or replace function public.get_conversation_routes(conv_id uuid)
returns table (id uuid, message_id uuid, content text, metadata jsonb, created_at timestamptz)
language sql security definer
as $$
  select m.id, m.id, m.content, m.metadata, m.created_at
  from public.chat_messages m
  where m.conversation_id = conv_id
    and m.message_type in ('gpx_route', 'route_share', 'kml', 'gpx', 'map')
    and m.is_deleted = false
  order by m.created_at desc
  limit 50;
$$;

-- Get conversation unread count
create or replace function public.get_unread_count(user_id uuid)
returns int
language plpgsql security definer
as $$
declare
  total int := 0;
begin
  select coalesce(sum(sub.c), 0) into total
  from (
    select count(*) as c
    from public.chat_participants cp
    join public.chat_messages m on m.conversation_id = cp.conversation_id
    where cp.user_id = user_id
      and (cp.last_read_at is null or m.created_at > cp.last_read_at)
      and m.sender_id != user_id
      and m.is_deleted = false
      and not (m.deleted_for @> array[user_id])
    group by cp.conversation_id
  ) sub;
  return total;
end;
$$;

-- Mark messages as delivered
create or replace function public.mark_messages_delivered(p_message_ids uuid[], p_user_id uuid)
returns void
language sql security definer
as $$
  update public.chat_messages
  set is_delivered = true, delivered_at = now()
  where id = any(p_message_ids)
    and sender_id != p_user_id
    and is_delivered = false;
$$;

-- Get nearby SOS alerts
create or replace function public.get_nearby_sos_alerts(lat double precision, lng double precision, radius_km double precision default 50)
returns table (id uuid, user_id uuid, latitude double precision, longitude double precision, emergency_message text, created_at timestamptz)
language sql security definer
as $$
  select id, user_id, latitude, longitude, emergency_message, created_at
  from public.chat_sos_alerts
  where status = 'active'
    and earth_distance(ll_to_earth(lat, lng), ll_to_earth(latitude, longitude)) < radius_km * 1000
  order by created_at desc;
$$;

-- 4. RLS POLICIES

-- Enable RLS on new tables
alter table public.chat_live_treks enable row level security;
alter table public.chat_live_locations enable row level security;
alter table public.chat_sos_alerts enable row level security;
alter table public.chat_waypoints enable row level security;
alter table public.chat_expedition_albums enable row level security;
alter table public.chat_album_media enable row level security;
alter table public.chat_checkpoints enable row level security;
alter table public.chat_polls enable row level security;
alter table public.chat_poll_votes enable row level security;
alter table public.chat_call_logs enable row level security;
alter table public.chat_invite_links enable row level security;
alter table public.chat_mentions enable row level security;
alter table public.chat_trail_reports enable row level security;
alter table public.chat_bookmarks enable row level security;
alter table public.chat_drafts enable row level security;
alter table public.chat_offline_queue enable row level security;

-- Participant-based RLS helper
create or replace function public.is_conversation_participant(conv_id uuid)
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from public.chat_participants
    where conversation_id = conv_id and user_id = auth.uid()
  );
$$;

-- Live Treks: participants can CRUD
drop policy if exists "Participants can manage live treks" on public.chat_live_treks;
create policy "Participants can manage live treks"
  on public.chat_live_treks for all
  using (user_id = auth.uid() or is_conversation_participant(conversation_id))
  with check (user_id = auth.uid());

-- Live Locations: participants can CRUD
drop policy if exists "Participants can manage live locations" on public.chat_live_locations;
create policy "Participants can manage live locations"
  on public.chat_live_locations for all
  using (user_id = auth.uid() or is_conversation_participant(conversation_id))
  with check (user_id = auth.uid());

-- SOS: all authenticated can view active, users can create own
drop policy if exists "Users can create SOS" on public.chat_sos_alerts;
create policy "Users can create SOS"
  on public.chat_sos_alerts for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can view SOS" on public.chat_sos_alerts;
create policy "Users can view SOS"
  on public.chat_sos_alerts for select
  using (true);

drop policy if exists "Users can update own SOS" on public.chat_sos_alerts;
create policy "Users can update own SOS"
  on public.chat_sos_alerts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Waypoints: participants can CRUD
drop policy if exists "Participants can manage waypoints" on public.chat_waypoints;
create policy "Participants can manage waypoints"
  on public.chat_waypoints for all
  using (user_id = auth.uid() or is_conversation_participant(conversation_id))
  with check (user_id = auth.uid());

-- Expedition Albums: participants can manage
drop policy if exists "Participants can manage albums" on public.chat_expedition_albums;
create policy "Participants can manage albums"
  on public.chat_expedition_albums for all
  using (user_id = auth.uid() or is_conversation_participant(conversation_id))
  with check (user_id = auth.uid());

-- Album media: participants
drop policy if exists "Participants can manage album media" on public.chat_album_media;
create policy "Participants can manage album media"
  on public.chat_album_media for all
  using (exists (
    select 1 from public.chat_expedition_albums a
    where a.id = album_id and is_conversation_participant(a.conversation_id)
  ))
  with check (exists (
    select 1 from public.chat_expedition_albums a
    where a.id = album_id and is_conversation_participant(a.conversation_id)
  ));

-- Checkpoints
drop policy if exists "Participants can manage checkpoints" on public.chat_checkpoints;
create policy "Participants can manage checkpoints"
  on public.chat_checkpoints for all
  using (user_id = auth.uid() or is_conversation_participant(conversation_id))
  with check (user_id = auth.uid());

-- Polls
drop policy if exists "Participants can manage polls" on public.chat_polls;
create policy "Participants can manage polls"
  on public.chat_polls for all
  using (user_id = auth.uid() or is_conversation_participant(conversation_id))
  with check (user_id = auth.uid());

-- Poll votes
drop policy if exists "Participants can vote" on public.chat_poll_votes;
create policy "Participants can vote"
  on public.chat_poll_votes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Call logs
drop policy if exists "Participants can view call logs" on public.chat_call_logs;
create policy "Participants can view call logs"
  on public.chat_call_logs for select
  using (is_conversation_participant(conversation_id));

drop policy if exists "Participants can insert call logs" on public.chat_call_logs;
create policy "Participants can insert call logs"
  on public.chat_call_logs for insert
  with check (caller_id = auth.uid());

-- Invite links
drop policy if exists "Users can manage invite links" on public.chat_invite_links;
create policy "Users can manage invite links"
  on public.chat_invite_links for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "Anyone can read invite links" on public.chat_invite_links;
create policy "Anyone can read invite links"
  on public.chat_invite_links for select
  using (is_active = true);

-- Mentions
drop policy if exists "Users can read own mentions" on public.chat_mentions;
create policy "Users can read own mentions"
  on public.chat_mentions for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert mentions" on public.chat_mentions;
create policy "Users can insert mentions"
  on public.chat_mentions for insert
  with check (exists (
    select 1 from public.chat_messages m
    where m.id = message_id
      and is_conversation_participant(m.conversation_id)
  ));

-- Trail reports
drop policy if exists "Participants can manage trail reports" on public.chat_trail_reports;
create policy "Participants can manage trail reports"
  on public.chat_trail_reports for all
  using (user_id = auth.uid() or is_conversation_participant(conversation_id))
  with check (user_id = auth.uid());

-- Bookmarks
drop policy if exists "Users can manage bookmarks" on public.chat_bookmarks;
create policy "Users can manage bookmarks"
  on public.chat_bookmarks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Drafts
drop policy if exists "Users can manage drafts" on public.chat_drafts;
create policy "Users can manage drafts"
  on public.chat_drafts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Offline queue
drop policy if exists "Users can manage offline queue" on public.chat_offline_queue;
create policy "Users can manage offline queue"
  on public.chat_offline_queue for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 5. REALTIME PUBLICATION
alter publication supabase_realtime add table public.chat_live_treks;
alter publication supabase_realtime add table public.chat_live_locations;
alter publication supabase_realtime add table public.chat_sos_alerts;
alter publication supabase_realtime add table public.chat_waypoints;
alter publication supabase_realtime add table public.chat_expedition_albums;
alter publication supabase_realtime add table public.chat_checkpoints;
alter publication supabase_realtime add table public.chat_polls;
alter publication supabase_realtime add table public.chat_call_logs;
alter publication supabase_realtime add table public.chat_mentions;
alter publication supabase_realtime add table public.chat_trail_reports;
alter publication supabase_realtime add table public.chat_drafts;

-- 6. STORAGE BUCKET for chat attachments
insert into storage.buckets (id, name, public) values ('chat_attachments', 'chat_attachments', false)
on conflict (id) do nothing;

drop policy if exists "Chat attachments insert" on storage.objects;
create policy "Chat attachments insert"
  on storage.objects for insert
  with check (
    bucket_id = 'chat_attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Chat attachments select" on storage.objects;
create policy "Chat attachments select"
  on storage.objects for select
  using (
    bucket_id = 'chat_attachments'
    and exists (
      select 1 from public.chat_participants cp
      join public.chat_attachments ca on ca.message_id::text like '%'  -- permissive for participants
    )
  );

-- 7. TRIGGERS

-- Auto-update conversation updated_at on new messages
create or replace function public.update_chat_conversations_updated_at()
returns trigger as $$
begin
  update public.chat_conversations set updated_at = now() where id = NEW.conversation_id;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists on_chat_message_insert on public.chat_messages;
create trigger on_chat_message_insert
  after insert on public.chat_messages
  for each row execute function public.update_chat_conversations_updated_at();

-- Auto-create mention records when message contains @username
create or replace function public.extract_mentions()
returns trigger as $$
declare
  mention_pattern text := '@([a-zA-Z0-9_]+)';
  match_text text;
  matched_user uuid;
begin
  if NEW.content is null then return NEW; end if;
  for match_text in select regexp_matches(NEW.content, mention_pattern, 'g') loop
    select id into matched_user from public.profiles
    where username = match_text or display_name ilike match_text;
    if matched_user is not null and matched_user != NEW.sender_id then
      insert into public.chat_mentions (message_id, user_id)
      values (NEW.id, matched_user)
      on conflict do nothing;
    end if;
  end loop;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists on_chat_message_extract_mentions on public.chat_messages;
create trigger on_chat_message_extract_mentions
  after insert on public.chat_messages
  for each row execute function public.extract_mentions();
