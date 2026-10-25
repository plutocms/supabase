-- Users and roles admin
--
-- Functions for the access API (server/api/access/**). They let an admin
-- list staff and roles, change the roles of a user, and manage roles.
-- This file creates no table, so it needs no table grant.
--
-- Rules:
-- - Every function is security definer with an empty search_path.
-- - Every write needs public.is_admin(). There is no users:manage
--   capability. A user with users:read may list staff and roles.
-- - A rule error is P0001 with the message 'pluto:<code>'. A missing right
--   is 42501 with the message 'pluto:forbidden'.
-- - set_user_roles and add_user_roles keep profiles.is_admin in step with
--   the 'admin' role. So a revoke removes the first admin too, and
--   requireAdmin (it reads the column) sees an admin that has the role only.
--
-- Every statement is safe to run twice.

-- Staff: a user with at least one role, or with profiles.is_admin.
create or replace function public.list_staff_users()
returns table (
  id uuid,
  email text,
  display_name text,
  username text,
  is_admin boolean,
  roles text[],
  invited_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not public.has_capability('users:read') then
    raise exception using errcode = '42501', message = 'pluto:forbidden';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.display_name,
    p.username,
    (
      coalesce(p.is_admin, false)
      or exists (
        select 1 from public.user_roles a
         where a.user_id = u.id and a.role_key = 'admin'
      )
    ),
    coalesce(
      array(
        select ur.role_key from public.user_roles ur
         where ur.user_id = u.id
         order by ur.role_key
      ),
      '{}'::text[]
    ),
    u.invited_at,
    u.email_confirmed_at,
    u.last_sign_in_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  where coalesce(p.is_admin, false)
     or exists (select 1 from public.user_roles s where s.user_id = u.id)
  order by u.created_at;
end;
$$;

create or replace function public.list_roles()
returns table (
  key text,
  label text,
  description text,
  is_builtin boolean,
  capabilities text[],
  user_count integer
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not public.has_capability('users:read') then
    raise exception using errcode = '42501', message = 'pluto:forbidden';
  end if;

  return query
  select
    r.key,
    r.label,
    r.description,
    r.is_builtin,
    coalesce(
      array(
        select rc.capability from public.role_capabilities rc
         where rc.role_key = r.key
         order by rc.capability
      ),
      '{}'::text[]
    ),
    (select count(*)::integer from public.user_roles ur where ur.role_key = r.key)
  from public.roles r
  order by r.is_builtin desc, r.key;
end;
$$;

create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  found_id uuid;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'pluto:forbidden';
  end if;

  select u.id into found_id
    from auth.users u
   where lower(u.email) = lower(trim(p_email))
   limit 1;

  return found_id;
end;
$$;

-- Replaces the roles of a user. An empty array removes every role.
create or replace function public.set_user_roles(target uuid, role_keys text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  keys text[];
  target_is_admin boolean;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'pluto:forbidden';
  end if;

  perform pg_advisory_xact_lock(hashtext('pluto.user_roles'));

  if not exists (select 1 from auth.users u where u.id = target) then
    raise exception using errcode = 'P0001', message = 'pluto:user_not_found';
  end if;

  select coalesce(array(select distinct k from unnest(role_keys) as k), '{}'::text[])
    into keys;

  if exists (
    select 1 from unnest(keys) as k
     where not exists (select 1 from public.roles r where r.key = k)
  ) then
    raise exception using errcode = 'P0001', message = 'pluto:unknown_role';
  end if;

  target_is_admin := coalesce(
    (select p.is_admin from public.profiles p where p.id = target),
    false
  ) or exists (
    select 1 from public.user_roles ur
     where ur.user_id = target and ur.role_key = 'admin'
  );

  -- Do not remove the last admin.
  if target_is_admin and not ('admin' = any(keys)) then
    if not exists (
      select 1 from public.profiles p
       where p.is_admin and p.id <> target
      union all
      select 1 from public.user_roles ur
       where ur.role_key = 'admin' and ur.user_id <> target
    ) then
      raise exception using errcode = 'P0001', message = 'pluto:last_admin';
    end if;
  end if;

  delete from public.user_roles ur
   where ur.user_id = target and ur.role_key <> all (keys);

  insert into public.user_roles (user_id, role_key)
  select target, k from unnest(keys) as k
  on conflict do nothing;

  update public.profiles p
     set is_admin = ('admin' = any(keys))
   where p.id = target;
end;
$$;

-- Adds roles to a user. It keeps the roles that the user has.
create or replace function public.add_user_roles(target uuid, role_keys text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  keys text[];
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'pluto:forbidden';
  end if;

  perform pg_advisory_xact_lock(hashtext('pluto.user_roles'));

  if not exists (select 1 from auth.users u where u.id = target) then
    raise exception using errcode = 'P0001', message = 'pluto:user_not_found';
  end if;

  select coalesce(array(select distinct k from unnest(role_keys) as k), '{}'::text[])
    into keys;

  if exists (
    select 1 from unnest(keys) as k
     where not exists (select 1 from public.roles r where r.key = k)
  ) then
    raise exception using errcode = 'P0001', message = 'pluto:unknown_role';
  end if;

  insert into public.user_roles (user_id, role_key)
  select target, k from unnest(keys) as k
  on conflict do nothing;

  if 'admin' = any(keys) then
    update public.profiles p set is_admin = true where p.id = target;
  end if;
end;
$$;

create or replace function public.create_role(
  p_key text,
  p_label text,
  p_description text,
  p_capabilities text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caps text[];
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'pluto:forbidden';
  end if;

  perform pg_advisory_xact_lock(hashtext('pluto.user_roles'));

  if p_key is null or p_key !~ '^[a-z0-9_]+$' then
    raise exception using errcode = 'P0001', message = 'pluto:invalid_key';
  end if;

  if p_label is null or trim(p_label) = '' then
    raise exception using errcode = 'P0001', message = 'pluto:invalid_label';
  end if;

  select coalesce(array(select distinct c from unnest(p_capabilities) as c), '{}'::text[])
    into caps;

  if '*' = any(caps) then
    raise exception using errcode = 'P0001', message = 'pluto:wildcard';
  end if;

  if cardinality(caps) = 0 then
    raise exception using errcode = 'P0001', message = 'pluto:empty_role';
  end if;

  if exists (
    select 1 from unnest(caps) as c where c !~ '^[a-z0-9_]+:[a-z0-9_]+$'
  ) then
    raise exception using errcode = 'P0001', message = 'pluto:invalid_capability';
  end if;

  if exists (select 1 from public.roles r where r.key = p_key) then
    raise exception using errcode = 'P0001', message = 'pluto:role_exists';
  end if;

  insert into public.roles (key, label, description, is_builtin)
  values (p_key, trim(p_label), nullif(trim(coalesce(p_description, '')), ''), false);

  insert into public.role_capabilities (role_key, capability)
  select p_key, c from unnest(caps) as c;
end;
$$;

-- Edits a role and replaces its capabilities in one transaction.
create or replace function public.update_role(
  p_key text,
  p_label text,
  p_description text,
  p_capabilities text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caps text[];
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'pluto:forbidden';
  end if;

  perform pg_advisory_xact_lock(hashtext('pluto.user_roles'));

  if p_key = 'admin' then
    raise exception using errcode = 'P0001', message = 'pluto:builtin_role';
  end if;

  if not exists (select 1 from public.roles r where r.key = p_key) then
    raise exception using errcode = 'P0001', message = 'pluto:role_not_found';
  end if;

  if p_label is null or trim(p_label) = '' then
    raise exception using errcode = 'P0001', message = 'pluto:invalid_label';
  end if;

  select coalesce(array(select distinct c from unnest(p_capabilities) as c), '{}'::text[])
    into caps;

  if '*' = any(caps) then
    raise exception using errcode = 'P0001', message = 'pluto:wildcard';
  end if;

  if cardinality(caps) = 0 then
    raise exception using errcode = 'P0001', message = 'pluto:empty_role';
  end if;

  if exists (
    select 1 from unnest(caps) as c where c !~ '^[a-z0-9_]+:[a-z0-9_]+$'
  ) then
    raise exception using errcode = 'P0001', message = 'pluto:invalid_capability';
  end if;

  update public.roles r
     set label = trim(p_label),
         description = nullif(trim(coalesce(p_description, '')), '')
   where r.key = p_key;

  delete from public.role_capabilities rc where rc.role_key = p_key;

  insert into public.role_capabilities (role_key, capability)
  select p_key, c from unnest(caps) as c;
end;
$$;

-- Deletes a role. It returns the number of users who lost the role.
create or replace function public.delete_role(p_key text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  builtin boolean;
  affected integer;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'pluto:forbidden';
  end if;

  perform pg_advisory_xact_lock(hashtext('pluto.user_roles'));

  select r.is_builtin into builtin from public.roles r where r.key = p_key;

  if builtin is null then
    raise exception using errcode = 'P0001', message = 'pluto:role_not_found';
  end if;

  if builtin or p_key = 'admin' then
    raise exception using errcode = 'P0001', message = 'pluto:builtin_role';
  end if;

  select count(*)::integer into affected
    from public.user_roles ur where ur.role_key = p_key;

  -- The cascade removes the user_roles and role_capabilities rows.
  delete from public.roles r where r.key = p_key;

  return affected;
end;
$$;

-- Execute rights. Only a signed-in user and the service role may call them.
-- Each function checks the right of the caller inside.
revoke execute on function public.list_staff_users() from public, anon;
grant execute on function public.list_staff_users() to authenticated, service_role;

revoke execute on function public.list_roles() from public, anon;
grant execute on function public.list_roles() to authenticated, service_role;

revoke execute on function public.find_user_id_by_email(text) from public, anon;
grant execute on function public.find_user_id_by_email(text) to authenticated, service_role;

revoke execute on function public.set_user_roles(uuid, text[]) from public, anon;
grant execute on function public.set_user_roles(uuid, text[]) to authenticated, service_role;

revoke execute on function public.add_user_roles(uuid, text[]) from public, anon;
grant execute on function public.add_user_roles(uuid, text[]) to authenticated, service_role;

revoke execute on function public.create_role(text, text, text, text[]) from public, anon;
grant execute on function public.create_role(text, text, text, text[]) to authenticated, service_role;

revoke execute on function public.update_role(text, text, text, text[]) from public, anon;
grant execute on function public.update_role(text, text, text, text[]) to authenticated, service_role;

revoke execute on function public.delete_role(text) from public, anon;
grant execute on function public.delete_role(text) to authenticated, service_role;

-- Policy tweaks. The functions above are the way to edit roles. These
-- policies stop a direct write through the Data API from breaking the
-- rules: the built-in roles stay, 'admin' keeps its wildcard, and no other
-- role gets the wildcard.
drop policy if exists "Enable delete for admins on roles" on public.roles;

create policy "Enable delete for admins on roles"
on public.roles
for delete
to authenticated
using (public.is_admin() and not is_builtin);

drop policy if exists "Enable insert for admins on role_capabilities" on public.role_capabilities;

create policy "Enable insert for admins on role_capabilities"
on public.role_capabilities
for insert
to authenticated
with check (
  public.is_admin() and role_key <> 'admin' and capability <> '*'
);

drop policy if exists "Enable update for admins on role_capabilities" on public.role_capabilities;

create policy "Enable update for admins on role_capabilities"
on public.role_capabilities
for update
to authenticated
using (public.is_admin() and role_key <> 'admin')
with check (
  public.is_admin() and role_key <> 'admin' and capability <> '*'
);

drop policy if exists "Enable delete for admins on role_capabilities" on public.role_capabilities;

create policy "Enable delete for admins on role_capabilities"
on public.role_capabilities
for delete
to authenticated
using (public.is_admin() and role_key <> 'admin');
