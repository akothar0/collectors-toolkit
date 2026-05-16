# Collectors Toolkit — Product Requirements Document & Build Spec

**Status:** Draft v1.0
**Date:** 2026-05-15
**Author:** Aditya
**Stack:** Next.js 15 · TypeScript · Tailwind CSS · Clerk · Supabase · OpenAI GPT-4o · Vercel

---

## 1. Executive Summary

**Problem:** Sports card collectors have no single free tool that lets them identify graded cards, assess raw card condition, and track what they own — let alone bulk-import their existing purchases.

**Solution:** Collectors Toolkit is a web-based set of AI-powered tools for casual sports card hobbyists. It does four things no single competitor does together:
1. Identify graded slabs via AI + cert lookup
2. Grade raw cards with AI vision analysis
3. Track your collection with frictionless manual entry
4. Import existing purchases from eBay/Fanatics CSVs or screenshots

**Success metric for MVP:** 50 users each log at least 5 cards within the first 30 days of launch.

---

## 2. Target User

**Primary persona:** Marcus, 32 — casual sports card collector. Buys 5-20 cards per month on eBay and at local card shows. Has 200+ cards, tracks nothing. Gets PSA-graded cards as investments. Has no idea what his raw cards would grade at. Manually enters nothing because it takes too long.

**What Marcus wants:**
- "Tell me what this card is and what it's worth" (scanner)
- "Tell me if this card is worth grading" (raw grader)
- "Help me keep track of what I own" (collection manager)
- "Let me import everything I already bought" (import)

**What Marcus does not want:**
- Market dashboards
- Social feed
- Investment advice
- Subscription walls on basic features

---

## 3. Competitive Context

| Tool | Price | AI Grader | Import | Collection Mgmt | Free Cert Lookup |
|------|-------|-----------|--------|-----------------|-----------------|
| **Collectors Toolkit** | **Free** | **Yes** | **Yes** | **Yes** | **Yes (PSA + BGS + SGC)** |
| Card Ladder | Freemium | No | No | Basic | No |
| Market Movers | $8.99/mo | No | No | No | No |
| CardHedger | $49/mo | Image ID only | No | No | Yes |
| Collectr | Free / Pro | Scan only (TCG) | No | Yes | No |
| Fanatics Collect | Free | No | CSV (degraded) | Yes (ecosystem only) | No |

**Wedge:** The combination of AI grading + purchase import + free cert lookup exists nowhere else.

---

## 4. Non-Goals (MVP)

The following are explicitly out of scope for v1 (Weeks 1–8):
- Real-time pricing / market data
- Email or push notifications
- Social features (sharing, following, community)
- Native iOS/Android app
- TCG cards (Pokemon, MTG, Yu-Gi-Oh)
- Automatic price alerts
- Marketplace / buying/selling
- Authentication methods beyond Clerk standard email/social
- Admin dashboard

---

## 5. User Stories & Acceptance Criteria

### 5.1 Graded Card Scanner

**Story:** As a collector, I want to point my phone camera at a graded slab and immediately see the card's details and population data, so I know what I'm holding without typing anything.

| # | Acceptance Criterion |
|---|----------------------|
| AC-01 | User uploads a photo of a PSA slab → system extracts cert number with >90% accuracy on clear photos |
| AC-02 | System returns: player name, year, set, parallel, official grade, pop at this grade, pop higher |
| AC-03 | If cert extraction fails → user sees a manual cert# input field immediately (no dead end) |
| AC-04 | If cert lookup fails → user sees card details from OCR + option to enter details manually |
| AC-05 | BGS certs return equivalent data via web scraping |
| AC-06 | SGC certs return equivalent data via web scraping |
| AC-07 | All cert results are cached — repeat lookup for same cert hits Supabase, not the external API |
| AC-08 | Rate limit: 10 scanner scans per user per day. Remaining count shown on scanner page. |
| AC-09 | User can save scan result to collection in one tap |
| AC-10 | Scanner history page shows all past scans for the user |

---

### 5.2 Raw Card AI Grader

**Story:** As a collector, I want to photograph my raw card and get an estimated PSA grade with sub-grades, so I can decide whether to submit it for professional grading.

