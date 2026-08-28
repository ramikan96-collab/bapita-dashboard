-- Multi-page add-on (Phase 5A). A business can have extra public pages under
-- its own slug: book.bapita.com/<business-slug>/<page-slug>, or
-- <custom-domain>/<page-slug>.
--
-- Two kinds:
--   detail — one service/unit, rendered from a fixed template, CTA deep-links
--            into the booking flow with that service pre-selected
--   custom — a free body (markdown-lite/plain text, never raw HTML)
--
-- Writes are ADMIN ONLY in v1 and go through /api/admin/pages on the service
-- client. There is deliberately NO insert/update/delete policy for anon or
-- authenticated here: a stolen owner JWT still cannot create a page.

create table if not exists public.pages (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  slug            text not null,
  kind            text not null check (kind in ('detail','custom')),
  -- detail pages point at the service/unit they describe. on delete set null so
  -- deleting a service orphans the page rather than silently deleting a URL
  -- that is already indexed by Google.
  service_id      uuid references public.services(id) on delete set null,
  title           text not null,
  title_he        text,
  -- same convention as businesses.section_order — nothing new to learn
  section_order   text[],
  -- the editable body. anything the router or the sitemap queries is a real
  -- column, not a key in here.
  content         jsonb not null default '{}'::jsonb,
  seo_title       text,
  seo_description text,
  og_image_url    text,
  published       boolean not null default false,
  display_order   int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (business_id, slug)
);

-- the public route's lookup: business + slug, published only
create index if not exists pages_biz_slug      on public.pages (business_id, slug);
-- the sitemap's and the admin list's lookup
create index if not exists pages_biz_published on public.pages (business_id, published, display_order);

alter table public.pages enable row level security;

-- Public reads: any published page. Deliberately NOT filtered on the parent
-- business's status: a draft business's homepage is already publicly viewable
-- at book.bapita.com/<slug> (that is how a new client previews their site), so
-- its extra pages must behave the same way or they cannot be previewed before
-- launch. `published` is the switch that hides a page; nothing else is.
-- Draft businesses stay out of the sitemap regardless.
drop policy if exists "pages: anon reads published" on public.pages;
create policy "pages: anon reads published"
  on public.pages
  for select
  to anon
  using (published = true);

-- Owners read their own pages, published or not, for the read-only list in
-- Settings -> Website. Read only: there is no write policy for them anywhere.
drop policy if exists "pages: owner reads own" on public.pages;
create policy "pages: owner reads own"
  on public.pages
  for select
  to authenticated
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

-- Table-level select is correct here. The column-level allowlist on
-- public.businesses exists because that table holds billing columns; pages
-- holds none, and the policies above already filter the rows.
grant select on public.pages to anon, authenticated;

-- The multi-page add-on as a billable line item. Bookkeeping only in v1: no
-- runtime check reads it, because admin is the only writer of `pages` and a
-- non-payer therefore physically cannot get one. The gate arrives with owner
-- editing — until then this exists so the financials and reality agree.
alter table public.addons drop constraint if exists addons_addon_type_check;
alter table public.addons add constraint addons_addon_type_check
  check (addon_type in ('whatsapp','stripe','google_business','payments','pages'));

-- Rollback:
--   drop table public.pages;
--   alter table public.addons drop constraint addons_addon_type_check;
--   alter table public.addons add constraint addons_addon_type_check
--     check (addon_type in ('whatsapp','stripe','google_business','payments'));
