-- =============================================================================
-- Seed Data
-- =============================================================================
-- Inserts sample data for local development.
-- Run: supabase db reset (applies migrations + seed)
-- =============================================================================
-- NOTE: This seed creates a test user directly in auth.users.
-- In production, users are created through the Supabase Auth API.
-- =============================================================================

-- Create a test user (only works in local dev — service role bypasses auth)
insert into auth.users (
  id,
  instance_id,
  role,
  aud,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo@example.com',
  -- bcrypt hash of 'password123' — change this in any real environment
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Demo User"}',
  false
) on conflict (id) do nothing;

-- The handle_new_user trigger creates the profile automatically.
-- Wait for trigger, then update with sample data.
update public.profiles
set
  full_name = 'Demo User',
  subscription_status = 'free'
where id = '00000000-0000-0000-0000-000000000001';

-- Sample conversations
insert into public.conversations (id, user_id, title, system_prompt, created_at)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Getting started with Claude',
    null,
    now() - interval '2 days'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Brainstorming product ideas',
    'You are a startup advisor with experience in B2B SaaS products.',
    now() - interval '1 day'
  );

-- Sample messages
insert into public.messages (conversation_id, user_id, role, content, created_at)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'user',
    'Hello! What can you help me with?',
    now() - interval '2 days'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'assistant',
    'Hello! I''m Claude, an AI assistant made by Anthropic. I can help you with a wide range of tasks including writing, analysis, coding, math, research, and creative projects. What would you like to work on today?',
    now() - interval '2 days' + interval '5 seconds'
  );

-- Sample notes
insert into public.notes (user_id, title, content, tags, is_pinned, created_at)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'Project ideas',
    '# Project Ideas

## AI-powered tools
- Personal knowledge base with semantic search
- Code review assistant
- Meeting notes summarizer

## SaaS opportunities
- Niche vertical for [industry]
- Automation tool for [workflow]',
    array['ideas', 'projects'],
    true,
    now() - interval '3 days'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Setup checklist',
    '- [x] Clone repository
- [x] Copy .env.example to .env.local
- [x] Add Supabase credentials
- [x] Add Anthropic API key
- [ ] Add Stripe keys
- [ ] Deploy to Vercel',
    array['setup', 'checklist'],
    false,
    now() - interval '1 day'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Architecture notes',
    'Using Next.js App Router with Server Components for all data fetching. Client Components only where interactivity is required. Supabase SSR package for cookie-based auth.',
    array['architecture', 'technical'],
    false,
    now()
  );
