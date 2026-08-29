-- Which section of the business's homepage links to this page.
--
-- A detail page is already reachable from the service it describes (matched on
-- service_id). A custom page has no such anchor: an "About us" page has to be
-- reachable from the About section, and nothing in the row said so. One nullable
-- column rather than a nav table — the menu, when it exists, will be the ordered
-- page list, and this is the exception for a page that stands in for a section.
--
-- NULL = not linked from any section (still reachable by URL and from the
-- "More" list on a sibling page).
alter table public.pages add column if not exists section_key text;

alter table public.pages drop constraint if exists pages_section_key_check;
alter table public.pages add constraint pages_section_key_check
  check (section_key is null or section_key in
    ('services','about','staff','gallery','reviews','hours','location'));

-- No grant needed: public.pages is granted table-level SELECT, unlike
-- public.businesses which is a column-level allowlist.

-- Rollback:
--   alter table public.pages drop column section_key;
