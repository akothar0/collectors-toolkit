# CLAUDE.md — Collectors Toolkit

Project-specific guidance for Claude Code. Read AGENTS.md for the full agent reference.

## Design system (mandatory)

The app uses an **editorial light-mode** design system. All tokens are in `tailwind.config.ts`.

| Token group | Values |
|-------------|--------|
| Backgrounds | `bg-paper` (`#f6f4ef`), `bg-surface` (`#fff`), `bg-surface-2` (`#fbfaf6`) |
| Text | `text-ink`, `text-ink-2`, `text-ink-3`, `text-ink-4` |
| Borders | `border-rule`, `border-rule-soft` |
| Accent / CTA | `text-accent`, `bg-accent` (`#b8531a` cinnabar) |
| Primary button | `rounded bg-ink px-5 py-3 text-sm font-medium text-white hover:bg-ink/90` |
| Heading | `font-serif italic text-[Npx] leading-none tracking-tight text-ink` |
| Eyebrow | `font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3` |

**Banned tokens:** `slate-*`, `brand-6*`, `ash-*`, `ink-9xx` — these are from old design iterations and must never appear in UI files.

To audit: `grep -r "text-slate\|bg-slate\|border-slate\|bg-brand-6\|text-brand-6" src/`

## Key shared components

- `src/components/editorial.tsx` — `Eyebrow`, `Rule`, `StatStrip`/`StatCell`, `Masthead`, `Button`, `PageFooter`
- `src/components/Slab.tsx` — CSS-only graded card placeholder (PSA/BGS/SGC/Raw rendering)
- `src/components/site-shell.tsx` — App shell with nav, mobile tab bar, Capture dropdown
- `src/lib/cn.ts` — `cn(...classes)` utility

## Off-limits files (pricing system)

Never modify these when doing UI or design work:
- `src/lib/pricing/*`, `src/lib/cardsight/*`
- `src/app/api/pricing/*`
- `src/components/pricing/MarketPricingPanel.tsx`
- `src/lib/collection-rows.ts`, `src/lib/collection.ts`
- `src/lib/portfolio-server.ts`, `src/lib/portfolio.ts`

`ImageUpload.tsx` is **intentionally dark** — it lives inside a dark camera viewfinder. Do not restyle it.

## Common commands

```bash
npm run dev       # local dev server
npm run build     # production build (must pass before committing)
npm run lint      # ESLint zero-warnings
npm run test      # 79 unit tests (node:test)
```

## Branch / deploy workflow

- `main` is the production branch — Vercel auto-deploys on push
- Build must be clean before pushing to main
- Run `npm run lint && npm run build` locally before pushing
