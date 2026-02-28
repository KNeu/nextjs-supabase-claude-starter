# Contributing

Thank you for your interest in contributing to this starter template!

## Code style

- **TypeScript strict mode** — no `any` types, no type assertions without a comment explaining why
- **Zod for all validation** — at every API boundary and Server Action input
- **No TODO comments** — either implement it or document the intentional stub
- **No hardcoded values** — use environment variables for all external service config
- **RLS on every table** — every new database table must have Row Level Security policies
- **Prettier + ESLint** — run `npm run validate` before submitting a PR

## Running locally

```bash
npm install
supabase start
supabase db reset
cp .env.example .env.local
# Fill in .env.local
npm run dev
```

## PR guidelines

- Keep PRs focused — one feature or fix per PR
- Update `README.md` if you add a new pattern or change the architecture
- Add a migration file if you change the database schema
- Run `npm run db:generate-types` after schema changes and commit the updated types

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add dark mode toggle to sidebar
fix: handle expired Stripe subscription correctly
docs: add "how to add a new resource" guide
chore: upgrade @anthropic-ai/sdk to 0.40.0
```
