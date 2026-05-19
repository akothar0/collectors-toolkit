-- Deny-all RLS on new pricing cache tables (service role only)

alter table cardsight_market_cache enable row level security;
alter table cardsight_grade_map enable row level security;

drop policy if exists "deny_anon_cardsight_market_cache" on cardsight_market_cache;
drop policy if exists "deny_authenticated_cardsight_market_cache" on cardsight_market_cache;
drop policy if exists "deny_anon_cardsight_grade_map" on cardsight_grade_map;
drop policy if exists "deny_authenticated_cardsight_grade_map" on cardsight_grade_map;

create policy "deny_anon_cardsight_market_cache" on cardsight_market_cache for all to anon using (false);
create policy "deny_authenticated_cardsight_market_cache" on cardsight_market_cache for all to authenticated using (false);

create policy "deny_anon_cardsight_grade_map" on cardsight_grade_map for all to anon using (false);
create policy "deny_authenticated_cardsight_grade_map" on cardsight_grade_map for all to authenticated using (false);
