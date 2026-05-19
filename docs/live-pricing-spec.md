# Live Pricing Spec

Last updated: 2026-05-18

## 1. Executive Summary

Collectors Toolkit should add a live-pricing subsystem that surfaces recent eBay sold comps across collection detail, portfolio, want list, and scanner flows without blocking the core app on one vendor. The safest v1 architecture is a hybrid model: a nightly Railway worker refreshes cached market data for portfolio, collection, and want list surfaces, while scanner results may trigger an on-demand comp lookup because they need immediate output. Official eBay sold-history access is the main dependency risk: Browse API access is relatively easy once the developer account is approved, but official sold-comp access is materially harder, so v1 should be built around a provider adapter with eBay-first and fallback-provider support.

## 2. Data Sources Comparison

### Summary

| Source | Coverage | Cost | Freshness | Complexity | Notes |
| --- | --- | --- | --- | --- | --- |
| eBay Browse API | Active listings only, not sold-history | Free default quota | Near real time | Medium | Good for search, bad for sold comps. Uses app-level OAuth application token. |
| eBay Marketplace Insights API | Official sold-history up to 90 days | Free if approved | High | High | Best official fit for sold comps, but Buy API production access is restricted and this API has historically been limited release. |
| eBay Finding API `findCompletedItems` / `completedItems` | Legacy sold/completed listing search | Free | Historically high | Medium to High | Historically supported keyword-driven completed-item queries, but it is legacy and not a stable foundation for a new build. |
| SportsCardsPro API | Sports-card specific current values by raw/graded conditions | Paid subscription | Daily | Low to Medium | Easiest card-specific integration, but API exposes current values, not raw sold-sale histories; public-display rights are constrained. |
| 130point | Strong hobby mindshare for sold comps | No public API surfaced | Unknown | High | No public developer API found; likely scraper-only path, unsuitable as a core app dependency. |
| CollectAPI | Generic API marketplace | Varies by package | Varies | Medium | Public docs show a marketplace/token platform, but no clearly documented sports-card sold-comp product surfaced in research. |
| Unofficial scraper vendors such as SoldComps / Apify actors | eBay sold listings and comp summaries | Paid, often usage-based; some offer trials | High | Low to Medium | Useful as a bridge if official eBay sold access is blocked, but carries ToS, reliability, and vendor-risk concerns. |

### Recommendation by source

1. Preferred official path: `eBay Marketplace Insights API` for sold comps, if production access is granted.
2. Preferred near-term fallback: an unofficial sold-comps provider with a short trial or low initial spend, behind an adapter so it can be removed later.
3. Avoid as primary source: `Browse API` alone, because it does not solve sold-history.
4. Avoid as primary source: `SportsCardsPro` for publicly rendered live comps, because the API is current-value oriented and its terms restrict public-facing redistribution without permission.
5. Do not build around: `130point` or `CollectAPI` unless a concrete, documented, contractually usable endpoint is identified.

### Practical answer: how easy is “raw eBay API” access?

There are two different access questions:

1. `Easy`: getting an eBay developer account, keyset, and app-level OAuth token for search-oriented APIs such as Browse.
2. `Not easy`: getting a reliable official sold-history API that can power “last 3 sold comps” in production.

The likely outcome is:

- Tomorrow’s approval is enough to start Browse-based experiments and token plumbing.
- It may still not be enough to ship official sold comps if Marketplace Insights or equivalent sold-history access is not enabled.
- Therefore the architecture should assume “eBay credentials approved” and “official sold-history approved” are separate gates.

## 3. Recommended Architecture

### Recommendation

Use a `provider adapter + normalized price cache + nightly worker` architecture.

- `Railway worker` performs scheduled refreshes for collection cards, want-list items, and portfolio aggregates.
- `On-demand lookup` is allowed for scanner results and cold-cache card detail views because those surfaces are user-triggered and immediate.
- `Supabase` stores normalized historical snapshots and top comparable sales.
- Existing `collection_cards.current_value`, `value_updated_at`, and `value_source` remain the denormalized latest projection used by portfolio queries.
- No per-user eBay OAuth is required in v1. Use a single app-level token for provider calls.

