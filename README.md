# nextjs-supabase-claude-starter

A production-grade starter template for building AI-powered SaaS applications.

**Stack:** Next.js 15 · Supabase · Claude API · Stripe · TypeScript · Tailwind CSS · shadcn/ui

> Built by [Kevin Neuburger](https://www.upwork.com/freelancers/kevinneuburger) — patterns extracted from a real 60+ table, 100+ route production app.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](tsconfig.json)

---

## What's included

| Feature | Details |
|---|---|
| **Auth** | Email/password + Google OAuth, protected routes, session refresh |
| **AI Chat** | Streaming Claude responses, conversation history, tool use |
| **Tool use** | `get_usage_stats`, `search_notes`, `create_note` |
| **Database** | Clean SQL migrations, RLS on every table, generated types |
| **CRUD** | Full notes resource with search, pagination, tags, optimistic UI |
| **Billing** | Stripe Checkout, webhooks, customer portal, free/paid tiers |
| **Rate limiting** | IP-based per-minute + user monthly message quotas |
| **DX** | TypeScript strict, Zod validation, env validation, ESLint, Prettier |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ React Client │  │  Next.js SSR │  │   Supabase Realtime   │ │
│  │  Components  │  │   (Server    │  │  (future: live msgs)  │ │
│  │  "use client"│  │  Components) │  └───────────────────────┘ │
│  └──────┬───────┘  └──────┬───────┘                            │
└─────────┼────────────────┼────────────────────────────────────-┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Next.js App Router (Vercel Edge / Node.js)                     │
│                                                                 │
│  proxy.ts → auth check → redirect unauthenticated users        │
│                                                                 │
│  /api/chat          POST → stream Claude response (SSE)         │
│  /api/auth/callback GET  → OAuth code exchange                  │
│  /api/webhooks/stripe POST → Stripe event handler               │
│  /api/health        GET  → uptime monitoring                    │
│                                                                 │
│  Server Actions (mutations):                                    │
│    createConversation  updateNote  uploadAvatar  startCheckout  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
┌──────────────────┐             ┌──────────────────┐
│   Supabase       │             │   Anthropic API  │
│                  │             │                  │
│  PostgreSQL      │◄────────────│  claude-sonnet   │
│  Auth            │  tool use   │  streaming       │
│  Storage         │  queries    │  tool_use blocks │
│  Row Level Sec.  │             └──────────────────┘
└──────────────────┘
           │
           ▼
┌──────────────────┐
│   Stripe         │
│  Checkout        │
│  Webhooks        │
│  Portal          │
└──────────────────┘
```

---

## File structure

```
src/
├── app/
│   ├── (auth)/              # Unauthenticated pages (login, register)
│   ├── (dashboard)/         # Authenticated pages (chat, notes, profile, billing)
│   │   ├── chat/
│   │   │   └── [conversationId]/  # Individual conversation view
│   │   ├── notes/
│   │   │   ├── new/         # Create note form
│   │   │   └── [noteId]/    # Edit note form
│   │   ├── profile/         # Avatar upload, display name
│   │   └── billing/         # Stripe checkout + portal
│   ├── actions/             # Server Actions (mutations)
│   │   ├── conversations.ts
│   │   ├── notes.ts
│   │   └── profile.ts
│   ├── api/
│   │   ├── chat/route.ts         # SSE streaming endpoint
│   │   ├── auth/callback/        # Supabase OAuth callback
│   │   ├── health/               # Uptime check
│   │   └── webhooks/stripe/      # Stripe event handler
│   └── layout.tsx
├── components/
│   ├── ui/                  # shadcn/ui primitives
│   ├── auth/                # LoginForm, RegisterForm
│   ├── chat/                # ChatInterface, ConversationList, Message
│   ├── notes/               # NoteForm
│   └── layout/              # Sidebar
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser client (Client Components)
│   │   ├── server.ts        # Server client + admin client (Server Components)
│   │   └── middleware.ts    # Session refresh helper (used by proxy.ts)
│   ├── anthropic/
│   │   ├── client.ts        # Anthropic SDK singleton
│   │   └── tools.ts         # Tool definitions + handlers
│   ├── stripe/
│   │   └── client.ts        # Stripe SDK + checkout helpers
│   ├── validations/         # Zod schemas
│   ├── rate-limit.ts        # IP + monthly rate limiting
│   ├── env.ts               # Env var validation (startup)
│   └── utils.ts             # cn(), formatRelativeDate(), etc.
├── types/
│   ├── database.types.ts    # Auto-generated from Supabase schema
│   └── index.ts             # Domain types, aliases, helpers
├── hooks/
│   └── use-toast.ts
└── proxy.ts                 # Auth redirect proxy (Next.js 16 convention)
supabase/
├── migrations/
│   ├── 001_initial_schema.sql   # Tables + triggers
│   ├── 002_rls_policies.sql     # Row Level Security
│   └── 003_storage.sql          # Storage buckets + policies
└── seed.sql                     # Sample data for local dev
```

---

## Setup (under 10 minutes)

### Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (for webhook testing)

### 1. Clone and install

```bash
git clone https://github.com/kevinneuburger/nextjs-supabase-claude-starter.git
cd nextjs-supabase-claude-starter
npm install
```

### 2. Set up Supabase

```bash
# Start local Supabase (Docker required)
supabase start

# Apply migrations + seed data
supabase db reset
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in the values from `supabase status` output:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase status>
ANTHROPIC_API_KEY=sk-ant-...
```

Stripe (optional for local dev — billing pages degrade gracefully):
```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the webhook signing secret printed by the CLI
```

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
```

### 4. Generate TypeScript types

```bash
npm run db:generate-types
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with the seed user:
- Email: `demo@example.com`
- Password: `password123`

---

## Deployment (Vercel + Supabase Cloud)

### Supabase Cloud

1. Create a project at [supabase.com](https://supabase.com)
2. Push migrations: `supabase db push --linked`
3. Enable Google OAuth: **Dashboard → Authentication → Providers → Google**
4. Add redirect URL: `https://yourdomain.com/api/auth/callback`

### Vercel

1. Import the repository in the Vercel dashboard
2. Add all environment variables from `.env.example`
3. Set `NEXT_PUBLIC_APP_URL` to your production URL
4. Deploy

### Stripe Production

1. Switch to live mode keys
2. Create a webhook endpoint in the Stripe Dashboard pointing to `https://yourdomain.com/api/webhooks/stripe`
3. Subscribe to: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## How to add a new resource

This template establishes a pattern for adding any new resource (e.g., "projects", "todos"). Follow these steps:

### Step 1: Database migration

```sql
-- supabase/migrations/004_projects.sql
create table public.projects (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- RLS
alter table public.projects enable row level security;
create policy "projects: select own" on public.projects for select using (auth.uid() = user_id);
create policy "projects: insert own" on public.projects for insert with check (auth.uid() = user_id);
create policy "projects: update own" on public.projects for update using (auth.uid() = user_id);
create policy "projects: delete own" on public.projects for delete using (auth.uid() = user_id);

-- updated_at trigger
create trigger projects_updated_at before update on public.projects
  for each row execute function public.handle_updated_at();
```

### Step 2: Regenerate types

```bash
npm run db:generate-types
```

### Step 3: Add validation schema

```typescript
// src/lib/validations/projects.ts
import { z } from "zod";
export const createProjectSchema = z.object({ name: z.string().min(1).max(200) });
```

### Step 4: Add Server Actions

```typescript
// src/app/actions/projects.ts
"use server";
// Copy the pattern from src/app/actions/notes.ts
```

### Step 5: Add pages

- `src/app/(dashboard)/projects/page.tsx` — list view
- `src/app/(dashboard)/projects/new/page.tsx` — create form
- `src/app/(dashboard)/projects/[projectId]/page.tsx` — edit form

### Step 6: Add nav item in sidebar

```typescript
// src/components/layout/sidebar.tsx
const navItems = [
  // ...existing items
  { href: "/projects", label: "Projects", icon: FolderOpen },
];
```

---

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server only) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key (`sk-ant-...`) |
| `ANTHROPIC_MODEL` | No | Claude model ID (default: `claude-sonnet-4-20250514`) |
| `ANTHROPIC_MAX_TOKENS` | No | Max response tokens (default: `4096`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Billing | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Billing | Stripe secret key (server only) |
| `STRIPE_WEBHOOK_SECRET` | Billing | Webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | Billing | Price ID for the Pro subscription |
| `NEXT_PUBLIC_APP_URL` | Yes | Your app's public URL (no trailing slash) |
| `FREE_TIER_MONTHLY_MESSAGE_LIMIT` | No | Free tier message limit (default: `50`) |
| `CHAT_RATE_LIMIT_PER_MINUTE` | No | IP rate limit for chat (default: `10`) |

---

## Key decisions / why things are done this way

**Why `@supabase/ssr` instead of `@supabase/auth-helpers-nextjs`?**
The `@supabase/auth-helpers-nextjs` package is deprecated. `@supabase/ssr` is the current recommended approach for Next.js App Router. It handles cookie management correctly for both client and server contexts.

**Why Server Actions for mutations instead of API routes?**
Server Actions are the Next.js 15 idiomatic pattern for mutations. They colocate the mutation logic with the components, provide automatic CSRF protection, and integrate with `revalidatePath` for cache invalidation.

**Why raw SSE instead of Vercel AI SDK for streaming?**
Raw Server-Sent Events give full control over the streaming format, let you save to the database _after_ the stream completes without a separate endpoint, and avoid an additional dependency. The pattern is the same — `ReadableStream` with SSE framing.

**Why in-memory rate limiting instead of Redis?**
Good enough for a single-instance deployment and zero infrastructure cost. The comment in `rate-limit.ts` shows exactly what to swap in when you scale horizontally.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE) — use this however you want, attribution appreciated but not required.

---

*Built by [Kevin Neuburger](https://www.upwork.com/freelancers/kevinneuburger)*