| # | Acceptance Criterion |
|---|----------------------|
| AC-11 | Grader page guides user through a 1–4 photo capture sequence with on-screen instructions per step |
| AC-12 | Step 1 (full front) is required; steps 2–4 (back, surface close-up, corner) are optional but prompted |
| AC-13 | GPT-4o receives all submitted images in one call; returns overall grade within 15 seconds |
| AC-14 | Grade result includes 4 sub-grades: centering, corners, edges, surface (each 1–10) |
| AC-15 | Grade result includes PSA prediction, BGS prediction, and CGC prediction separately |
| AC-16 | Grade result highlights recommended grading company (whichever grades highest for this card profile) |
| AC-17 | Grade result includes 2–4 sentences of plain-English condition notes referencing actual visible details |
| AC-18 | Grade result includes submission recommendation + cost-benefit note (PSA ~$25, BGS ~$30, CGC ~$20) |
| AC-19 | Confidence level (low/medium/high) is shown prominently; low confidence triggers retake guidance |
| AC-20 | A disclaimer "AI estimate only — not a professional grade" is visible on every grade result |
| AC-21 | Rate limit: 10 grade sessions per user per day |
| AC-22 | User can save a grade session and see past sessions in grade history |
| AC-23 | User can navigate from grade result to "add this card to collection" with grade + company pre-filled |

---

### 5.3 Collection Manager

**Story:** As a collector, I want to add a card to my collection in under 30 seconds, so that I actually do it instead of putting it off.

| # | Acceptance Criterion |
|---|----------------------|
| AC-21 | New card can be added with only player name filled in (all other fields optional) |
| AC-22 | Full manual entry (player + year + sport + set + grade + price) takes under 30 seconds |
| AC-23 | Player name field autocompletes from the cards catalog as user types |
| AC-24 | Collection grid shows all user's cards with image, player, grade, and value |
| AC-25 | Collection supports filters: sport, grading company, condition (raw/graded) |
| AC-26 | Collection supports sort: newest, oldest, player A-Z, grade, value |
| AC-27 | Card detail page shows all fields with inline editing |
| AC-28 | User can manually update a card's current value from the detail page |
| AC-29 | Gain/loss displays on card detail when both purchase price and current value are set |
| AC-30 | Cards can be deleted with a confirmation step |

---

### 5.4 Purchase Import

**Story:** As a collector who buys regularly on eBay, I want to upload my purchase history and have it automatically parsed into my collection, so I don't have to enter every card manually.

| # | Acceptance Criterion |
|---|----------------------|
| AC-31 | User can upload an eBay CSV (from Chrome extension export) → system parses card titles, prices, and dates |
| AC-32 | User can upload a screenshot of any purchase history page → GPT-4o Vision reads line items |
| AC-33 | User can upload a Fanatics CSV → system parses available fields |
| AC-34 | User can paste order confirmation text → GPT-4o parses card records |
| AC-35 | All parsed imports show in a review table before any data is saved |
| AC-36 | Each row shows: raw title, parsed card identity, price, date, confidence level |
| AC-37 | User can edit any parsed field inline before confirming |
| AC-38 | User can deselect rows they don't want to import |
| AC-39 | No cards are saved without explicit user confirmation ("Save to Collection" button) |
| AC-40 | Import batch is linked to resulting collection cards (provenance tracking) |
| AC-41 | Rate limit: 5 import batches per user per day |

---

### 5.5 Portfolio Dashboard

**Story:** As a collector, I want to see the total value of my collection and understand what I've spent vs. what it's worth, so I know if collecting is a good use of my money.

| # | Acceptance Criterion |
|---|----------------------|
| AC-42 | Dashboard shows: total cards, total cost basis, total current value, unrealized gain/loss |
| AC-43 | Gain/loss is shown in both dollar amount and percentage |
| AC-44 | Gain/loss is color-coded (green = gain, red = loss, gray = no data) |
| AC-45 | Breakdown by sport shows card count per sport |
| AC-46 | Breakdown by grade shows distribution across grades |
| AC-47 | Top 5 most valuable cards are shown with player, grade, and value |
| AC-48 | Dashboard loads in under 3 seconds |

---

### 5.6 Want List

**Story:** As a collector, I want to keep a list of cards I'm hunting, so I remember what to look for at shows and on eBay.

| # | Acceptance Criterion |
|---|----------------------|
| AC-49 | User can add a want list item with description (required) + target price + notes (optional) |
| AC-50 | Want list shows all active items (unfulfilled) |
| AC-51 | User can mark an item as found (fulfilled) |
| AC-52 | Fulfilling an item offers an option to add the card directly to collection |

