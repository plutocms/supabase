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
-- Rules: anon gets select only. The anon select policy shows published
-- posts only. service_role gets select, insert, update and delete. No
-- file grants truncate, references, trigger or all.

grant select on public.posts to anon;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, update, delete on public.posts to service_role;
