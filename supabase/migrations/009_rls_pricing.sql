-- Deny-all RLS on pricing tables (service role only)

alter table price_reference_keys enable row level security;
alter table price_snapshots enable row level security;
alter table price_comparables enable row level security;

drop policy if exists "deny_anon_price_reference_keys" on price_reference_keys;
drop policy if exists "deny_authenticated_price_reference_keys" on price_reference_keys;
drop policy if exists "deny_anon_price_snapshots" on price_snapshots;
drop policy if exists "deny_authenticated_price_snapshots" on price_snapshots;
drop policy if exists "deny_anon_price_comparables" on price_comparables;
drop policy if exists "deny_authenticated_price_comparables" on price_comparables;

create policy "deny_anon_price_reference_keys" on price_reference_keys for all to anon using (false);
create policy "deny_authenticated_price_reference_keys" on price_reference_keys for all to authenticated using (false);

create policy "deny_anon_price_snapshots" on price_snapshots for all to anon using (false);
create policy "deny_authenticated_price_snapshots" on price_snapshots for all to authenticated using (false);

create policy "deny_anon_price_comparables" on price_comparables for all to anon using (false);
create policy "deny_authenticated_price_comparables" on price_comparables for all to authenticated using (false);
