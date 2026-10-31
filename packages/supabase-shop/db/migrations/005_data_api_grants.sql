-- Data API grants
--
-- From 2026-10-30, Supabase stops granting Data API access to new tables
-- in the public schema on its own. A table that a migration creates needs
-- an explicit grant, or the API answers "permission denied" (42501).
--
-- This file grants the minimal privileges that the RLS policies of this
-- layer already allow. It changes nothing on an older database: those
-- tables already hold broader privileges, and grant is additive. Every
-- statement is safe to run twice.
--
-- Rules: anon gets select only (the public catalog). service_role gets
-- select, insert, update and delete. No file grants truncate, references,
-- trigger or all. Every key is an identity column, so no sequence grant
-- is needed.

grant select on public.product_availability to anon;
grant select on public.product_category to anon;
grant select on public.products to anon;
grant select on public.product_media to anon;

grant select, insert, update, delete on public.product_availability to authenticated;
grant select, insert, update, delete on public.product_category to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_media to authenticated;

grant select, insert, update, delete on public.product_availability to service_role;
grant select, insert, update, delete on public.product_category to service_role;
grant select, insert, update, delete on public.products to service_role;
grant select, insert, update, delete on public.product_media to service_role;
