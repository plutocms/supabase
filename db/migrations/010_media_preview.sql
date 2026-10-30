-- The preview image of a file that is not an image (a 3D model), made in the
-- browser by the kind of the file. Always in the `media` bucket, even for an
-- older file in another bucket. See the media skill of @plutocms/pluto.

alter table public.media add column if not exists preview_path text null;
alter table public.media add column if not exists preview_width integer null;
alter table public.media add column if not exists preview_height integer null;
