-- Row Level Security: defense-in-depth when using anon/authenticated keys.
-- Server routes use the service role and bypass RLS; these policies block direct API access.

alter table users enable row level security;
alter table collection_cards enable row level security;
alter table import_batches enable row level security;
alter table import_items enable row level security;
alter table want_list enable row level security;
alter table graded_scans enable row level security;
alter table raw_grade_sessions enable row level security;
alter table usage_logs enable row level security;

-- Deny all access via PostgREST anon/authenticated roles (Clerk JWT is not wired to auth.uid()).
drop policy if exists "deny_anon_users" on users;
drop policy if exists "deny_authenticated_users" on users;
drop policy if exists "deny_anon_collection_cards" on collection_cards;
drop policy if exists "deny_authenticated_collection_cards" on collection_cards;
drop policy if exists "deny_anon_import_batches" on import_batches;
drop policy if exists "deny_authenticated_import_batches" on import_batches;
drop policy if exists "deny_anon_import_items" on import_items;
drop policy if exists "deny_authenticated_import_items" on import_items;
drop policy if exists "deny_anon_want_list" on want_list;
drop policy if exists "deny_authenticated_want_list" on want_list;
drop policy if exists "deny_anon_graded_scans" on graded_scans;
drop policy if exists "deny_authenticated_graded_scans" on graded_scans;
drop policy if exists "deny_anon_raw_grade_sessions" on raw_grade_sessions;
drop policy if exists "deny_authenticated_raw_grade_sessions" on raw_grade_sessions;
drop policy if exists "deny_anon_usage_logs" on usage_logs;
drop policy if exists "deny_authenticated_usage_logs" on usage_logs;
drop policy if exists "cards_read_authenticated" on cards;
drop policy if exists "cards_read_anon" on cards;
drop policy if exists "cards_no_write_anon" on cards;
drop policy if exists "cards_no_write_authenticated" on cards;
drop policy if exists "cards_no_update_anon" on cards;
drop policy if exists "cards_no_update_authenticated" on cards;
drop policy if exists "cards_no_delete_anon" on cards;
drop policy if exists "cards_no_delete_authenticated" on cards;

create policy "deny_anon_users" on users for all to anon using (false);
create policy "deny_authenticated_users" on users for all to authenticated using (false);

create policy "deny_anon_collection_cards" on collection_cards for all to anon using (false);
create policy "deny_authenticated_collection_cards" on collection_cards for all to authenticated using (false);

create policy "deny_anon_import_batches" on import_batches for all to anon using (false);
create policy "deny_authenticated_import_batches" on import_batches for all to authenticated using (false);

create policy "deny_anon_import_items" on import_items for all to anon using (false);
create policy "deny_authenticated_import_items" on import_items for all to authenticated using (false);

create policy "deny_anon_want_list" on want_list for all to anon using (false);
create policy "deny_authenticated_want_list" on want_list for all to authenticated using (false);

create policy "deny_anon_graded_scans" on graded_scans for all to anon using (false);
create policy "deny_authenticated_graded_scans" on graded_scans for all to authenticated using (false);

create policy "deny_anon_raw_grade_sessions" on raw_grade_sessions for all to anon using (false);
create policy "deny_authenticated_raw_grade_sessions" on raw_grade_sessions for all to authenticated using (false);

create policy "deny_anon_usage_logs" on usage_logs for all to anon using (false);
create policy "deny_authenticated_usage_logs" on usage_logs for all to authenticated using (false);

-- cards catalog is shared reference data; keep readable for future client features if needed.
alter table cards enable row level security;
create policy "cards_read_authenticated" on cards for select to authenticated using (true);
create policy "cards_read_anon" on cards for select to anon using (true);
create policy "cards_no_write_anon" on cards for insert to anon with check (false);
create policy "cards_no_write_authenticated" on cards for insert to authenticated with check (false);
create policy "cards_no_update_anon" on cards for update to anon using (false);
create policy "cards_no_update_authenticated" on cards for update to authenticated using (false);
create policy "cards_no_delete_anon" on cards for delete to anon using (false);
create policy "cards_no_delete_authenticated" on cards for delete to authenticated using (false);
