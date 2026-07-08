-- Fixes gallery/profile-photo uploads failing on every business with
-- "new row violates row-level security policy" (403) even though the
-- storage.objects INSERT/DELETE policies (business-images: auth upload/delete)
-- looked correct.
--
-- Root cause (two gaps from the 2026-07-04 RLS hardening batch
-- batch_s3_rls_config_hardening_n5_n6_n8, both needed for the fix):
--
-- 1. storage.buckets had RLS enabled with zero policies, so the
--    authenticated/anon roles couldn't resolve the bucket row at all.
--
-- 2. storage.objects had no SELECT policy. Supabase's storage-api inserts
--    new object rows with `INSERT ... RETURNING *`; Postgres RLS blocks
--    that RETURNING when there's no SELECT policy letting the role
--    re-select the row it just inserted, and surfaces it as the same
--    generic "new row violates row-level security policy" error as a
--    failed WITH CHECK — even though the INSERT policy itself was fine.
--    Verified directly: without this policy, `INSERT ... RETURNING id`
--    as role `authenticated` fails; with it, the same insert succeeds.
create policy "business-images: bucket read"
on storage.buckets for select
to authenticated, anon
using (id = 'business-images');

create policy "business-images: auth read"
on storage.objects for select
to authenticated
using (bucket_id = 'business-images');