### Why this is the right shape

- It matches the product requirement for 30 to 90 day history and sparklines.
- It avoids quota waste by deduplicating identical cards across users into canonical search keys.
- It preserves the existing portfolio pipeline, which already reads `collection_cards.current_value`.
- It allows the pricing backend to swap providers without rewriting UI code.
- It gives scanner results an immediate path without forcing the rest of the app into request-time third-party calls.

### ASCII diagram

```text
                             +----------------------+
                             |  Railway Nightly Job |
                             |  refresh candidates  |
                             +----------+-----------+
                                        |
                                        v
+------------------+          +---------+----------+          +----------------------+
| collection_cards |--------->| canonical key build |<---------| want_list            |
| graded_scans     |          | query + fingerprint  |          | recent scanner lookups|
+--------+---------+          +---------+----------+          +----------+-----------+
         |                               |                                |
         |                               v                                |
         |                    +----------+-----------+                    |
         |                    | provider adapter      |                    |
         |                    | ebay / fallback API   |                    |
         |                    +----------+-----------+                    |
         |                               |                                |
         |                               v                                |
         |                    +----------+-----------+                    |
         |                    | price_snapshots      |                    |
         |                    | price_comparables    |                    |
         |                    +----------+-----------+                    |
         |                               |                                |
         v                               v                                v
+--------+---------+          +---------+----------+          +----------+-----------+
| collection detail|          | portfolio current  |          | want list trend UI   |
| scanner comps UI |          | value + sparklines |          | eBay link + comps    |
+------------------+          +--------------------+          +----------------------+
```

### On-demand vs scheduled

#### Option A: fully on-demand

Pros:

- Simplest first implementation.
- Always fresh at the moment of view.
- Avoids refreshing cards users never look at.

Cons:

- Slow card-detail and scanner experiences.
- Harder quota control under burst traffic.
- Poor fit for portfolio totals and want-list sparklines.
- Repeats identical provider queries across users unless aggressively cached.

#### Option B: fully scheduled

Pros:

- Predictable quota usage.
- Fast UI reads.
- Strong fit for portfolio and trend charts.

Cons:

- Cannot satisfy scanner “show comps after lookup” without a wait-until-tonight gap.
- Newly added cards may show blank until next job.
- More moving pieces up front.

#### Recommended v1: hybrid scheduled-first

- `Nightly scheduled refresh` for collection, portfolio, and want list.
- `On-demand refresh` only for:
  - scanner result pages
  - collection detail when no snapshot exists yet
  - optional future “Refresh now” action

This keeps the system cheap and predictable while still satisfying the scanner requirement.

## 4. Database Schema Changes (SQL)

### Rationale

The existing schema already has:

- `collection_cards.current_value`
- `collection_cards.value_updated_at`
- `collection_cards.value_source`
- `collection_cards.pop_at_grade`
- `collection_cards.pop_higher`
- `collection_cards.pop_captured_at`

That means v1 does not need to replace current portfolio logic. Instead:

- add normalized pricing history tables
- keep `collection_cards.current_value` as the latest market projection
- optionally attach the latest snapshot ID for traceability

### Recommended schema

