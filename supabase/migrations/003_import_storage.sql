-- Private import-files bucket (screenshots). Access via signed URLs only.
-- Retention: delete objects older than 30 days (run via pg_cron or scheduled job).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'import-files',
  'import-files',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/octet-stream']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Service role bypasses storage RLS; deny anon/authenticated direct object access.
drop policy if exists "import_files_service_only_select" on storage.objects;
drop policy if exists "import_files_service_only_insert" on storage.objects;
drop policy if exists "import_files_service_only_delete" on storage.objects;

create policy "import_files_service_only_select"
  on storage.objects for select
  using (bucket_id = 'import-files' and auth.role() = 'service_role');

create policy "import_files_service_only_insert"
  on storage.objects for insert
  with check (bucket_id = 'import-files' and auth.role() = 'service_role');

create policy "import_files_service_only_delete"
  on storage.objects for delete
  using (bucket_id = 'import-files' and auth.role() = 'service_role');

-- Optional cleanup: remove import files older than 30 days (requires pg_cron extension).
-- select cron.schedule(
--   'purge-import-files',
--   '0 3 * * *',
--   $$ delete from storage.objects
--      where bucket_id = 'import-files'
--        and created_at < now() - interval '30 days' $$
-- );
