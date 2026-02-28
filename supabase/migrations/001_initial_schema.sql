-- =============================================================================
-- Migration 001: Initial Schema
-- =============================================================================
-- Creates the core tables for the application.
-- Run order: 001 → 002 (RLS policies) → 003 (Storage)
-- =============================================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- =============================================================================
-- PROFILES
-- Extends auth.users. One row per authenticated user.
-- Automatically created via trigger on auth.users insert.
-- =============================================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  -- Stripe fields
  stripe_customer_id    text unique,
  stripe_subscription_id text unique,
  subscription_status   text default 'free'
    check (subscription_status in ('free', 'active', 'canceled', 'past_due', 'trialing')),
  subscription_period_end timestamptz,
  -- Timestamps
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

comment on table public.profiles is
  'Public profile data for each user. Synced from auth.users on sign-up.';
comment on column public.profiles.subscription_status is
  'Mirrors the Stripe subscription status. "free" means no active subscription.';

-- =============================================================================
-- CONVERSATIONS
-- Top-level container for a series of messages with Claude.
-- =============================================================================
create table public.conversations (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text not null default 'New conversation',
  system_prompt text,
  -- Aggregate token usage for quick dashboard display
  total_input_tokens  integer default 0 not null,
  total_output_tokens integer default 0 not null,
  -- Timestamps
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

comment on table public.conversations is
  'A conversation thread between a user and Claude.';
comment on column public.conversations.system_prompt is
  'Optional per-conversation system prompt that overrides the default.';

create index conversations_user_id_updated_at_idx
  on public.conversations(user_id, updated_at desc);

-- =============================================================================
-- MESSAGES
-- Individual messages within a conversation.
-- =============================================================================
create table public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'tool')),
  content         text not null,
  -- Tool use fields (null for regular messages)
  tool_name       text,
  tool_input      jsonb,
  tool_result     jsonb,
  -- Token usage (populated for assistant messages)
  input_tokens    integer,
  output_tokens   integer,
  -- Timestamps
  created_at      timestamptz default now() not null
);

comment on table public.messages is
  'Individual messages in a conversation. Mirrors the Claude API message format.';
comment on column public.messages.role is
  '"user" = human message, "assistant" = Claude response, "tool" = tool result';

create index messages_conversation_id_created_at_idx
  on public.messages(conversation_id, created_at asc);

-- =============================================================================
-- NOTES
-- Example CRUD resource. Demonstrates the pattern for adding any new resource.
-- =============================================================================
create table public.notes (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  content    text not null default '',
  -- Tagging / filtering
  tags       text[] default '{}' not null,
  is_pinned  boolean default false not null,
  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.notes is
  'User-owned notes. Full CRUD example resource demonstrating the standard pattern.';

create index notes_user_id_updated_at_idx
  on public.notes(user_id, updated_at desc);

-- Full-text search index on notes
create index notes_fts_idx on public.notes
  using gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));

-- =============================================================================
-- USAGE TRACKING
-- Records token usage per message for cost monitoring and rate limiting.
-- =============================================================================
create table public.usage_tracking (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id      uuid references public.messages(id) on delete set null,
  -- Claude model used
  model           text not null,
  -- Token counts from the Anthropic API response
  input_tokens    integer not null default 0,
  output_tokens   integer not null default 0,
  -- Estimated cost in USD cents (input: $3/MTok, output: $15/MTok for Sonnet)
  estimated_cost_cents numeric(10, 4) not null default 0,
  -- Timestamps
  created_at      timestamptz default now() not null
);

comment on table public.usage_tracking is
  'Immutable log of token usage per AI response. Used for billing and rate limiting.';
comment on column public.usage_tracking.estimated_cost_cents is
  'Approximation only — verify against your Anthropic invoice for billing.';

create index usage_tracking_user_id_created_at_idx
  on public.usage_tracking(user_id, created_at desc);

-- Monthly usage aggregation view (used for rate limiting)
create or replace view public.monthly_usage as
  select
    user_id,
    date_trunc('month', created_at) as month,
    count(*) as message_count,
    sum(input_tokens) as total_input_tokens,
    sum(output_tokens) as total_output_tokens,
    sum(estimated_cost_cents) as total_cost_cents
  from public.usage_tracking
  group by user_id, date_trunc('month', created_at);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.handle_updated_at();

create trigger notes_updated_at
  before update on public.notes
  for each row execute function public.handle_updated_at();

-- Auto-create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Update conversation token totals when a usage record is inserted
create or replace function public.handle_usage_inserted()
returns trigger language plpgsql as $$
begin
  if new.conversation_id is not null then
    update public.conversations
    set
      total_input_tokens  = total_input_tokens  + new.input_tokens,
      total_output_tokens = total_output_tokens + new.output_tokens,
      updated_at          = now()
    where id = new.conversation_id;
  end if;
  return new;
end;
$$;

create trigger on_usage_inserted
  after insert on public.usage_tracking
  for each row execute function public.handle_usage_inserted();