```sql
create table price_reference_keys (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  source text not null,
  marketplace text not null default 'EBAY_US',
  sport text,
  year int,
  player text,
  set_name text,
  parallel text,
  card_number text,
  rookie boolean,
  condition_bucket text not null, -- raw | graded
  grading_company text,
  grade numeric(3,1),
  query_text text not null,
  exclude_terms text[] not null default '{}',
  category_hint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_price_reference_keys_marketplace
  on price_reference_keys (marketplace, source);

create table price_snapshots (
  id uuid primary key default gen_random_uuid(),
  reference_key_id uuid not null references price_reference_keys(id) on delete cascade,
  source text not null,
  snapshot_date date not null default current_date,
  queried_at timestamptz not null default now(),
  stale_after timestamptz not null,
  window_days int not null default 30,
  currency text not null default 'USD',
  avg_sale_price numeric(10,2),
  median_sale_price numeric(10,2),
  min_sale_price numeric(10,2),
  max_sale_price numeric(10,2),
  sample_size int not null default 0,
  trend_7d numeric(10,2),
  trend_30d numeric(10,2),
  trend_90d numeric(10,2),
  latest_sale_at timestamptz,
  confidence_score numeric(4,3),
  confidence_label text,
  valuation_eligible boolean not null default false,
  raw_response jsonb,
  created_at timestamptz not null default now(),
  unique (reference_key_id, source, snapshot_date)
);

create index idx_price_snapshots_reference_key
  on price_snapshots (reference_key_id, queried_at desc);

create table price_comparables (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references price_snapshots(id) on delete cascade,
  source_item_id text,
  title text not null,
  item_url text,
  image_url text,
  sale_date timestamptz,
  sale_price numeric(10,2),
  shipping_price numeric(10,2),
  total_price numeric(10,2),
  currency text not null default 'USD',
  listing_format text,
  condition_label text,
  grading_company text,
  grade numeric(3,1),
  cert_number text,
  similarity_score numeric(4,3),
  exact_grade_match boolean not null default false,
  exact_company_match boolean not null default false,
  matched_fields jsonb,
  mismatch_flags text[] not null default '{}'
);

create index idx_price_comparables_snapshot
  on price_comparables (snapshot_id, similarity_score desc);

alter table collection_cards
  add column price_reference_key_id uuid references price_reference_keys(id),
  add column latest_price_snapshot_id uuid references price_snapshots(id),
  add column market_price_sample_size int,
  add column market_price_confidence text;

alter table want_list
  add column price_reference_key_id uuid references price_reference_keys(id),
  add column latest_price_snapshot_id uuid references price_snapshots(id);
```

### Projection rules

Nightly or on-demand refresh writes:

- `collection_cards.current_value = price_snapshots.avg_sale_price` only when `valuation_eligible = true`
- `collection_cards.value_updated_at = price_snapshots.queried_at`
- `collection_cards.value_source = price_snapshots.source`
- `collection_cards.latest_price_snapshot_id = price_snapshots.id`
- `collection_cards.market_price_sample_size = price_snapshots.sample_size`
- `collection_cards.market_price_confidence = price_snapshots.confidence_label`

If `sample_size < 3` or confidence is below threshold:

- still store the snapshot and comparable sales
- do **not** overwrite `current_value` with a weak estimate
- show `—` for the estimate in the UI

### Why not the other cache options?

#### Option B: price columns only on `collection_cards`

Rejected as the primary design because it cannot support:

- 30 to 90 day history
- sparklines
- reusing identical market data across users
- storing top comparable sales
- tracing how a value was derived

#### Option C: Vercel Edge Config or KV

Rejected as the primary store because:

- the app already uses Supabase as the durable system of record
- history and relational joins belong in Postgres
- Railway nightly jobs can write directly into Supabase
- KV may still be added later for hot-cache request dedupe, but it should not own the pricing record

## 5. API Integration Plan

### Provider strategy

Implement an internal provider abstraction:

```ts
type PriceProvider = {
  name: 'ebay_marketplace_insights' | 'ebay_legacy_completed' | 'soldcomps' | 'sportscardspro';
  fetchComparables(input: PriceQuery): Promise<NormalizedPriceResult>;
};
```

The app should never let UI routes talk directly to eBay- or vendor-specific response shapes.

### Official eBay paths

#### Preferred official path

- Use the official sold-history endpoint if Marketplace Insights access is granted.
- Expected auth shape: app-level OAuth application token.
- No user-level OAuth flow is needed for search/sold-comp retrieval.

#### Secondary official path

- Treat Browse API as a support API only:
  - category discovery
  - item lookup by legacy ID
  - marketplace metadata
