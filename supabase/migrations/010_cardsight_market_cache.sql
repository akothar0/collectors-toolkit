-- Global CardSight pricing payload (one row per catalog card + period)

create table cardsight_market_cache (
  cardsight_card_id text not null,
  period text not null default '3m',
  pricing_response jsonb not null,
  total_records int not null default 0,
  queried_at timestamptz not null default now(),
  stale_after timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cardsight_card_id, period)
);

create index idx_cardsight_market_cache_stale
  on cardsight_market_cache (stale_after);

alter table price_snapshots
  add column if not exists comps_scope_note text,
  add column if not exists active_tier text,
  add column if not exists strict_sample_size int,
  add column if not exists market_cache_queried_at timestamptz;
