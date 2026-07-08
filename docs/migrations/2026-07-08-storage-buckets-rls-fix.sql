-- Fixes gallery/profile-photo uploads failing on every business with
-- "new row violates row-level security policy" (403) even though the
-- storage.objects policies (business-images: auth upload/delete) are correct.
--
-- Root cause: the 2026-07-04 RLS hardening batch
-- (batch_s3_rls_config_hardening_n5_n6_n8) enabled RLS on storage.buckets
-- but never added a policy for it. With zero policies, storage-api can't
-- resolve the bucket row for any client-scoped (authenticated/anon) role,
-- so every insert into storage.objects for business-images is rejected
-- upstream of the objects policy check itself.
create policy "business-images: bucket read"
on storage.buckets for select
to authenticated, anon
using (id = 'business-images');
