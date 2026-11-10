-- Legal seller details shown on a business's public booking terms and footer
-- (spec: docs/specs/2026-11-10-stay-pay-link.md). Grow's clearing review and
-- Israeli distance-sale rules want the legal name and registered address of
-- the seller visible on the site that takes payment.
--
-- ADDITIVE ONLY. Both columns are public by design (they are printed on the
-- public site), so they sit on businesses like phone/address do.
--
-- MUST run before deploying the code that selects these columns, or tenant
-- pages fail to load.
alter table public.businesses add column if not exists legal_name    text;
alter table public.businesses add column if not exists legal_address text;

-- Tenant pages read businesses with the ANON key under column-level grants.
-- Without this grant every tenant page that selects these columns 404s.
grant select (legal_name, legal_address) on public.businesses to anon;
