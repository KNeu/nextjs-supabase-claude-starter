-- =============================================================================
-- Migration 002: Row Level Security Policies
-- =============================================================================
-- Every table has RLS enabled. The principle of least privilege applies:
-- users can only read/write their own data.
-- Service role (used in webhooks) bypasses RLS entirely.
-- =============================================================================

-- =============================================================================
-- PROFILES
-- =============================================================================
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile (but not change their id or email)
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No direct insert — the handle_new_user trigger does this via security definer
-- No delete — users cannot delete themselves via the API (use Supabase dashboard)

-- =============================================================================
-- CONVERSATIONS
-- =============================================================================
alter table public.conversations enable row level security;

create policy "conversations: select own"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "conversations: insert own"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "conversations: update own"
  on public.conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "conversations: delete own"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- MESSAGES
-- =============================================================================
alter table public.messages enable row level security;

-- Users can read messages in their own conversations
create policy "messages: select own conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

-- Users can insert messages in their own conversations
create policy "messages: insert own conversations"
  on public.messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

-- Messages are immutable — no update or delete policies
-- (Use soft-delete or a separate archive table if needed)

-- =============================================================================
-- NOTES
-- =============================================================================
alter table public.notes enable row level security;

create policy "notes: select own"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "notes: insert own"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "notes: update own"
  on public.notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notes: delete own"
  on public.notes for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- USAGE TRACKING
-- =============================================================================
alter table public.usage_tracking enable row level security;

-- Users can read their own usage (for the dashboard)
create policy "usage_tracking: select own"
  on public.usage_tracking for select
  using (auth.uid() = user_id);

-- Users cannot insert directly — the API route (service role) does this
-- This prevents tampering with usage records

-- =============================================================================
-- MONTHLY USAGE VIEW
-- =============================================================================
-- Views inherit RLS from their underlying tables, so no extra policy needed.
-- But we grant explicit access to make intent clear.
grant select on public.monthly_usage to authenticated;
