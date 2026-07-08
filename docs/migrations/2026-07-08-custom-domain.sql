alter table businesses
  add column if not exists custom_domain text unique,
  add column if not exists custom_domain_verified boolean not null default false;

create index if not exists businesses_custom_domain_idx
  on businesses (custom_domain) where custom_domain is not null;

-- The "businesses: owner update" RLS policy is row-scoped only (owner_id = auth.uid()),
-- with no column restriction — an owner can otherwise flip custom_domain_verified on
-- their own row directly via the Supabase client, bypassing the admin-only provisioning
-- flow. Block that at the trigger level: only public.is_admin() may change this column.
create or replace function public.prevent_owner_domain_verify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.custom_domain_verified is distinct from old.custom_domain_verified
     and not public.is_admin() then
    new.custom_domain_verified := old.custom_domain_verified;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_owner_domain_verify on businesses;

create trigger trg_prevent_owner_domain_verify
  before update on businesses
  for each row
  execute function public.prevent_owner_domain_verify();