---

### 5.7 Set Completion Tracker

**Story:** As a collector building a set, I want to track which card numbers I have vs. need, so I know what to hunt for next.

| # | Acceptance Criterion |
|---|----------------------|
| AC-53 | User can add a set to track: name, year, sport, total cards |
| AC-54 | Set shows a grid of card number slots (1 to N) |
| AC-55 | Click toggles a slot between owned (green) and needed (gray) |
| AC-56 | Progress bar shows X/Y and % complete |
| AC-57 | User can filter to show only missing cards |

---

## 6. Technical Requirements

### 6.1 API Integrations

| Integration | Purpose | Free Tier | Required In |
|-------------|---------|-----------|-------------|
| PSA API `GetByCertNumber` (`api.psacard.com/publicapi/`) | PSA cert verification — card identity, grade, pop, qualifier, auto grade | 100 calls/day free | Week 2 |
| PSA API `GetPSASpecPopulation` | Full grade distribution by spec (v2) | Same 100/day budget | Week 11 |
| OpenAI GPT-4o Vision | Raw card grading (multi-image, PSA+BGS+CGC predictions) + cert OCR + import parsing | Pay per use | Week 4 |
| Beckett scrape (`beckett.com/grading/card-lookup`) | BGS cert verification | Free (scraping) | Week 3 |
| SGC scrape (`gosgc.com/cert-code-lookup`) | SGC cert verification | Free (scraping) | Week 3 |
| CardGrade.io | Fallback cert aggregator | Free, no auth | Week 3 |
| OpenAI GPT-4o | OCR, grading, import parsing | Pay per use | Week 2 |
| OpenAI GPT-4o-mini | Text-only tasks (cheaper) | Pay per use | Week 7 |
| eBay Browse API | Live price comps (v2 only) | ~5,000 req/day free | Week 10 |
| Supabase Storage | Image + file storage | 1GB free tier | Week 1 |
| Clerk | Auth + user management | Free tier | Week 1 |
| Resend | Email (want list alerts, v2) | 3,000/mo free | Week 11 |

### 6.2 Performance Requirements

| Metric | Target |
|--------|--------|
| Scanner: time from upload to result | < 15 seconds |
| AI grader: time from upload to result | < 15 seconds |
| Collection page load | < 2 seconds |
| Portfolio dashboard load | < 3 seconds |
| Import parse: time from upload to review table | < 30 seconds |

### 6.3 Rate Limiting

| Action | Limit | Rationale |
|--------|-------|-----------|
| Scanner scans | 10/user/day | PSA API is 100/day free; prevents cost overruns |
| AI grade sessions | 10/user/day | GPT-4o vision costs ~$0.02/call |
| Import batches | 5/user/day | Each batch can be large; GPT-4o cost per batch |

Limits tracked in `usage_logs` table. Shown to user on each tool page.

### 6.4 Security Requirements

| Requirement | Implementation |
|-------------|---------------|
| All routes require authentication | Clerk middleware on all routes except `/` |
| Users can only access their own data | Clerk auth check in every API route handler |
| Database RLS as secondary layer | Supabase RLS policies on all user-owned tables |
| Uploaded files are private by default | Supabase Storage bucket policies |
| Service role key never exposed to client | Server-only `createServiceClient()` |
| Rate limiting prevents abuse | `usage_logs` table + per-user daily caps |

### 6.5 Data Retention

| Data | Retention |
|------|-----------|
| Scanner sessions (graded_scans) | Permanent (user owns it) |
| Grade sessions (raw_grade_sessions) | Permanent |
| Imported files (import-files bucket) | 30 days, then deleted |
| Uploaded card images (card-images) | Permanent |

---

## 7. Architecture Decisions

### Why a separate `cards` table?
A canonical `cards` table stores card identity (player, year, set, parallel) independently of any user's collection. This means:
- Multiple users owning the same card share one canonical identity (dedup at the card level)
- Import matching works: parsed titles can be matched against the catalog
- A community card catalog builds over time from PSA lookups and manual entries
- `collection_cards` stores only what's unique per user: condition, grade, price paid, notes

### Why scrape BGS/SGC instead of using an official API?
Neither Beckett nor SGC has an official API. Scraping is fragile but the only option. Mitigations:
1. Cache all successful scrape results in Supabase (repeat lookups hit cache, not scraper)
2. Use CardGrade.io as fallback aggregator
3. Always offer manual entry as the ultimate fallback
4. Isolate scraping code in `lib/cert-lookup/` for easy updates when page structures change

