-- Roles and capabilities
--
-- Adds a role-based capability system. A role (public.roles) holds a set
-- of capabilities (public.role_capabilities); a user (public.user_roles)
-- holds a set of roles. public.has_capability(cap) answers "can the
-- calling user do this?" for any layer's server routes and RLS policies.
--
-- Standalone and self-sufficient: it does not depend on running as a
-- diff against another file, only on 001_baseline.sql's and
-- 002_admin_hardening.sql's objects (public.profiles, public.settings,
-- public.healthcheck, public.is_admin(), public.handle_new_user())
-- already existing.

-- Free text, never an enum. An enum would stop a layer, or an operator,
-- from adding a role or a capability — the exact problem
-- 003_settings_generic_keys.sql already fixed for settings.
create table if not exists public.roles (
  key text primary key,
  label text not null,
  description text,
  is_builtin boolean not null default false,
  created_at timestamptz not null default now(),
  constraint roles_key_format check (key ~ '^[a-z0-9_]+$')
);

create table if not exists public.role_capabilities (
  role_key text not null references public.roles (key) on delete cascade,
  capability text not null,
  primary key (role_key, capability),
  -- '<namespace>:<action>', or the literal '*' for every capability.
  constraint role_capabilities_format
    check (capability = '*' or capability ~ '^[a-z0-9_]+:[a-z0-9_]+$')
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role_key text not null references public.roles (key) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_key)
);

create index if not exists user_roles_user_id_idx on public.user_roles (user_id);

-- Seed the built-in admin role, with the wildcard capability.
insert into public.roles (key, label, description, is_builtin) values
  ('admin', 'Administrator', 'Full access to every feature.', true)
on conflict (key) do nothing;

insert into public.role_capabilities (role_key, capability) values ('admin', '*')
on conflict do nothing;

-- Every existing admin gets the admin role with no manual step.
insert into public.user_roles (user_id, role_key)
select p.id, 'admin' from public.profiles p where p.is_admin = true
on conflict do nothing;

-- Returns true when the calling user holds the given capability, either
-- directly through a role, or through public.is_admin(). SECURITY
-- DEFINER for the same reason public.is_admin() is: the lookup must not
-- be subject to the RLS policies it is being used to decide.
create or replace function public.has_capability(cap text)
returns boolean
language sql security definer set search_path = '' stable
as $$
  select public.is_admin() or exists (
    select 1
      from public.user_roles ur
      join public.role_capabilities rc on rc.role_key = ur.role_key
     where ur.user_id = auth.uid()
       and (rc.capability = cap or rc.capability = '*')
  );
$$;

-- The flat capability list for the calling user. Backs /api/permissions/me.
create or replace function public.my_capabilities()
returns setof text
language sql security definer set search_path = '' stable
as $$
  select '*'::text where public.is_admin()
  union
  select rc.capability
    from public.user_roles ur
    join public.role_capabilities rc on rc.role_key = ur.role_key
   where ur.user_id = auth.uid();
$$;

grant execute on function public.has_capability(text) to authenticated;
grant execute on function public.my_capabilities() to authenticated;

-- Reimplements public.is_admin() to also recognize the 'admin' role, so
-- every existing admin passes every new capability check automatically,
-- with zero data migration. Kept as create or replace, not a new
-- function: its name and signature (returns boolean, no arguments,
-- language sql security definer set search_path = '', stable) never
-- change. 30 RLS policies across 4 repos call it by name.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  ) or exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.role_key = 'admin'
  );
$$;

-- Also grant the 'admin' role to a newly-created first-admin account, so
-- has_capability() sees it the same way is_admin() does. Keeps the exact
-- existing signature; on_auth_user_created (from 001_baseline.sql)
-- already points at this function by name, and create or replace is
-- enough to update its behavior.
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

  if should_be_admin then
    insert into public.user_roles (user_id, role_key) values (new.id, 'admin')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- RLS on the three new tables.
alter table public.roles enable row level security;
alter table public.role_capabilities enable row level security;
alter table public.user_roles enable row level security;

drop policy if exists "Enable read access for authenticated users on roles" on public.roles;

create policy "Enable read access for authenticated users on roles"
on public.roles
for select
to authenticated
using (true);

drop policy if exists "Enable insert for admins on roles" on public.roles;

create policy "Enable insert for admins on roles"
on public.roles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Enable update for admins on roles" on public.roles;

create policy "Enable update for admins on roles"
on public.roles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Enable delete for admins on roles" on public.roles;

create policy "Enable delete for admins on roles"
on public.roles
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Enable read access for authenticated users on role_capabilities" on public.role_capabilities;

create policy "Enable read access for authenticated users on role_capabilities"
on public.role_capabilities
for select
to authenticated
using (true);

drop policy if exists "Enable insert for admins on role_capabilities" on public.role_capabilities;

create policy "Enable insert for admins on role_capabilities"
on public.role_capabilities
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Enable update for admins on role_capabilities" on public.role_capabilities;

create policy "Enable update for admins on role_capabilities"
on public.role_capabilities
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Enable delete for admins on role_capabilities" on public.role_capabilities;

create policy "Enable delete for admins on role_capabilities"
on public.role_capabilities
for delete
to authenticated
using (public.is_admin());

-- A user may always read their own role grants; only an admin reads
-- everyone's. Every write is admin-only, with no exception: with check
-- (true) here would let any authenticated user grant themselves the
-- 'admin' role, a privilege-escalation hole identical in shape to the
-- one closed in 002_admin_hardening.sql.
drop policy if exists "Enable read access for own or admin on user_roles" on public.user_roles;

create policy "Enable read access for own or admin on user_roles"
on public.user_roles
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Enable insert for admins on user_roles" on public.user_roles;

create policy "Enable insert for admins on user_roles"
on public.user_roles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Enable update for admins on user_roles" on public.user_roles;

create policy "Enable update for admins on user_roles"
on public.user_roles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Enable delete for admins on user_roles" on public.user_roles;

create policy "Enable delete for admins on user_roles"
on public.user_roles
for delete
to authenticated
using (public.is_admin());

-- Rewrite this repo's own three policies to named capabilities. Since
-- has_capability() folds in is_admin() through the 'admin' role check,
-- every existing admin is unaffected by this change.
drop policy if exists "Enable read access for authenticated users" on public.profiles;

create policy "Enable read access for authenticated users"
on public.profiles
for select
to authenticated, dashboard_user
using (auth.uid() = id or public.has_capability('users:read'));

drop policy if exists "Enable insert for authenticated users only" on public.settings;

create policy "Enable insert for authenticated users only"
on public.settings
for insert
to authenticated, dashboard_user
with check (public.has_capability('settings:manage'));

drop policy if exists "Enable update for authenticated users on settings" on public.settings;

create policy "Enable update for authenticated users on settings"
on public.settings
for update
to authenticated, dashboard_user
using (public.has_capability('settings:manage'))
with check (public.has_capability('settings:manage'));

drop policy if exists "Enable update for authenticated users on healthcheck" on public.healthcheck;

create policy "Enable update for authenticated users on healthcheck"
on public.healthcheck
for update
to authenticated, dashboard_user
using (public.has_capability('settings:manage'))
with check (public.has_capability('settings:manage'));
