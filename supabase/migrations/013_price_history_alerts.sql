-- Per-card market observations (sparklines) + email alert tracking

create table collection_card_market_observations (
  id uuid primary key default gen_random_uuid(),
  collection_card_id uuid not null references collection_cards(id) on delete cascade,
  observed_at timestamptz not null default now(),
  display_median numeric(10,2),
  strict_median numeric(10,2),
  sample_size int not null default 0,
  active_tier text,
  source text not null default 'cardsight',
  created_at timestamptz not null default now()
);

create index idx_collection_card_market_observations_card_time
  on collection_card_market_observations (collection_card_id, observed_at desc);

create table want_list_price_alerts (
  id uuid primary key default gen_random_uuid(),
  want_list_id uuid not null references want_list(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  triggered_at timestamptz not null default now(),
  market_median numeric(10,2) not null,
  target_price numeric(10,2) not null
);

create unique index idx_want_list_price_alerts_one_per_day
  on want_list_price_alerts (want_list_id, ((triggered_at at time zone 'utc')::date));

create index idx_want_list_price_alerts_user on want_list_price_alerts (user_id, triggered_at desc);

alter table users add column if not exists email_alerts_enabled boolean not null default true;

-- Retention: observations older than 90 days can be purged by cron

alter table collection_card_market_observations enable row level security;
alter table want_list_price_alerts enable row level security;

create policy "deny_anon_collection_card_market_observations"
  on collection_card_market_observations for all to anon using (false);
create policy "deny_authenticated_collection_card_market_observations"
  on collection_card_market_observations for all to authenticated using (false);

create policy "deny_anon_want_list_price_alerts"
  on want_list_price_alerts for all to anon using (false);
create policy "deny_authenticated_want_list_price_alerts"
  on want_list_price_alerts for all to authenticated using (false);
