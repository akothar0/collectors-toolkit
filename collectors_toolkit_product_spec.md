# Collectors Toolkit — Product Spec & Roadmap

> This is the source-of-truth product document.  
> **Implementation reference for agents:** [`AGENTS.md`](AGENTS.md) · [`README.md`](README.md)

---

## What It Is

A set of AI-powered tools for sports card collectors. Not a marketplace. Not a price guide. Not a social network. The practical workbench a collector opens when they need to identify a card, understand its condition, track what they own, and know what it's worth.

**Stack:** Next.js 15 · TypeScript · Tailwind CSS · Clerk · Supabase · OpenAI GPT-4o · Vercel

---

## Why It's Different

| Differentiator | What we do | What competitors do |
|----------------|------------|---------------------|
| AI raw card grader | Photo → AI grade + sub-grades + submission ROI | Nobody does this well |
| Purchase import | eBay bookmarklet / screenshots / Fanatics PDF → parsed collection | Nobody does this |
| Free tier | Core tools free forever | CardHedger $49/mo, Market Movers subscription |
| Fast collection entry | Card added in under 30 seconds | Most tools take minutes |

---

## Feature Set

### MVP (Weeks 1–8) — shipped in repo

**1. Graded Card Scanner**
Scan a graded slab → cert lookup → card identity + grade + population data
- GPT-4o reads cert number from slab photo
- PSA API (100 free calls/day) for cert verification
- BGS scrape + SGC scrape for other companies
- Output: player, year, set, grade, pop at grade, pop higher
- Save directly to collection

**2. Raw Card AI Grader** — GPT-4o Vision with guided multi-photo capture
Upload photos → structured GPT-4o grading prompt → PSA + BGS + CGC predictions

CardGrade.io uses a vision model + prompts under the hood — we replicate the same output with a crafted GPT-4o prompt, saving $25/month and owning the full logic. Our real differentiator is the **guided photo UX**.

**Guided capture flow (1–4 images):**
- Step 1: Full front photo (centering + overall) — required
- Step 2: Back of card (back surface + centering) — recommended
- Step 3: Surface close-up with raking light (angled phone light reveals scratches invisible head-on) — optional
- Step 4: Corner close-up on any flagged corner — optional

**GPT-4o prompt encodes explicit PSA/BGS/CGC criteria**, returning:
- Overall grade + 4 sub-grades (centering, corners, edges, surface)
- **PSA prediction** (whole number) · **BGS prediction** (0.5 increments) · **CGC prediction**
- Which company to submit to (`submissionCompany`) — highlights which grades highest for this card's profile
- Submission ROI note (PSA economy ~$25, BGS ~$30, CGC ~$20)
- Confidence level (low/medium/high) based on image quality
- Plain-English condition notes — specific to what's visible, no fabrication

**Disclaimer:** "AI estimate only — not a professional grade. Results depend on photo quality."

