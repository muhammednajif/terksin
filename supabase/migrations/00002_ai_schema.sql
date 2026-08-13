-- AI PLANNER SCHEMA
-- Run this in Supabase SQL Editor after 00001_full_schema.sql

-- 1. AI CONVERSATIONS
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text default 'New Plan',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. AI MESSAGES
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  structured_data jsonb,
  created_at timestamptz default now()
);

-- 3. TREK PLANS
create table if not exists public.trek_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  trek_id text,
  title text,
  status text default 'draft' check (status in ('draft', 'finalized', 'archived')),
  preferences jsonb default '{}',
  itinerary jsonb default '{}',
  budget jsonb default '{}',
  packing_list jsonb default '[]',
  safety_assessment jsonb default '{}',
  weather_snapshot jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. AI PREFERENCES
create table if not exists public.saved_ai_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferences jsonb default '{}',
  memory_enabled boolean default false,
  updated_at timestamptz default now()
);

-- INDEXES
create index if not exists idx_ai_conversations_user on public.ai_conversations(user_id);
create index if not exists idx_ai_conversations_updated on public.ai_conversations(updated_at desc);
create index if not exists idx_ai_messages_conversation on public.ai_messages(conversation_id);
create index if not exists idx_trek_plans_user on public.trek_plans(user_id);

-- UPDATED AT TRIGGERS
create or replace function public.update_ai_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_ai_conversations_updated_at on public.ai_conversations;
create trigger set_ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute function public.update_ai_updated_at();

drop trigger if exists set_trek_plans_updated_at on public.trek_plans;
create trigger set_trek_plans_updated_at
  before update on public.trek_plans
  for each row execute function public.update_ai_updated_at();

drop trigger if exists set_saved_ai_preferences_updated_at on public.saved_ai_preferences;
create trigger set_saved_ai_preferences_updated_at
  before update on public.saved_ai_preferences
  for each row execute function public.update_ai_updated_at();

-- RLS
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.trek_plans enable row level security;
alter table public.saved_ai_preferences enable row level security;

-- Users can only see their own conversations
create policy "Users can manage own conversations"
  on public.ai_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only see messages from their conversations
create policy "Users can manage own messages"
  on public.ai_messages for all
  using (
    exists (
      select 1 from public.ai_conversations
      where id = conversation_id and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ai_conversations
      where id = conversation_id and user_id = auth.uid()
    )
  );

-- Users can only see their own trek plans
create policy "Users can manage own plans"
  on public.trek_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only see their own preferences
create policy "Users can manage own preferences"
  on public.saved_ai_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