### Why GPT-4o for OCR instead of a dedicated OCR service?
Slab labels have diverse layouts (PSA, BGS, SGC all different), varying angles, and potentially glare. GPT-4o's contextual understanding handles these cases better than pattern-based OCR. Cost is ~$0.02 per image — acceptable at MVP scale.

### Why require user review for imports?
GPT-4o parsing of eBay titles is ~80-90% accurate. An auto-save without review would create garbage data in the collection and destroy user trust. The review step is non-negotiable. The UX should make review fast (bulk confirm high-confidence items, only manually review low-confidence ones).

### Why Clerk over Supabase Auth?
Clerk provides a better out-of-the-box auth experience (social login, magic links, user management UI) with less configuration. The tradeoff is that Supabase RLS can't use `auth.uid()` directly since Clerk issues JWTs — handled by using the service role client on the server and treating RLS as a defensive secondary layer.

---

## 8. Data Model (Complete)

See `collectors_toolkit_product_spec.md` for the full SQL schema. Summary of key tables:

| Table | Purpose | Rows scale |
|-------|---------|-----------|
| `users` | Clerk user sync | 1 per user |
| `cards` | Canonical card catalog | Grows as users scan/add cards |
| `collection_cards` | User's card instances | N per user × cards |
| `graded_scans` | Scanner sessions | ~10/user/day max |
| `raw_grade_sessions` | AI grade sessions | ~10/user/day max |
| `import_batches` | Import sessions | ~5/user/day max |
| `import_items` | Individual parsed cards from imports | Up to 200/batch |
| `want_list` | User's hunt list | N per user |
| `card_sets` | Set definitions | Shared, grows over time |
| `collection_set_progress` | Per-user set progress | N sets per user |
| `usage_logs` | Rate limit tracking | ~20/user/day |

---

## 9. API Contract

### `POST /api/scanner/scan`
**Input:** `FormData { image: File }`
**Output:**
```typescript
{
  scanId: string
  imageUrl: string

  // OCR result (what GPT-4o read from image)
  ocrCertNumber: string | null
  ocrGradingCompany: string | null
  ocrConfidence: 'high' | 'medium' | 'low'

  // Cert lookup result (authoritative — from PSA API / BGS scrape / SGC scrape)
  certLookupSuccess: boolean
  certNumber: string | null
  gradingCompany: 'PSA' | 'BGS' | 'SGC' | 'UNKNOWN'
  itemStatus: string | null            // PSA: "Y" = valid cert

  // Card identity (from cert lookup)
  cardId: string | null                // canonical cards table id (if matched/created)
  cardPlayer: string | null            // PSA: Subject
  cardYear: number | null              // PSA: Year
  cardManufacturer: string | null      // PSA: Brand ("Panini", "Topps")
  cardSport: string | null             // PSA: Category ("Basketball")
  cardSet: string | null               // PSA: Brand/SetName
  cardParallel: string | null          // PSA: Variety
  cardNumber: string | null            // PSA: CardNumber

  // Grade details
  officialGrade: number | null         // PSA: CardGrade parsed to numeric (e.g., 9.0)
  gradeDescription: string | null      // PSA: GradeDescription ("Gem Mint", "Mint")
  qualifierCode: string | null         // PSA: qualifier ("OC", "MK", "ST") — display as "PSA 9 (OC)"
  autographGrade: number | null        // PSA: AutographGrade (for signed cards)
  isDualCert: boolean                  // PSA: IsDualCert

  // Population (snapshot at time of lookup)
  popAtGrade: number | null            // PSA: TotalPopulation
  popWithQualifier: number | null      // PSA: TotalPopulationWithQualifier
  popHigher: number | null             // PSA: PopulationHigher
  popCapturedAt: string | null         // ISO timestamp

  error?: string
}
```

### `POST /api/grader/grade`
**Input:** `FormData { image: File }`
**Output:**
```typescript
{
  sessionId: string
  imageUrl: string
  predictedGrade: number         // 1-10
  confidence: 'low' | 'medium' | 'high'
  centering: number
  corners: number
  edges: number
  surface: number
  conditionNotes: string
  submissionRecommended: boolean
  submissionRoiNotes: string
  error?: string
}
```