- Do not use Browse API by itself as the sold-comp engine.

#### Legacy path

- `findCompletedItems` / `completedItems` is legacy.
- Historically it supported keyword-driven completed-item searches, including condition-style filters.
- Because it is legacy and current production viability is unclear, it should be considered an opportunistic fallback, not the default architecture.

### OAuth

Use the eBay `client_credentials` flow with one app-level credential set:

- store key material only in server-side env vars
- mint an application token on the server or worker
- cache the token in memory until close to expiry
- rotate when less than 10 minutes remain

No per-user tokens are recommended because:

- the pricing use case is app-owned search data, not private user eBay data
- it avoids user-consent friction
- it simplifies security and support

### Query template

#### Canonical graded query

Example:

```text
2011 Topps Update Mike Trout US175 PSA 9 RC
```

#### Canonical raw query

Example:

```text
2011 Topps Update Mike Trout US175 RC
```

#### Field priority

1. `year`
2. `set_name`
3. `player`
4. `card_number` when known and non-noisy
5. `parallel` when present
6. `grading_company + grade` for graded cards only
7. `rookie / RC` only if the card is actually a rookie and the source record knows it
8. `sport` only for ambiguity reduction

#### Exclusions

Append negative filters or post-filter out rows containing:

- `lot`
- `reprint`
- `custom`
- `digital`
- `case break`
- `repack`
- `sticker` unless the card itself is a sticker issue
- mismatched grade/company tokens for graded searches

#### Post-filtering rules

Normalize titles and score against the expected card:

- exact set + player + year match: strong positive
- exact grade and grading company match: strong positive
- same card but different grade: usable comparable, not valuation-grade
- same player/set but missing card number: weak comparable
- obvious lot/reprint/multi-card bundle: reject

### Normalized result contract

```ts
type ComparableSale = {
  title: string;
  itemUrl: string | null;
  imageUrl: string | null;
  saleDate: string | null;
  salePrice: number | null;
  shippingPrice: number | null;
  totalPrice: number | null;
  currency: 'USD';
  gradingCompany: string | null;
  grade: number | null;
  similarityScore: number;
  exactGradeMatch: boolean;
  mismatchFlags: string[];
};

type PriceSnapshot = {
  source: string;
  queriedAt: string;
  staleAt: string;
  avgSalePrice: number | null;
  medianSalePrice: number | null;
  sampleSize: number;
  trend7d: number | null;
  trend30d: number | null;
  trend90d: number | null;
  confidenceLabel: 'high' | 'medium' | 'low' | 'insufficient';
  valuationEligible: boolean;
  lastSaleDate: string | null;
  comparables: ComparableSale[];
};
```

### Error handling

Provider errors must map into stable app states:

| Condition | App behavior |
| --- | --- |
| `401/403` provider auth issue | Mark provider unavailable, preserve existing cached values, log alert |
| `429` rate limit | Back off, reschedule lower-priority jobs, serve cached snapshots |
| `5xx` provider outage | Serve cached data, mark snapshot stale |
| `0 results` | Save empty snapshot with `sample_size = 0` |
| `1-2 results` | Save comparables, set `valuation_eligible = false`, show `—` estimate |
| parsing/match ambiguity | Save weak-confidence snapshot and mismatch flags |

## 6. Caching & Refresh Strategy

### Staleness windows

| Surface | Refresh policy |
| --- | --- |
| Portfolio | nightly |
| Want list | nightly |
| Collection detail | use cache; refresh on view only if no snapshot exists or cache is older than 24 hours |
| Scanner result | on-demand at lookup time |

### Daily history

Persist one normalized snapshot per `reference_key + source + day`.

This supports:

- 30 day trend
- 90 day trend
- sparklines
- historical auditing when users question a value

### Priority queue

The worker should rank refreshes by score:

```text
priority_score =
  (estimated_card_value * 0.45) +
  (recent_user_interest * 0.25) +
  (want_list_active_boost * 0.15) +
  (staleness_hours * 0.10) +
  (scanner_recent_boost * 0.05)
```

