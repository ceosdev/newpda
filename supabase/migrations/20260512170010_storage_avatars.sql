-- Avatars bucket: public read, owner-only write, admin override.
-- File path convention: avatars/{auth.uid()}/avatar.{ext}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  1048576, -- 1 MiB
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;


-- Public read (bucket is public; URLs do not need signing).
create policy "avatars_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');


-- Owner may write inside their own folder only.
create policy "avatars_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- Admin can manage any object in the bucket.
create policy "avatars_admin_all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'avatars' and app.is_admin())
  with check (bucket_id = 'avatars' and app.is_admin());
