# Agent instructions — Collectors Toolkit

Guidance for AI coding agents (Cursor, Codex, Claude Code, etc.) working in this repo.

## What this is

Next.js 15 App Router app for sports card collectors: graded slab scanner, raw-card AI grader, collection manager, purchase import, portfolio dashboard, set tracker, and want list. Auth via **Clerk**; data via **Supabase** (Postgres + Storage) using the **service role** on the server.

**Product docs:** [`collectors_toolkit_product_spec.md`](collectors_toolkit_product_spec.md) (roadmap) · [`collectors_toolkit_weekly_prompts.md`](collectors_toolkit_weekly_prompts.md) (build prompts) · [`collectors_toolkit_PRD.md`](collectors_toolkit_PRD.md) (requirements)

## Conventions (follow existing code)

| Area | Pattern |
|------|---------|
| API routes | `export const runtime = 'nodejs'`; `export const maxDuration = 60` on long routes (scanner, grader, import) |
| Auth | `auth()` / `currentUser()` from `@clerk/nextjs/server` → `getOrCreateUserId(clerkId, email)` from `@/lib/users` |
| DB access | `createServiceClient()` from `@/lib/supabase` — **never** use anon client for user data on the server |
| Scoping | Every query filters by Supabase `users.id` (not Clerk id) |
| Rate limits | `checkRateLimit(supabaseUserId, action, limit)` from `@/lib/rate-limit` |
| Storage | Bucket `card-images`; path `${userId}/${Date.now()}-${uuid}.${ext}` via `@/lib/card-image-storage` |
| OpenAI | `import { openai } from '@/lib/openai'` |
| Types | Define in `@/lib/[feature].ts`; routes stay thin |
| UI | Tailwind; `site-shell.tsx` layout; `rounded-3xl`, `border-slate-200`, `text-brand-600` |
| Images | `CardImage` for Next/Image; legacy uploads use `eslint-disable` on `<img>` where needed |

## Security

- **RLS:** Migrations enable **deny-all** policies on user tables (`anon` / `authenticated`). The app relies on the service role + Clerk; do not expose `SUPABASE_SECRET_KEY` to the client.
- **API routes:** Always check `auth()`; return 401 when missing.
- **Do not** add permissive RLS policies without an explicit product decision.

## Database migrations

Apply in order under `supabase/migrations/`:

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | Core tables (`cards`, `collection_cards`, scans, import, sets, etc.) |
| `002_grader_columns.sql` | Raw grader multi-image columns |
| `003_import_storage.sql` | Import file storage bucket |
| `004_rls.sql` | Deny-all RLS on user tables |
| `005_card_images_storage.sql` | Public `card-images` bucket |
| `006_collection_card_images.sql` | Multi-photo gallery + backfill from front/back URLs |
| `007_rls_sets.sql` | RLS on `card_sets`, `collection_set_progress` |

```bash
npx supabase db push
# Or use Supabase MCP: list_migrations / apply_migration
```

**Note:** `006_collection_card_images.sql` uses separate `WITH` blocks for gallery position sync and legacy column sync (Postgres CTE scope).

## Key modules

| Feature | Lib / API |
|---------|-----------|
| Scanner | `@/lib/scanner*`, `src/app/api/scanner/` |
| Grader | `@/lib/grader*`, `grader-prompt.ts`, `grader-db.ts`, `src/app/api/grader/` |
| Collection list/add | `@/lib/collection*`, `collection-rows.ts`, `src/app/api/collection/` |
| Collection detail/edit | `@/lib/collection-detail.ts`, `[id]/route.ts` |
| Photo gallery (≤10) | `@/lib/collection-photos.ts`, `collection-photo-client.ts`; falls back to `front_image_url` / `back_image_url` if table missing |
| Import | `@/lib/import/*`, `src/app/api/import/`, bookmarklet `src/app/api/bookmarklet/` |
| Cert lookup | `@/lib/cert-lookup/*` (PSA API, BGS scrape, CardGrade fallback) |
| Portfolio | `@/lib/portfolio.ts`, `portfolio-server.ts`, `GET /api/portfolio` |
| Sets | `@/lib/sets.ts`, `src/app/api/sets/` |
| Want list | `@/lib/wantlist.ts`, `src/app/api/wantlist/` |

## Routes (App Router)

| Path | Purpose |
|------|---------|
| `/scanner`, `/scanner/history` | Graded slab scan |
| `/grader`, `/grader/history` | Raw AI grader |
| `/collection`, `/collection/add`, `/collection/[id]` | Collection |
| `/import`, `/import/[batchId]` | Purchase import |
| `/portfolio` | Value dashboard (recharts) |
| `/sets`, `/sets/[setId]` | Set completion |
| `/wantlist` | Want list |

## Testing & quality

```bash
npm test          # node --test tests/*.test.ts (79 tests)
npm run lint      # eslint . --max-warnings=0
npm run build     # next build
```

Add tests in `tests/` for non-trivial pure logic (parsers, presenters, query builders). Match existing `node:test` style.

## MCP (Supabase)

`.cursor/mcp.json` links the Supabase MCP server. Before calling MCP tools, read tool schemas under the Cursor MCP folder. Use `list_migrations`, `apply_migration`, `get_advisors` for DB work — prefer applying SQL from `supabase/migrations/` rather than inventing DDL.

## What not to do

- Do not commit `.env.local`, Clerk secrets, or service role keys.
- Do not use CardGrade.io for raw grading (GPT-4o only).
- Do not auto-save import rows without user review.
- Do not remove legacy `front_image_url` / `back_image_url` without a migration plan (gallery syncs from them).
- Minimize scope: match surrounding patterns; avoid drive-by refactors.

## Implementation status (MVP)

Weeks 1–8 features are **implemented** in code. V2 items (live comps, price alerts, QR cross-device, TCG) are in the product spec only — do not build unless asked.
