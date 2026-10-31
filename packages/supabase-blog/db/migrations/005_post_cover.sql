-- The cover image of a post: the id of a file of the core media library
-- (`public.media`, from the core migration 009_media.sql). Text, so the value is the
-- same as the id of the media record in the public API.

alter table public.posts add column if not exists cover text null;
