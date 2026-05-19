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
| UI | Tailwind editorial system; `site-shell.tsx` layout. Tokens: `bg-paper/bg-surface`, `text-ink/text-ink-2/text-ink-3`, `border-rule`, `bg-accent`. **Never** use `slate-*`, `brand-6*`, or `ash-*` tokens. |
| Headings | `font-serif italic text-[Npx] leading-none tracking-tight text-ink` |
| Eyebrows | `font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3` |
| Buttons | Primary: `rounded bg-ink px-5 py-3 text-sm font-medium text-white hover:bg-ink/90`; secondary: `rounded border border-rule px-4 py-2 text-sm text-ink-2 hover:bg-surface-2` |
| Components | `Slab` (`src/components/Slab.tsx`) — CSS-only graded card placeholder (PSA/BGS/SGC/Raw). Editorial atoms in `src/components/editorial.tsx`: `Eyebrow`, `Rule`, `StatStrip`/`StatCell`, `Masthead`, `Button`, `PageFooter`. Utility: `cn()` from `@/lib/cn` |
| Images | `CardImage` for Next/Image; legacy uploads use `eslint-disable` on `<img>` where needed. `ImageUpload.tsx` is intentionally dark (lives inside dark viewfinder) — do not re-style. |

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
| `008_cardsight_pricing.sql` | Price snapshots/comparables + collection market columns |
| `009_rls_pricing.sql` | Deny-all RLS on pricing tables |
| `010_cardsight_market_cache.sql` | Global CardSight pricing cache + snapshot scope columns |
| `011_cardsight_grade_map.sql` | Persisted grade UUID lookup |
| `012_rls_market_cache.sql` | Deny-all RLS on market cache tables |

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
| CardSight pricing | `@/lib/cardsight/*`, `@/lib/pricing/*`, `src/app/api/pricing/`; `MarketPricingPanel` in `src/components/pricing/` |

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
- Do not modify `src/lib/pricing/*`, `src/lib/cardsight/*`, `src/app/api/pricing/*`, or `MarketPricingPanel.tsx` when doing UI/design work — the pricing system owns these files.
- Do not modify `src/lib/collection-rows.ts`, `src/lib/collection.ts`, `src/lib/portfolio-server.ts`, or `src/lib/portfolio.ts` when doing UI/design work.
- Minimize scope: match surrounding patterns; avoid drive-by refactors.

## Design system reference

`design/` folder at the repo root contains:
- `design/handoff/` — drop-in reference files (tailwind.config, layout, globals.css, key components)
- `design/prototypes/` — HTML and JSX prototypes for all major surfaces

When in doubt about a token or pattern, check `design/handoff/tailwind.config.ts` and `design/handoff/components/`.

## Implementation status (MVP)

All features are **implemented and live** on `main`. V2 items (live comps, price alerts, QR cross-device, TCG) are in the product spec only — do not build unless asked.
