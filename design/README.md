# Design Reference

Files exported from the Claude Design session (claude.ai/design). This directory is **read-only reference** — nothing here is imported by the app. Files are copied into `src/` one phase at a time during implementation.

## Workstream separation

This repo currently has two parallel workstreams:

| Workstream | Owns |
|---|---|
| Pricing API | `src/lib/cardsight/`, `src/lib/pricing/`, `src/app/api/pricing/`, `src/components/pricing/` |
| Design (this dir) | `design/` for reference; `src/components/`, `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx` during implementation |

## Contents

### `handoff/` — production-ready drop-ins
Copy these into `src/` when implementing each phase.

| File | Destination |
|---|---|
| `tailwind.config.ts` | repo root `tailwind.config.ts` |
| `globals.css` | `src/app/globals.css` |
| `layout.tsx` | `src/app/layout.tsx` |
| `components/Slab.tsx` | `src/components/Slab.tsx` |
| `components/editorial.tsx` | `src/components/editorial.tsx` |
| `components/site-shell.tsx` | `src/components/site-shell.tsx` |

### `prototypes/` — visual reference
Open HTML files in a browser to see the design spec. The JSX files are the React source the prototypes were built from — lift component structure and microcopy directly.

| File | What it shows |
|---|---|
| `Design System.html` | Tokens, type ramp, slab anatomy, nav before/after |
| `Home redesign.html` | Dashboard (desktop + mobile) |
| `Scanner.html` | Scanner with 4-state machine (idle/scanning/result/manual) |
| `App surfaces.html` | Grader, Collection, Import, Portfolio, Sets, Want list |

## Phase rollout

| # | Phase | Key files |
|---|---|---|
| 0 | Foundation: tokens + fonts + nav | `tailwind.config.ts`, `globals.css`, `layout.tsx`, `site-shell.tsx`, `Slab.tsx`, `editorial.tsx` |
| 1 | Home / Dashboard | `src/app/page.tsx` |
| 2 | Scanner | `src/app/scanner/page.tsx`, `ScanResult.tsx` |
| 3 | Grader | `src/app/grader/page.tsx`, `GradeResult.tsx` |
| 4 | Collection | `src/app/collection/` |
| 5 | Import | `src/app/import/` |
| 6 | Portfolio + Sets + Want list | `src/app/portfolio/`, `sets/`, `wantlist/` |

See `Handoff for Claude Code.md` in the original design bundle for the full phase prompts.
