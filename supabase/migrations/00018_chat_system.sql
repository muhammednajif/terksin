-- ============================================================
-- MIGRATION: Chat System — conversations, messages, real-time
-- Idempotent: safe to run multiple times.
-- ============================================================

-- 0. EXtensions
create extension if not exists "pgcrypto";

-- 1. CONVERSATIONS
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  is_group boolean default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. CONVERSATION PARTICIPANTS
create table if not exists public.chat_participants (
  conversation_id uuid references public.chat_conversations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default now(),
  last_read_at timestamptz default now(),
  is_admin boolean default false,
  is_muted boolean default false,
  primary key (conversation_id, user_id)
);

-- 3. MESSAGES
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.chat_conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete set null,
  content text,
  message_type text not null default 'text'
    check (message_type in (
      'text', 'image', 'video', 'location', 'gpx_route', 'map',
      'trail_card', 'expedition_invite', 'poll', 'voice_note',
      'document', 'achievement_card', 'badge_unlock', 'journey_share',
      'weather_alert', 'emergency_alert', 'system_automation',
      'gif', 'checkpoint', 'campsite', 'equipment_checklist',
      'elevation_graph', 'live_trek'
    )),
  metadata jsonb default '{}'::jsonb,
  reply_to_id uuid references public.chat_messages(id) on delete set null,
  is_edited boolean default false,
  is_pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. MESSAGE REACTIONS
create table if not exists public.chat_reactions (
  message_id uuid references public.chat_messages(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now(),
  primary key (message_id, user_id, emoji)
);

-- 5. READ RECEIPTS
create table if not exists public.chat_read_receipts (
  message_id uuid references public.chat_messages(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  read_at timestamptz default now(),
  primary key (message_id, user_id)
);

-- Indexes
create index if not exists idx_chat_participants_user on public.chat_participants(user_id);
create index if not exists idx_chat_participants_conversation on public.chat_participants(conversation_id);
create index if not exists idx_chat_messages_conversation on public.chat_messages(conversation_id, created_at desc);
create index if not exists idx_chat_messages_sender on public.chat_messages(sender_id);
create index if not exists idx_chat_messages_type on public.chat_messages(message_type);
create index if not exists idx_chat_reactions_message on public.chat_reactions(message_id);
create index if not exists idx_chat_read_receipts_message on public.chat_read_receipts(message_id);

-- Updated_at trigger for conversations
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

-- RLS
alter table public.chat_conversations enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reactions enable row level security;
alter table public.chat_read_receipts enable row level security;

-- Participants can see conversation
drop policy if exists "Participants can view conversation" on public.chat_conversations;
create policy "Participants can view conversation"
  on public.chat_conversations for select
  using (
    exists (
      select 1 from public.chat_participants
      where conversation_id = id and user_id = auth.uid()
    )
  );

-- Participants can insert messages
drop policy if exists "Participants can insert messages" on public.chat_messages;
create policy "Participants can insert messages"
  on public.chat_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chat_participants
      where conversation_id = chat_messages.conversation_id and user_id = auth.uid()
    )
  );

-- Participants can read messages
drop policy if exists "Participants can view messages" on public.chat_messages;
create policy "Participants can view messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_participants
      where conversation_id = chat_messages.conversation_id and user_id = auth.uid()
    )
  );

-- Participants can update own messages
create policy "Participants can update own messages"
  on public.chat_messages for update
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

-- Participants can see own participant records (no subquery to avoid recursion)
drop policy if exists "Participants can view participants" on public.chat_participants;
create policy "Participants can view participants"
  on public.chat_participants for select
  using (user_id = auth.uid());

-- Participants can insert reactions
drop policy if exists "Participants can manage reactions" on public.chat_reactions;
create policy "Participants can manage reactions"
  on public.chat_reactions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Participants can manage read receipts
drop policy if exists "Participants can manage read receipts" on public.chat_read_receipts;
create policy "Participants can manage read receipts"
  on public.chat_read_receipts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Allow users to create conversations
drop policy if exists "Users can create conversations" on public.chat_conversations;
create policy "Users can create conversations"
  on public.chat_conversations for insert
  with check (auth.uid() = created_by);

-- Allow users to join conversations (own record, or creator adds participants)
drop policy if exists "Users can join conversations" on public.chat_participants;
drop policy if exists "Users can add participants" on public.chat_participants;
create policy "Users can add participants"
  on public.chat_participants for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.chat_conversations
      where id = conversation_id and created_by = auth.uid()
    )
  );

-- Security definer RPC to create direct conversations (bypasses RLS for participant insert)
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

    insert into public.chat_participants (conversation_id, user_id, is_admin)
    values (v_conv_id, auth.uid(), true),
           (v_conv_id, other_user_id, false);
  end if;

  return v_conv_id;
end;
$fn$;

-- Security definer RPC to get all participants for a conversation (bypasses RLS)
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
      'is_admin', cp.is_admin,
      'joined_at', cp.joined_at,
      'last_read_at', cp.last_read_at,
      'is_muted', cp.is_muted,
      'profile', (select to_jsonb(p.*) from profiles p where p.id = cp.user_id)
    )
  )
  into result
  from public.chat_participants cp
  where cp.conversation_id = conv_id;

  return coalesce(result, '[]'::json);
end;
$pfn$;

-- Real-time: enable replication for chat tables
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_conversations;
alter publication supabase_realtime add table public.chat_participants;
alter publication supabase_realtime add table public.chat_reactions;
alter publication supabase_realtime add table public.chat_read_receipts;
