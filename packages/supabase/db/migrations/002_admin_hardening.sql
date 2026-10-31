-- Admin hardening
--
-- Gates the writes that were previously open to any authenticated user
-- behind a real admin check, and closes a client-controlled admin
-- self-grant on signup. Standalone and self-sufficient: it does not
-- depend on running as a diff against 001_baseline.sql, only on that
-- file's tables (public.profiles, public.settings, public.healthcheck)
-- already existing.

-- Returns true when the calling user's own profile has is_admin = true.
-- SECURITY DEFINER so this lookup runs with the function owner's
-- privileges rather than the caller's — RLS policies call this to decide
-- whether to grant a *wider* read/write than a user's own row would
-- otherwise get, so the check itself must not be subject to those same
-- policies.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- A user can always read their own profile; only admins can read
-- everyone's. Previously any authenticated user could read every row
-- (including every user's email) — this was the actual reason `is_admin`
-- existed on the table but no policy referenced it.
drop policy if exists "Enable read access for authenticated users" on public.profiles;

create policy "Enable read access for authenticated users"
on public.profiles
for select
to authenticated, dashboard_user
using (auth.uid() = id or public.is_admin());

-- Previously any authenticated user (not just an admin) could insert or
-- update settings — see server/api/settings/update.post.ts, which also
-- now requires an admin session.
drop policy if exists "Enable insert for authenticated users only" on public.settings;

create policy "Enable insert for authenticated users only"
on public.settings
for insert
to authenticated, dashboard_user
with check (public.is_admin());

drop policy if exists "Enable update for authenticated users on settings" on public.settings;

create policy "Enable update for authenticated users on settings"
on public.settings
for update
to authenticated, dashboard_user
using (public.is_admin())
with check (public.is_admin());

-- Previously any authenticated user (not just an admin) could flip
-- first_setup back to 'true', which would re-open the unauthenticated
-- setup wizard for every visitor.
drop policy if exists "Enable update for authenticated users on healthcheck" on public.healthcheck;

create policy "Enable update for authenticated users on healthcheck"
on public.healthcheck
for update
to authenticated, dashboard_user
using (public.is_admin())
with check (public.is_admin());

--- inserts a row into public.profiles
--- automatically grants admin to the first user if no profiles exist yet
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  profile_count int;
  should_be_admin boolean;
begin
  select count(*) into profile_count from public.profiles;

  -- Only the very first account is auto-promoted. Never trust
  -- raw_user_meta_data for this: it is fully client-controlled — anyone can
  -- pass an arbitrary `options.data` straight to Supabase's own
  -- /auth/v1/signup endpoint, bypassing this project's own /api/auth/signup
  -- route entirely — so honoring an `is_admin` key there let any new
  -- signup grant itself admin.
  should_be_admin := profile_count = 0;

  insert into public.profiles (id, email, username, display_name, is_admin)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'display_name',
    should_be_admin
  );
  return new;
end;
$$;
-- Not re-created here: on_auth_user_created (from 001_baseline.sql)
-- already points at public.handle_new_user() by name, and
-- `create or replace function` above is enough to update its behavior.