**3. Collection Manager**
Track everything you own — fast
- Manual add in under 30 seconds
- Grid + list views, filters, sort
- Per-card detail page with inline editing, value tracking, provenance
- Status tracking: owned / sold / traded / lost (don't delete — track ROI history)

**4. Purchase Import (Differentiator)**
Four confirmed import methods based on how eBay and Fanatics actually work:

| Method | Source | How it works |
|--------|--------|-------------|
| **eBay Screenshots** | eBay Purchases page | Upload 1–10 screenshots; GPT-4o Vision reads titles+prices+dates from each row |
| **eBay Bookmarklet** | eBay Purchases page | JS bookmark we provide; user clicks it on eBay, it extracts DOM data and redirects to our review page |
| **Fanatics PDFs** | Fanatics order ↓ button | Each order downloads a PDF (confirmed format: `fanatics-collect-order-{id}-{date}.pdf`); upload 1 or more; GPT-4o reads line items |
| **Text Paste** | Any | Paste order confirmation email text; GPT-4o parses into card records |

eBay titles are data-dense: "2005 ACE AUTHENTIC GRAND SLAM CHAMPIONS JERSEY #GS-5 RAFAEL NADAL 276/500 PSA 9" — year, set, card#, player, serial, company, grade all in one title. Parsing accuracy ~90%+.

Always requires user review before saving. Bulk-confirm high-confidence rows with one click.

**5. Portfolio Dashboard**
Your collection's financial picture
- Total cards, cost basis, current value, unrealized gain/loss
- Breakdowns by sport, grade, grading company
- Top 5 most valuable cards
- Manual value updates (v1); live comps via eBay API (v2)

**6. Set Completion Tracker**
Track which cards in a set you own vs. need
- Define a set (name, year, sport, total cards)
- Toggle owned/needed per card number
- Progress bar + percentage complete

**7. Want List**
Cards you're hunting
- Add with target price + notes
- Mark as found → redirect to add-to-collection
- Price alerts via eBay (v2)

**8. Cross-Device QR Code Flow** — scan/grade on phone while on desktop
- "Use Phone Camera" button on scanner/grader pages shows a QR code
- QR code opens `collectokit.app/m/scan/{token}` on mobile (no login required — session token)
- User takes photo on phone → result appears on desktop in real time via Supabase Realtime
- Also works as a shareable link (user can text themselves the URL)
- Session tokens expire after 5 minutes (single use)

---

### V2 (Weeks 10–16)

**9. Price & Comp Lookup** — eBay Browse API integration: last 5 sold comps for any card
**10. Want List Price Alerts** — email notification when eBay listing hits target price
**11. Submission ROI Calculator** — detailed break-even analysis for PSA submission
**12. Collection Sharing** — public `/u/[username]` collection page
**13. TCG Support** — Pokemon, MTG, Yu-Gi-Oh via TCG API free tier (100-200 req/day)
**14. Deal Finder** — surface underpriced active eBay listings vs comps

---

## API Research Summary

| Data Need | Solution | Cost |
|-----------|----------|------|
| PSA cert verification | PSA official API (`api.psacard.com/publicapi/`) | **Free: 100 calls/day** |
| PSA population report | PSA `GetPSASpecPopulation/{specID}` (v2) | Same 100/day budget |
| BGS cert verification | Scrape `beckett.com/grading/card-lookup` | Free (scraping) |
| SGC cert verification | Scrape `gosgc.com/cert-code-lookup` | Free (scraping) |
| Cert lookup fallback | CardGrade.io cert tool (fallback only) | Free on web, API = grading only |
| Cert# OCR from slab photo | GPT-4o Vision | ~$0.01-0.02 per scan |
| Raw card grading | GPT-4o Vision (already in stack) | ~$0.02–0.08 per session (4 images × $0.005–0.02 each) |
| Import parsing (screenshots, PDFs, text) | GPT-4o Vision + GPT-4o-mini | ~$0.001-0.02 per batch |
| Live price comps (v2) | eBay Browse API | **Free: ~5,000 req/day** |
| TCG prices (v2) | TCG API (tcgapi.dev) | **Free: 100 req/day** |
| Real-time price feed | CardHedger API | $49/month — skip for now |

**Bottom line:** v1 is ~$5-20/month OpenAI total. No CardGrade.io needed — GPT-4o handles grading directly.

### CardGrade.io (documented, not used in v1)
CardGrade.io almost certainly uses a vision model + prompt engineering under the hood. We replicate the same output with GPT-4o directly. CardGrade.io is available as a v2 upgrade path if grading quality needs improvement, but start without it.

### PSA API Field Mapping (OAS 2.0 — confirmed from official Swagger docs)

The PSA API has two useful endpoints:

**`GET /publicapi/cert/GetByCertNumber/{certNumber}`** → returns `PublicPSACert`

| PSA Field | Our Field | Notes |
|-----------|-----------|-------|
| `Subject` | `cards.player` | e.g., "LeBron James" |
| `Year` | `cards.year` | String → parse to int |
| `Brand` | `cards.manufacturer` | "Panini", "Topps", "Upper Deck" |
| `Category` | `cards.sport` | "Basketball", "Baseball", etc. |
| `CardNumber` | `cards.card_number` | "269", "RC-14", etc. |
| `Variety` | `cards.parallel` | "Silver Prizm", null = base |
| `SpecID` | `cards.psa_spec_id` | ⭐ Store this — enables population report |
| `CardGrade` | `graded_scans.official_grade` | Parse "9" → 9.0 numeric |
| `GradeDescription` | `graded_scans.grade_description` | "Gem Mint", "Mint", "Near Mint-Mint" |
| `TotalPopulation` | `graded_scans.pop_at_grade` | Population AT this grade |
| `TotalPopulationWithQualifier` | `graded_scans.pop_with_qualifier` | Includes OC/MK/ST qualified slabs |
| `PopulationHigher` | `graded_scans.pop_higher` | Count graded higher than this |
| `AutographGrade` | `graded_scans.autograph_grade` | Separate auto grade for signed cards |
| `IsDualCert` | `graded_scans.is_dual_cert` | Card + auto in same slab |
| `ItemStatus` | `graded_scans.item_status` | "Y" = valid — check before trusting |
| `IsPSADNA` | — | DNA cert, not a card — reject |

**PSA Grade Qualifiers** — PSA appends a code when a card has a noted defect:
- `OC` = Off-Center
- `MK` = Mark
- `ST` = Stain
- `OF` = Out of Focus
- `PD` = Print Defect
Display format: "PSA 9 (OC)" — store `qualifier_code` separately from numeric `grade`.

**`GET /publicapi/pop/GetPSASpecPopulation/{specID}`** → full grade distribution (v2 feature)
Returns count at every grade (1–10) + qualifier variants. Use `psa_spec_id` from cert lookup.
Shows users: "47 graded PSA 10, 312 graded PSA 9, 201 graded PSA 8…"

---

## Data Model (Key Tables)

### `cards` — Canonical card identity (shared across all users)
```
id, player, year, sport, manufacturer, set_name, set_series, card_number, variation, parallel,
is_rookie, is_autograph, is_patch, is_memorabilia, print_run,
source, source_id, psa_spec_id,   ← store PSA SpecID for population report lookups
created_at, updated_at
UNIQUE NULLS NOT DISTINCT (player, year, set_name, card_number, parallel)
```
**Grade does NOT live here.** `cards` is a reference catalog — identity facts printed on the card that never change regardless of condition. `psa_spec_id` (from PSA `SpecID` field) enables population report calls in v2.

### `collection_cards` — User's physical card instances
```
id, user_id, card_id (fk cards — nullable),
override_player, override_year, override_set_name, override_parallel, override_card_number, sport,
condition_type (raw|graded),
grade numeric(3,1),           ← numeric for sort/filter; 9.5 not "9.5"
grade_description,            ← "Gem Mint" | "Mint" etc. from PSA (display only)
qualifier_code,               ← "OC" | "MK" | "ST" | null — display as "PSA 9 (OC)"
grading_company, cert_number,
autograph_grade numeric(3,1), ← separate auto grade for signed cards
sub_grades jsonb,             ← {"centering":9,"corners":9.5,"edges":9,"surface":9}
pop_at_grade, pop_higher, pop_captured_at,
purchase_price, purchase_date, purchase_source, purchase_url,
current_value, value_updated_at, value_source (manual|ebay_api|cardhedger),
front_image_url, back_image_url,   ← legacy sync; first two gallery slots
scan_id (fk graded_scans), grade_session_id (fk raw_grade_sessions), import_item_id (fk import_items),
status (owned|sold|traded|lost), sold_price, sold_date, sold_to,
notes, created_at, updated_at
```

### `collection_card_images` — Per-card photo gallery (up to 10)
```
id, collection_card_id (fk), user_id (fk), image_url, position (0-based), created_at
UNIQUE (collection_card_id, position)
```
Server writes via `@/lib/collection-photos.ts`; RLS deny-all (service role only).

### `card_sets` + `collection_set_progress` — Set tracker
```
card_sets: id, name, year, sport, total_cards, created_by, created_at
collection_set_progress: user_id, set_id, cards_owned_count, card_checklist (jsonb), updated_at
```

### `graded_scans` — Scanner sessions
```
id, user_id, image_url,
ocr_cert_number, ocr_grading_company, ocr_confidence,   ← what GPT-4o read
cert_number, grading_company, card_id,                   ← verified via API/scrape
official_grade numeric(3,1), grade_description,          ← PSA CardGrade + GradeDescription
qualifier_code,                                          ← PSA qualifier (OC, MK, ST)
autograph_grade numeric(3,1),                            ← PSA AutographGrade
pop_at_grade, pop_with_qualifier, pop_higher, pop_captured_at,
is_dual_cert boolean, item_status,                       ← PSA IsDualCert + ItemStatus
lookup_source (psa_api|beckett_scrape|sgc_scrape|cardgrade_io|failed),
raw_cert_response jsonb, created_at
```

### `raw_grade_sessions` — AI grading sessions
```
id, user_id, image_url, card_id,
predicted_grade numeric(3,1),
sub_centering, sub_corners, sub_edges, sub_surface (each numeric(3,1)),
confidence (low|medium|high), condition_notes,
submission_recommended boolean, submission_roi_notes,
raw_ai_response jsonb, created_at
```

### `import_batches` + `import_items` — Purchase imports
```
import_batches: id, user_id, source, file_url, raw_content, total_parsed, total_matched, total_saved,
  status (pending|reviewing|saved|abandoned), created_at
import_items: id, batch_id, user_id, raw_title, raw_price numeric(10,2), raw_date, raw_source,
  parsed_player, parsed_year, parsed_set, parsed_grade numeric(3,1), parsed_company, parsed_parallel,
  parse_confidence, card_id, review_status (pending|confirmed|skipped|edited), collection_card_id
```

---

## Feasibility Notes

**Easy:**
- Scaffold + auth (Clerk is excellent)
- PSA API integration (clean official API)
- GPT-4o OCR for cert numbers (high-contrast slab labels = very reliable)
- Collection CRUD
- eBay CSV parsing (fixed format)
- Portfolio SQL aggregates

**Harder than it looks:**
- BGS/SGC scraping: may need headless browser (Playwright). Plan for this to be fragile.
- AI grading accuracy: highly dependent on photo quality. Strong UX guidance is critical.
- Import parsing: eBay titles are messy. GPT-4o handles well but ~80-90% accuracy. User review is non-negotiable.
- Screenshot import: Small text can fool GPT-4o Vision. Prompt users to zoom before screenshotting.
- Canonical card dedup: fuzzy matching across (player, year, set, parallel). Use normalized strings + UNIQUE constraint.

**Explicitly not in MVP:**
- Real-time price data
- Push notifications / email alerts
- Social features
- Native mobile app
- TCG categories

---

## Build Timeline

### Phase 1 — Foundation (Week 1) ✅
Scaffold, auth, DB schema, base UI, Vercel deploy

### Phase 2 — Graded Scanner (Weeks 2–3) ✅
Week 2: GPT-4o OCR + PSA API + image upload  
Week 3: BGS scrape + cert fallback + scanner results + save to collection

### Phase 3 — Raw Card Grader (Week 4) ✅
GPT-4o grading prompt + grade results UI + confidence display + `/grader/history`

### Phase 4 — Collection Manager (Weeks 5–6) ✅
Week 5: Manual add + collection grid + filters  
Week 6: Card detail + edit + want list + multi-photo gallery (`006_collection_card_images`)

### Phase 5 — Purchase Import (Week 7) ✅
Screenshot parser + bookmarklet + Fanatics PDF + text paste + review UI + save flow

### Phase 6 — Portfolio + Polish (Week 8) ✅
Portfolio dashboard (`/portfolio`) + set tracker (`/sets`) + RLS (`007_rls_sets`)

### Phase 7 — V2: Price Data (Weeks 10–12)
eBay Browse API + price lookup tool + want list price alerts

### Phase 8 — V2: Advanced Tools (Weeks 13–16)
Submission ROI calculator + collection sharing + TCG support + deal finder

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| BGS/SGC scraping breaks | Medium | Cache all results; CardGrade.io fallback; manual entry always available |
| AI grading accuracy poor | High (trust) | Prominent disclaimer; confidence level; call it "estimate" everywhere |
| PSA 100/day limit hit | Low initially | Cache cert lookups; 100/day = 10 users × 10 scans = fine for MVP |
| eBay CSV format changes | Low | Parser is isolated; easy to update; user can always manual-enter |
| Import parsing wrong | Medium | User review required before any save; never auto-import |
| OpenAI costs spike | Medium | Rate limit: 10 scans + 10 grades/user/day; gpt-4o-mini for text |
| Cert lookup returns wrong card | Low | Show raw result + allow user to edit before saving |