Implementation notes:

- `estimated_card_value`: current market value if known, else purchase price
- `recent_user_interest`: detail page views, scanner usage, or recent edits if instrumented later
- `want_list_active_boost`: prioritize cards users are trying to buy now
- `scanner_recent_boost`: recent cert lookups should stay warm

### Quota management

Assume default official eBay limits until approved otherwise:

- Browse API: 5,000 calls per day
- Marketplace Insights API: 5,000 calls per day
- OAuth client-credentials token minting: 1,000 requests per day

Controls:

1. Deduplicate by `price_reference_keys.fingerprint`, not by user-owned card row.
2. Do not refresh a key more than once per 24 hours unless it is a scanner lookup.
3. Cap nightly refresh count by remaining daily quota.
4. Drop low-priority keys first when quota is tight.
5. Persist provider response hashes so identical results do not cause unnecessary rewrites.

### Free-trial / low-cost bridge

If official sold-history access is not available tomorrow:

1. Use an unofficial provider that offers a free trial or minimal pay-as-you-go entry.
2. Keep it behind the same `PriceProvider` adapter.
3. Store the provider name on every snapshot.
4. Make the exit plan explicit: switch provider, keep schema, preserve history.

This keeps the app moving without baking a short-term vendor into the product model.

## 7. UI Integration Points

### Common UI rules

- Always show `Last updated`.
- Show source badge, for example `eBay sold comps`.
- Show `—` when estimate confidence is insufficient.
- Show the last 3 comparable sales even when the estimate is hidden.
- Label weak matches clearly: `Exact grade`, `Same card, different grade`, `Partial match`.

### Collection card detail page

Render a market card below the card identity block:

- headline: `Last 30-day eBay sold average`
- sublabel: `PSA 9`, `Raw`, or `BGS 9.5` depending on the card
- primary value:
  - `avgSalePrice` when `valuationEligible = true`
  - `—` otherwise
- metadata:
  - `sampleSize`
  - `trend30d`
  - `lastSaleDate`
  - `source`
- expandable comparable list:
  - 3 most relevant sales
  - sale date
  - total price
  - link to the original eBay item

### Portfolio page

Use market pricing for `Current Value` only when a card has an eligible valuation.

Recommended portfolio behavior:

- `Current Market Value`: sum of cards with `valuationEligible = true`
- `Coverage`: `priced_cards / total_cards`
- `Unpriced cards`: count of cards with insufficient comps

This is more honest than silently substituting purchase price into a market-value metric.

If the product wants continuity with the current UI, a secondary metric can remain:

- `Cost Basis`: sum of `purchase_price`

For sparklines:

- show 30 day sparkline on portfolio overview later if enough historical coverage exists
- v1 can begin with want-list sparklines only if implementation time is tight

### Want list items

Each want-list row should show:

- `trend30d`
- sparkline from the last 30 to 90 daily snapshots
- latest average price if enough comps exist
- existing eBay search link
- low-liquidity message when `sampleSize < 3`

Example states:

- `Price trend: up $40 in 30 days`
- `Not enough recent comps for an estimate`

### Scanner result

After cert lookup, run immediate comp fetch using the detected grade and grading company.

Show:

- `Last 3 sold comps`
- average price when `sampleSize >= 3`
- sale dates
- links to source listings
- confidence label if any comp is not an exact grade/company match

This surface should tolerate slower provider calls than other pages because the user just initiated the scan.

## 8. Risks & Open Questions

### Major risks

1. `eBay ToS / display restrictions`
   - The eBay API License Agreement restricts use or display of derivative information such as average selling price for an eBay category without express written permission.
   - The legal question is whether per-card averages shown inside a collection app are acceptable under granted API rights or require explicit approval.
   - Recommendation: treat this as a launch gate and get a written answer from eBay or legal review before public release.

2. `Official sold-history access may not be granted`
   - Browse access alone is not enough.
   - Mitigation: provider adapter + fallback vendor.

