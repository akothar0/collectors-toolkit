-- RLS for set tracking tables (defense-in-depth; server uses service role + Clerk).

alter table card_sets enable row level security;
alter table collection_set_progress enable row level security;

drop policy if exists "deny_anon_card_sets" on card_sets;
drop policy if exists "deny_authenticated_card_sets" on card_sets;
drop policy if exists "deny_anon_collection_set_progress" on collection_set_progress;
drop policy if exists "deny_authenticated_collection_set_progress" on collection_set_progress;

create policy "deny_anon_card_sets" on card_sets for all to anon using (false);
create policy "deny_authenticated_card_sets" on card_sets for all to authenticated using (false);
create policy "deny_anon_collection_set_progress" on collection_set_progress for all to anon using (false);
create policy "deny_authenticated_collection_set_progress" on collection_set_progress for all to authenticated using (false);
