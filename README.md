# Collectors Toolkit

A Next.js app for sports card collectors: scan graded slabs (PSA, BGS, SGC), AI-grade raw cards, manage your collection, import purchases, track portfolio value, and complete sets.

**For AI agents:** see [`AGENTS.md`](AGENTS.md) for conventions, migrations, and module map.

**Product docs:** [`collectors_toolkit_product_spec.md`](collectors_toolkit_product_spec.md) · [`collectors_toolkit_weekly_prompts.md`](collectors_toolkit_weekly_prompts.md) · [`collectors_toolkit_PRD.md`](collectors_toolkit_PRD.md)

## Tech stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Clerk** — authentication
- **Supabase** — Postgres, storage, service-role server access
- **OpenAI GPT-4o** — slab OCR, raw grading, import parsing
- **Tailwind CSS** — UI
- **recharts** — portfolio charts

## Features

| Module | Route | Status |
|--------|-------|--------|
| Graded scanner | `/scanner`, `/scanner/history` | Live |
| Raw card grader | `/grader`, `/grader/history` | Live |
| Collection | `/collection`, `/collection/add`, `/collection/[id]` | Live (multi-photo gallery, ≤10 images) |
| Purchase import | `/import`, `/import/[batchId]` | Live (bookmarklet, screenshots, Fanatics PDF, paste) |
| Want list | `/wantlist` | Live |
| Portfolio | `/portfolio` | Live |
| Set completion | `/sets`, `/sets/[setId]` | Live |

## Project structure

```
src/
├── app/                    # App Router pages + API routes
│   ├── api/                # REST handlers (auth + service role)
│   ├── collection/         # Collection UI
│   ├── grader/             # Raw grader + history
│   ├── scanner/            # Slab scanner + history
│   ├── import/             # Import review flow
│   ├── portfolio/          # Portfolio dashboard
│   ├── sets/               # Set tracker
│   └── wantlist/
├── components/             # Shared UI (site-shell, forms, results)
└── lib/                    # Business logic (no React in lib/)
tests/                      # node:test unit tests
supabase/migrations/        # Ordered SQL migrations (001–012)
design/                     # Editorial design system reference (handoff + prototypes)
```

## Getting started

### Prerequisites

- Node.js 20+
- Supabase project
- Clerk application
- OpenAI API key
- PSA API token (optional, for cert lookup)

### Setup

```bash
git clone <repo>
cd collectors-toolkit
npm install
cp .env.example .env.local
# Fill in Clerk, Supabase, OpenAI, PSA keys
```

Apply database migrations:

```bash
npx supabase db push
# Or run SQL files in supabase/migrations/ in order (001–012)
```

| Migration | Purpose |
|-----------|---------|
| `001_initial_schema.sql` | Core schema |
| `002_grader_columns.sql` | Grader session columns |
| `003_import_storage.sql` | Import storage bucket |
| `004_rls.sql` | Deny-all RLS (user tables) |
| `005_card_images_storage.sql` | Card image bucket |
| `006_collection_card_images.sql` | Photo gallery table + backfill |
| `007_rls_sets.sql` | RLS for set tracker tables |
| `008_cardsight_pricing.sql` | Price snapshots + collection market columns |
| `009_rls_pricing.sql` | Deny-all RLS on pricing tables |
| `010_cardsight_market_cache.sql` | Global CardSight pricing cache |
| `011_cardsight_grade_map.sql` | Persisted grade UUID lookup |
| `012_rls_market_cache.sql` | Deny-all RLS on market cache tables |

Run locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See [`.env.example`](.env.example):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk browser key |
| `CLERK_SECRET_KEY` | Clerk server key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `SUPABASE_SECRET_KEY` | Service role key (server only) |
| `OPENAI_API_KEY` | Vision + grading |
| `PSA_API_TOKEN` | PSA cert API |
| `CARDGRADE_API_TOKEN` | Optional cert fallback |
| `NEXT_PUBLIC_APP_URL` | App URL for bookmarklet redirects |
| `CARDSIGHT_API_KEY` | CardSight market pricing API |
| `CARDSIGHT_BASE_URL` | CardSight API base URL |

## Security

- **Clerk** protects app routes in middleware; API routes call `auth()` and scope queries by Supabase `users.id`.
- **Service role** bypasses RLS; migrations enable **deny-all** RLS on user tables for direct PostgREST access (defense in depth).
- Never expose `SUPABASE_SECRET_KEY` to the client.

## Deployment (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Add all environment variables from `.env.example`.
3. Run Supabase migrations against production (`001`–`012`).
4. Deploy; smoke test: sign up → scan → grade → add card → upload gallery photos → import → portfolio → want list → set tracker.

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # production server
npm run lint     # ESLint (zero warnings)
npm run test     # unit tests (tests/*.test.ts)
```

## License

Private / project use — see repository owner.
