-- Restrict staff reads
--
-- Sign-up is open. Before this file, any signed-in user could read every
-- row of settings, pluto_migrations, roles and role_capabilities, because
-- the select policies used "using (true)". This file narrows them.
--
-- settings: a user who holds at least one capability (staff) reads them.
--   The admin bar loads the site name and URL for every staff user.
-- pluto_migrations: only an admin reads it. The migrations page is
--   admin only (requireAdmin -> public.is_admin()).
-- roles, role_capabilities: only an admin reads them. Only security
--   definer functions read them for other users.
--
-- dashboard_user keeps its access where it had access before. Every
-- statement is safe to run twice.

-- settings
drop policy if exists "Enable read access for authenticated users on settings" on public.settings;
drop policy if exists "Enable read access for staff on settings" on public.settings;

create policy "Enable read access for staff on settings"
on public.settings
for select
to authenticated, dashboard_user
using (
  current_user = 'dashboard_user'
  or exists (select 1 from public.my_capabilities())
);

-- pluto_migrations
drop policy if exists "Enable read access for authenticated users on pluto_migrations" on public.pluto_migrations;
drop policy if exists "Enable read access for admins on pluto_migrations" on public.pluto_migrations;

create policy "Enable read access for admins on pluto_migrations"
on public.pluto_migrations
for select
to authenticated, dashboard_user
using (current_user = 'dashboard_user' or public.is_admin());

-- roles
drop policy if exists "Enable read access for authenticated users on roles" on public.roles;
drop policy if exists "Enable read access for admins on roles" on public.roles;

create policy "Enable read access for admins on roles"
on public.roles
for select
to authenticated
using (public.is_admin());

-- role_capabilities
drop policy if exists "Enable read access for authenticated users on role_capabilities" on public.role_capabilities;
drop policy if exists "Enable read access for admins on role_capabilities" on public.role_capabilities;

create policy "Enable read access for admins on role_capabilities"
on public.role_capabilities
for select
to authenticated
using (public.is_admin());