### `POST /api/import/parse`
**Input:** `FormData { source: string, file?: File, text?: string }`
**Output:**
```typescript
{
  batchId: string
  totalParsed: number
  totalMatched: number
  items: Array<{
    id: string
    rawTitle: string
    rawPrice: number | null
    rawDate: string | null
    parsedPlayer: string | null
    parsedYear: number | null
    parsedSet: string | null
    parsedGrade: string | null
    parsedCompany: string | null
    parseConfidence: 'high' | 'medium' | 'low'
    cardId: string | null
  }>
}
```

### `POST /api/collection`
**Input:**
```typescript
{
  cardId?: string
  cardPlayer: string
  cardYear?: number
  cardSet?: string
  cardParallel?: string
  sport?: string
  conditionType: 'raw' | 'graded'
  grade?: string
  gradingCompany?: string
  certNumber?: string
  purchasePrice?: number
  purchaseDate?: string
  purchaseSource?: string
  imageUrl?: string
  scanId?: string
  gradeSessionId?: string
  importItemId?: string
  notes?: string
}
```

### `GET /api/portfolio`
**Output:**
```typescript
{
  totalCards: number
  totalCostBasis: number
  totalCurrentValue: number
  unrealizedGain: number
  unrealizedGainPct: number | null
  bySport: Array<{ sport: string, count: number }>
  byGrade: Array<{ grade: string, count: number }>
  byCompany: Array<{ company: string, count: number }>
  topCards: Array<{ id, player, grade, currentValue }>
  recentCards: Array<{ id, player, grade, createdAt }>
}
```

---

## 10. Build Spec: File Structure

```
collectors-toolkit/
├── app/
│   ├── layout.tsx                    # ClerkProvider + global nav
│   ├── page.tsx                      # Dashboard / landing
│   ├── scanner/
│   │   ├── page.tsx                  # Scanner tool
│   │   └── history/page.tsx          # Past scans
│   ├── grader/
│   │   ├── page.tsx                  # Raw card grader
│   │   └── history/page.tsx          # Past grade sessions
│   ├── collection/
│   │   ├── page.tsx                  # Collection grid/list
│   │   ├── add/page.tsx              # Manual add card
│   │   ├── [id]/page.tsx             # Card detail + edit
│   │   └── import/
│   │       ├── page.tsx              # Import hub (choose source)
│   │       └── [batchId]/
│   │           ├── page.tsx          # Import review table
│   │           └── success/page.tsx  # Import success
│   ├── portfolio/page.tsx            # Portfolio dashboard
│   ├── wantlist/page.tsx             # Want list
│   └── sets/
│       ├── page.tsx                  # Set list + add set
│       └── [setId]/page.tsx          # Set checklist detail
│
├── api/
│   ├── scanner/scan/route.ts
│   ├── grader/grade/route.ts
│   ├── collection/
│   │   ├── route.ts                  # GET list, POST create
│   │   └── [id]/route.ts             # GET, PUT, DELETE
│   ├── portfolio/route.ts
│   ├── wantlist/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   ├── sets/
│   │   ├── route.ts
│   │   └── [setId]/progress/route.ts
│   ├── cards/search/route.ts
│   └── import/
│       ├── parse/route.ts
│       └── [batchId]/save/route.ts
│
├── components/
│   ├── ImageUpload.tsx               # Reusable upload + camera component
│   ├── ScanResult.tsx                # Scan result display + save flow
│   ├── GradeResult.tsx               # Grade display + sub-grades
│   ├── CardGrid.tsx                  # Collection grid
│   ├── CardListItem.tsx              # Collection list row
│   ├── GradeBadge.tsx                # Colored grade badge
│   ├── StatCard.tsx                  # Dashboard stat card
│   ├── ProgressBar.tsx               # Set completion progress
│   ├── ImportReviewTable.tsx         # Import review + edit
│   └── ConfirmModal.tsx              # Generic confirmation modal
│
├── lib/
│   ├── supabase.ts                   # Client + service role clients
│   ├── openai.ts                     # OpenAI client
│   ├── rate-limit.ts                 # Per-user daily limits
│   ├── card-catalog.ts               # findOrCreateCard() dedup logic
│   ├── cert-lookup/
│   │   ├── psa.ts                    # PSA official API
│   │   ├── bgs.ts                    # Beckett scraper
│   │   ├── sgc.ts                    # SGC scraper
│   │   └── index.ts                  # Unified lookupCert() with fallback
│   └── import/
│       ├── parse-ebay-csv.ts         # eBay CSV column mapping
│       ├── parse-fanatics.ts         # Fanatics CSV mapping
│       ├── parse-image.ts            # GPT-4o Vision import parser
│       ├── parse-text.ts             # GPT-4o text import parser
│       └── normalize.ts              # GPT-4o title → card identity
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql    # All tables (Week 1)
│       ├── 002_indexes.sql           # Performance indexes (Week 1)
│       ├── 003_card_sets.sql         # Set tracking tables (if added later)
│       └── 004_rls.sql               # Row Level Security (Week 8)
│
├── types/
│   └── index.ts                      # Shared TypeScript types
│
├── .env.local                        # (gitignored) real env vars
├── .env.example                      # Placeholder env vars for reference
└── README.md
```

