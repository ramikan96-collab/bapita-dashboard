-- Follow-up to 2026-07-08-custom-domain.sql.
-- `anon` has column-level SELECT grants on businesses (locked down in a past
-- security audit) that only cover the columns the public booking page needs.
-- New columns are never auto-granted, so the middleware's anon-client lookup
-- (filters on custom_domain / custom_domain_verified / status) was throwing
-- "permission denied for table businesses" and silently falling into the
-- unverified-host redirect path.
grant select (custom_domain, custom_domain_verified) on businesses to anon;
