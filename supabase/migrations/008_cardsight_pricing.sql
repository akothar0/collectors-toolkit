-- CardSight pricing cache tables (sold comps)

create table price_reference_keys (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  source text not null,
  marketplace text not null default 'CARDSIGHT',
  sport text,
  year int,
  player text,
  set_name text,
  parallel text,
  card_number text,
  rookie boolean default false,
  condition_bucket text not null,
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
  on price_comparables (snapshot_id, similarity_score desc nulls last);

alter table collection_cards
  add column if not exists price_reference_key_id uuid references price_reference_keys(id),
  add column if not exists latest_price_snapshot_id uuid references price_snapshots(id),
  add column if not exists market_price_sample_size int,
  add column if not exists market_price_confidence text;

alter table want_list
  add column if not exists price_reference_key_id uuid references price_reference_keys(id),
  add column if not exists latest_price_snapshot_id uuid references price_snapshots(id);