---

## 11. Sprint Plan (8 Weeks)

### Sprint 1 (Week 1) — Foundation
**Goal:** Running, deployed app skeleton

| Task | Owner | Est |
|------|-------|-----|
| Next.js 15 project init with TS + Tailwind | Dev | 1h |
| Clerk integration + middleware + auth pages | Dev | 2h |
| Supabase project setup + service role client | Dev | 1h |
| DB migration 001 (all tables) | Dev | 2h |
| Supabase Storage buckets | Dev | 30m |
| Base layout (navbar, mobile bottom nav) | Dev | 3h |
| Dashboard page (logged in + logged out states) | Dev | 2h |
| Shared TypeScript types | Dev | 1h |
| lib/supabase.ts + lib/openai.ts + lib/rate-limit.ts | Dev | 2h |
| Vercel deploy + env vars | Dev | 1h |
| **Total** | | **~15h** |

---

### Sprint 2 (Weeks 2–3) — Graded Scanner
**Goal:** Scan a PSA/BGS/SGC slab → cert details → save to collection

| Task | Owner | Est |
|------|-------|-----|
| ImageUpload component (drag/drop + mobile camera) | Dev | 3h |
| Scanner page UI + loading states | Dev | 3h |
| PSA API wrapper (lib/cert-lookup/psa.ts) | Dev | 2h |
| GPT-4o OCR API route (POST /api/scanner/scan) | Dev | 3h |
| lib/card-catalog.ts (findOrCreateCard) | Dev | 2h |
| ScanResult component (display + save flow) | Dev | 4h |
| BGS scraper (lib/cert-lookup/bgs.ts) | Dev | 3h |
| SGC scraper (lib/cert-lookup/sgc.ts) | Dev | 3h |
| Unified cert lookup with fallback | Dev | 2h |
| Save to collection API + flow | Dev | 2h |
| Scanner history page | Dev | 2h |
| Rate limit UI on scanner page | Dev | 1h |
| **Total** | | **~30h** |

---

### Sprint 3 (Week 4) — Raw Card Grader
**Goal:** Photo of raw card → AI grade + sub-grades + submission recommendation

| Task | Owner | Est |
|------|-------|-----|
| Grader page UI + tips + disclaimer | Dev | 2h |
| GPT-4o grading prompt + API route | Dev | 3h |
| GradeResult component (grade circle, sub-grade bars, notes) | Dev | 4h |
| Low-confidence warning UI | Dev | 1h |
| Submission recommendation display + ROI text | Dev | 1h |
| Save grade session | Dev | 1h |
| Grade history page | Dev | 2h |
| Rate limit UI on grader page | Dev | 30m |
| **Total** | | **~15h** |

---

### Sprint 4 (Weeks 5–6) — Collection Manager
**Goal:** Manual add + collection grid + card detail + want list

| Task | Owner | Est |
|------|-------|-----|
| /collection/add form (all fields, toggles) | Dev | 4h |
| Player autocomplete (GET /api/cards/search) | Dev | 2h |
| POST /api/collection route | Dev | 2h |
| Collection page (grid + list view) | Dev | 4h |
| Collection filter bar + sort | Dev | 3h |
| GET /api/collection with filters | Dev | 2h |
| Card detail page (/collection/[id]) | Dev | 3h |
| Inline editing + value update | Dev | 2h |
| PUT + DELETE /api/collection/[id] | Dev | 1h |
| Want list page + API (CRUD) | Dev | 3h |
| **Total** | | **~26h** |

---

