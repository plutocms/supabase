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
-- Rules: anon gets select only, and only on a table with a public read
-- policy. service_role gets select, insert, update and delete. No file
-- grants truncate, references, trigger or all.

-- healthcheck: the setup check reads it without a login.
grant select on public.healthcheck to anon;
grant select, update on public.healthcheck to authenticated;

-- settings: the policies allow select, insert and update.
grant select, insert, update on public.settings to authenticated;

-- profiles: select only. A write goes through a security definer function.
grant select on public.profiles to authenticated;

-- pluto_migrations: the admin reads the migration status.
grant select on public.pluto_migrations to authenticated;

-- Role tables: today's behavior. Every write policy needs public.is_admin().
grant select, insert, update, delete on public.roles to authenticated;
grant select, insert, update, delete on public.role_capabilities to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;

-- service_role: select, insert, update and delete on every table.
grant select, insert, update, delete on public.healthcheck to service_role;
grant select, insert, update, delete on public.settings to service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.pluto_migrations to service_role;
grant select, insert, update, delete on public.roles to service_role;
grant select, insert, update, delete on public.role_capabilities to service_role;
grant select, insert, update, delete on public.user_roles to service_role;

-- Functions. Postgres already gives execute to public. These grants are
-- explicit, so the access does not depend on that default.
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.has_capability(text) to authenticated, service_role;
grant execute on function public.my_capabilities() to authenticated, service_role;
grant execute on function public.set_my_locale(text) to authenticated;