3. `Low-liquidity cards`
   - Some vintage, low-pop, or obscure parallels will have 0 to 2 recent comps.
   - Recommendation: show comparable sales when available, but keep the estimate as `—`.

4. `Raw vs graded valuation mismatch`
   - Raw cards should be valued from raw comps only in v1.
   - Do not derive graded-like value from AI grader results in v1.

5. `Third-party licensing`
   - SportsCardsPro terms restrict public-facing redistribution without written permission.
   - Unofficial vendors may have their own scraping or sublicensing risk.

6. `Portfolio undercoverage`
   - If many cards remain unpriced, users may perceive the portfolio as incomplete.
   - Mitigation: show explicit coverage percentage.

### Open questions

1. Should the app show a manual “Refresh comps” action on the card detail page in v1, or keep refresh fully automatic?
2. Should portfolio totals exclude unpriced cards entirely, or show both `market-covered total` and `all-card count`?
3. Should cards with only partial-match comps show a min/max range instead of `—`, or stay estimate-free in v1?
4. Is PSA population data required for initial launch, or can it ship as supporting context later?

### PSA population report

Current research supports:

- PSA has a public population-report site with daily-updated counts.
- No stable official public PSA developer API was surfaced in this research set.

Recommendation:

- Keep `pop_at_grade`, `pop_higher`, and `pop_captured_at` as optional enrichment fields.
- If needed, use a pragmatic unofficial ingestion path later, but do not block live-pricing v1 on pop automation.
- If population data is shown, label it clearly as `PSA population report` with capture date.

## 9. Estimated Effort

| Area | Effort | Notes |
| --- | --- | --- |
| Provider adapter and normalization layer | M | One provider is moderate; multiple providers add testing and edge cases. |
| eBay auth and token handling | S | App-level OAuth is straightforward once credentials exist. |
| Official sold-history integration | M to L | Depends on approval status and endpoint quality. |
| Fallback provider integration | S to M | Usually easier technically, riskier contractually. |
| Database tables and projections | M | New tables plus backfill/projection wiring. |
| Nightly Railway worker | M | Scheduling, batching, retries, quota awareness. |
| Scanner on-demand comps | S to M | Smaller surface but requires fast provider path. |
| Collection detail UI | S | Mostly rendering normalized snapshot data. |
| Portfolio market-value update | M | Needs careful coverage and aggregate semantics. |
| Want-list sparkline/history | M | Requires historical query and chart integration. |
| QA, confidence tuning, and match heuristics | L | This is where pricing quality is won or lost. |
| ToS / vendor approval work | L | External dependency, not purely engineering. |

## Appendix: Source Notes

- eBay OAuth docs: app-level `client_credentials` and user-level auth-code flows are documented at [developer.ebay.com](https://developer.ebay.com/develop/guides-v2/authorization#get-oauth-access-tokens).
- eBay OAuth token mint limits: [developer.ebay.com](https://developer.ebay.com/develop/guides-v2/authorization#get-oauth-access-tokens).
- eBay API call limits: Browse and Marketplace Insights default to 5,000 calls/day on the published limits page: [developer.ebay.com](https://developer.ebay.com/develop/get-started/api-call-limits).
- Buy API production access restrictions and limited-release language: [developer.ebay.com](https://developer.ebay.com/api-docs/buy/static/buy-overview.html).
- Browse API overview and restrictions: [developer.ebay.com](https://developer.ebay.com/api-docs/buy/browse/static/overview.html).
- eBay license agreement language on public display, freshness, and derivative information: [developer.ebay.com PDF](https://developer.ebay.com/devzone/license-agreement/api_license_agreement.pdf).
- SportsCardsPro API docs and limits: [sportscardspro.com](https://www.sportscardspro.com/api-documentation).
- SportsCardsPro terms for price-data use: [sportscardspro.com terms](https://www.sportscardspro.com/page/terms-of-service).
- PSA population report public site: [psacard.com/pop](https://www.psacard.com/pop).
