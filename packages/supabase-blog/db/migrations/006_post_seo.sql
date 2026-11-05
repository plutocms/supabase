-- The SEO fields of a post, for the `@plutocms/seo` add-on layer: a title and a description for
-- search results, a social image (the id of a file of the core media library, as `cover`), and
-- noindex. The layer names these columns (`PLUTO_SEO_FIELDS`). A post without values uses its
-- title, excerpt and cover. The table grants of 004_data_api_grants.sql cover the new columns.

alter table public.posts add column if not exists seo_title text null;
alter table public.posts add column if not exists seo_description text null;
alter table public.posts add column if not exists seo_image text null;
alter table public.posts add column if not exists seo_noindex boolean not null default false;
