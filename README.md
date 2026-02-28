# nextjs-supabase-claude-starter

A production-grade starter template for building AI-powered SaaS applications.

**Stack:** Next.js 16 · Supabase · Claude API · Stripe · TypeScript · Tailwind CSS · shadcn/ui

> Built by [Kevin Neuburger](https://www.upwork.com/freelancers/kevinneuburger) — patterns extracted from a real 60+ table, 100+ route production app.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](tsconfig.json)

**[github.com/KNeu/nextjs-supabase-claude-starter](https://github.com/KNeu/nextjs-supabase-claude-starter)** · **[Live demo →](https://your-demo-url.vercel.app)** ← *deploy your own and add the link here*

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

## Setup

No Docker. No local database. Just a free Supabase project and an API key.

### 1. Clone and install

```bash
git clone https://github.com/KNeu/nextjs-supabase-claude-starter.git
cd nextjs-supabase-claude-starter
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project (takes ~2 minutes)
2. Once the project is ready, open **Project Settings → API** and copy:
   - **Project URL**
   - **anon / public** key
   - **service_role** key

### 3. Run the migrations

In the Supabase Dashboard, open the **SQL Editor** and run each migration file in order:

1. Paste and run [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)
2. Paste and run [`supabase/migrations/002_rls_policies.sql`](supabase/migrations/002_rls_policies.sql)
3. Paste and run [`supabase/migrations/003_storage.sql`](supabase/migrations/003_storage.sql)

That's it — no CLI, no Docker, no `supabase db reset`.

> **Tip:** If you want to seed sample data, run [`supabase/seed.sql`](supabase/seed.sql) in the SQL Editor too. It creates a `demo@example.com` / `password123` test user.

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the three Supabase values from step 2, plus your Anthropic key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

**Stripe** (optional — billing pages degrade gracefully without it):

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
```

For local Stripe webhook testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up for a new account, or sign in as `demo@example.com` / `password123` if you ran the seed.

---

## Deployment

### Vercel

1. Push your fork to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add environment variables (copy from `.env.local`, swap Stripe test keys for live keys)
4. Set `NEXT_PUBLIC_APP_URL` to your production URL (e.g. `https://yourapp.vercel.app`)
5. Deploy

### Supabase Auth redirect URL

In the Supabase Dashboard → **Authentication → URL Configuration**, add your production URL:

```
https://yourapp.vercel.app/api/auth/callback
```

### Google OAuth (optional)

In the Supabase Dashboard → **Authentication → Providers → Google**, add your Google OAuth credentials. Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`

### Stripe webhooks (production)

In the Stripe Dashboard → **Developers → Webhooks**, add an endpoint:

```
https://yourapp.vercel.app/api/webhooks/stripe
```

Subscribe to: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## How to add a new resource

This template establishes a repeatable pattern. Here's how to add a new resource (e.g. "projects"):

### 1. Add a migration

Create `supabase/migrations/004_projects.sql`, run it in the SQL Editor:

```sql
create table public.projects (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.projects enable row level security;
create policy "projects: select own" on public.projects for select using (auth.uid() = user_id);
create policy "projects: insert own" on public.projects for insert with check (auth.uid() = user_id);
create policy "projects: update own" on public.projects for update using (auth.uid() = user_id);
create policy "projects: delete own" on public.projects for delete using (auth.uid() = user_id);

create trigger projects_updated_at before update on public.projects
  for each row execute function public.handle_updated_at();
```

### 2. Regenerate types

```bash
npx supabase gen types typescript --project-id your-project-ref > src/types/database.types.ts
```

### 3. Add a validation schema

```typescript
// src/lib/validations/projects.ts
import { z } from "zod";
export const createProjectSchema = z.object({ name: z.string().min(1).max(200) });
```

### 4. Add Server Actions

```typescript
// src/app/actions/projects.ts — copy the pattern from src/app/actions/notes.ts
```

### 5. Add pages

- `src/app/(dashboard)/projects/page.tsx` — list
- `src/app/(dashboard)/projects/new/page.tsx` — create form
- `src/app/(dashboard)/projects/[projectId]/page.tsx` — edit form

### 6. Add nav item

```typescript
// src/components/layout/sidebar.tsx
const navItems = [
  // ...
  { href: "/projects", label: "Projects", icon: FolderOpen },
];
```

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
└── seed.sql                     # Optional sample data
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

## Key decisions

**Why `@supabase/ssr` instead of `@supabase/auth-helpers-nextjs`?**
The `@supabase/auth-helpers-nextjs` package is deprecated. `@supabase/ssr` is the current recommended approach for Next.js App Router. It handles cookie management correctly for both client and server contexts.

**Why Server Actions for mutations instead of API routes?**
Server Actions are the Next.js idiomatic pattern for mutations. They colocate mutation logic with the component, provide automatic CSRF protection, and integrate with `revalidatePath` for cache invalidation.

**Why raw SSE instead of Vercel AI SDK for streaming?**
Raw Server-Sent Events give full control over the streaming format, let you save to the database _after_ the stream completes without a separate endpoint, and avoid an additional dependency. The pattern is `ReadableStream` with SSE framing.

**Why in-memory rate limiting instead of Redis?**
Good enough for a single-instance deployment and zero infrastructure cost. The comment in `rate-limit.ts` shows exactly what to swap in when you scale horizontally.

---

## Local development with Supabase CLI (optional)

If you prefer a fully local setup (no network dependency, offline support):

```bash
# Requires Docker
brew install supabase/tap/supabase
supabase start
supabase db reset   # applies migrations + seed

# Update .env.local with values from `supabase status`
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
```

To regenerate types against the local instance:
```bash
npm run db:generate-types   # uses supabase gen types --local
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE) — use this however you want, attribution appreciated but not required.

---

*Built by [Kevin Neuburger](https://www.upwork.com/freelancers/kevinneuburger)*