### Sprint 5 (Week 7) — Purchase Import
**Goal:** eBay CSV + screenshot + text paste → review → save to collection

| Task | Owner | Est |
|------|-------|-----|
| lib/import/parse-ebay-csv.ts (papaparse) | Dev | 3h |
| lib/import/parse-fanatics.ts | Dev | 1h |
| lib/import/parse-image.ts (GPT-4o Vision) | Dev | 2h |
| lib/import/parse-text.ts (GPT-4o text) | Dev | 1h |
| lib/import/normalize.ts (batch title parsing) | Dev | 3h |
| POST /api/import/parse route | Dev | 3h |
| Import hub page (4 source cards) | Dev | 3h |
| ImportReviewTable component (editable, selectable) | Dev | 4h |
| POST /api/import/[batchId]/save route | Dev | 2h |
| Import success page | Dev | 1h |
| **Total** | | **~23h** |

---

### Sprint 6 (Week 8) — Portfolio + Polish + Launch
**Goal:** Portfolio dashboard, set tracker, mobile polish, production deploy

| Task | Owner | Est |
|------|-------|-----|
| GET /api/portfolio (SQL aggregates) | Dev | 2h |
| Portfolio page (4 stat cards + charts with recharts) | Dev | 4h |
| Set completion tracker (/sets + /sets/[setId]) | Dev | 4h |
| Set API routes (CRUD + progress) | Dev | 2h |
| Mobile responsiveness pass (every page) | Dev | 4h |
| Empty states (every page) | Dev | 2h |
| Loading skeletons (every data page) | Dev | 2h |
| Error states + boundaries | Dev | 1h |
| Supabase RLS migration (004_rls.sql) | Dev | 1h |
| .env.example + README.md | Dev | 1h |
| Final smoke test + production deploy | Dev | 2h |
| **Total** | | **~25h** |

---

**Total estimated MVP effort: ~134 hours** (~17 days at 8h/day, or ~8 weeks at evenings/weekends)

---

## 12. V2 Roadmap (Post-MVP)

| Feature | Value | Effort | Priority |
|---------|-------|--------|----------|
| eBay Browse API — live sold comps on card detail | High | Medium | 1 |
| Price lookup tool (/tools/price-lookup) | High | Low | 2 |
| Want list price alerts via email (Resend) | High | Medium | 3 |
| Submission ROI calculator (/tools/submission-roi) | Medium | Low | 4 |
| Collection sharing (public /u/[username] page) | Medium | Medium | 5 |
| TCG support (Pokemon, MTG via tcgapi.dev) | High | High | 6 |
| Deal finder (underpriced eBay listings) | Medium | High | 7 |
| Mobile app (React Native / Expo) | High | Very High | 8 |

---

## 13. Open Questions

| # | Question | Decision needed by |
|---|----------|--------------------|
| Q1 | App name is "Collectors Toolkit" — is this final, or do we want something more brandable? | Before launch |
| Q2 | PSA API registration — have you applied for the free API token yet? (needed for Week 2) | Before Week 2 |
| Q3 | Will we use gpt-4o-mini for import text parsing to reduce cost, or always gpt-4o? | Week 7 |
| Q4 | Do we want a domain name / custom URL at launch, or just the Vercel subdomain? | Week 8 |
| Q5 | What's the upgrade path when PSA 100/day free limit isn't enough? (PSA paid plan is ~$0.01/call) | Post-launch |
| Q6 | Should BGS/SGC scraping be attempted synchronously (slow, might time out) or via a background job? | Week 3 |

---

## 14. Definition of Done (MVP)

The MVP is complete when all of the following are true:

- [ ] User can scan a PSA slab and get cert-verified card details (AC-01 through AC-10)
- [ ] User can grade a raw card photo and get AI sub-grades (AC-11 through AC-20)
- [ ] User can manually add a card to collection in under 30 seconds (AC-21 through AC-30)
- [ ] User can import eBay CSV + screenshot and save parsed cards (AC-31 through AC-41)
- [ ] Portfolio dashboard shows correct aggregates (AC-42 through AC-48)
- [ ] Want list and set tracker functional (AC-49 through AC-57)
- [ ] All pages are mobile-responsive
- [ ] All GPT-4o calls are rate-limited per user
- [ ] App is deployed to Vercel production with all env vars configured
- [ ] No route is accessible without Clerk authentication (except landing page)
- [ ] Smoke test passes: full golden path works end-to-end
