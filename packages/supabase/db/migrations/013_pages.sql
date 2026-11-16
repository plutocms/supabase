-- The pages table (the "Pages" of the content-model skill of @plutocms/core). A page is a title, a
-- path, a description and a block body. `slug` holds the whole path, such as `about/team`, and it
-- is unique. The table has the same shape as `public.posts` after the blog migrations 001 to 010:
--   status     draft, review, scheduled or published. A scheduled page is live from published_at
--              (public.pluto_is_live), and the scheduled task of core then sets it to published;
--   deleted_at the trash: a trashed row keeps its id, and visitors never see it;
--   created_at and updated_at: the content adapter writes both, as it does for posts.
-- The table is in the base layer, so every Supabase site has it. A site uses it only when the
-- option `plutoPages.enabled` is on. Capabilities: pages:read_drafts, pages:write, pages:publish
-- and pages:delete (the built-in admin role holds them all through its wildcard; give the others
-- to a role in the admin). Every statement is idempotent.

create table if not exists public.pages (
  id bigint generated always as identity not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  slug text not null unique,
  title text not null,
  description text null,
  body text null,
  status text not null default 'draft',
  published_at timestamp with time zone null,
  deleted_at timestamp with time zone null,
  constraint pages_pkey primary key (id),
  constraint pages_status_check check (status in ('draft', 'review', 'scheduled', 'published')),
  -- A path has segments with text and no slash at the start or the end: about, about/team.
  constraint pages_slug_check check (slug ~ '^[^/]+(/[^/]+)*$')
);

create index if not exists idx_pages_status on public.pages (status);
create index if not exists idx_pages_created_at on public.pages (created_at desc);

-- The scheduled task reads the scheduled pages by time.
create index if not exists idx_pages_scheduled
  on public.pages (published_at) where status = 'scheduled';

-- The Trash tab and the purge read the trashed rows only.
create index if not exists idx_pages_deleted_at
  on public.pages (deleted_at) where deleted_at is not null;

alter table public.pages enable row level security;

-- ---------- the live rule ----------

-- Live: published, or scheduled with a time that has come. The same rule as isLiveStatus of core.
-- The blog and the shop have the same function (create or replace with the same body).
create or replace function public.pluto_is_live(p_status text, p_published_at timestamp with time zone)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_status = 'published'
    or (p_status = 'scheduled' and p_published_at is not null and p_published_at <= now());
$$;

grant execute on function public.pluto_is_live(text, timestamp with time zone)
  to anon, authenticated, service_role;

-- ---------- read ----------

-- A visitor reads the live pages that are not in the trash.
drop policy if exists "Allow public read of published pages" on public.pages;
create policy "Allow public read of published pages"
  on public.pages
  for select
  to anon
  using (public.pluto_is_live(status, published_at) and deleted_at is null);

-- A signed-in user reads the same, staff with pages:read_drafts reads every page, and a role with
-- pages:delete reads the trash.
drop policy if exists "Allow authenticated read" on public.pages;
create policy "Allow authenticated read"
  on public.pages
  for select
  to authenticated
  using (
    (public.pluto_is_live(status, published_at) and deleted_at is null)
    or public.has_capability('pages:read_drafts')
    or (deleted_at is not null and public.has_capability('pages:delete'))
  );

-- ---------- write ----------

-- pages:write or pages:publish creates and edits pages. The status guard below keeps a role
-- without pages:publish to drafts and review.
drop policy if exists "Allow authenticated insert" on public.pages;
create policy "Allow authenticated insert"
  on public.pages
  for insert
  to authenticated
  with check (public.has_capability('pages:write') or public.has_capability('pages:publish'));

drop policy if exists "Allow authenticated update" on public.pages;
create policy "Allow authenticated update"
  on public.pages
  for update
  to authenticated
  using (public.has_capability('pages:write') or public.has_capability('pages:publish'))
  with check (public.has_capability('pages:write') or public.has_capability('pages:publish'));

-- Deleting a page for good (the purge) requires pages:delete, a separate capability from
-- pages:publish on purpose: a role may publish without being able to delete.
drop policy if exists "Allow authenticated delete" on public.pages;
create policy "Allow authenticated delete"
  on public.pages
  for delete
  to authenticated
  using (public.has_capability('pages:delete'));

-- Moving a page to the trash and back is an update of deleted_at. A role with pages:delete may do
-- it without pages:publish; the trash guard below keeps such a role to deleted_at only.
drop policy if exists "Allow pages:delete trash on pages" on public.pages;
create policy "Allow pages:delete trash on pages"
  on public.pages
  for update
  to authenticated
  using (public.has_capability('pages:delete'))
  with check (public.has_capability('pages:delete'));

-- Only for a signed-in user (the authenticated role): the service role changes pages as another
-- role.
create or replace function public.pages_trash_only_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
    and not public.has_capability('pages:publish')
    and not public.has_capability('pages:write')
    and (to_jsonb(new) - 'deleted_at' - 'updated_at')
      is distinct from (to_jsonb(old) - 'deleted_at' - 'updated_at')
  then
    raise exception 'Without pages:publish, only the trash state of a page can change.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.pages_trash_only_guard() from public, anon, authenticated;

drop trigger if exists pages_trash_only_guard on public.pages;
create trigger pages_trash_only_guard
  before update on public.pages
  for each row execute function public.pages_trash_only_guard();

-- Without pages:publish (a signed-in user only; the service role of the scheduled task changes
-- pages as another role):
--   a new or changed page is a draft or in review;
--   a published or scheduled page does not change, except its trash state (the trash guard).
create or replace function public.pages_status_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' or public.has_capability('pages:publish') then
    return new;
  end if;
  if tg_op = 'UPDATE'
    and (to_jsonb(new) - 'deleted_at' - 'updated_at')
      is not distinct from (to_jsonb(old) - 'deleted_at' - 'updated_at')
  then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status in ('published', 'scheduled') then
    raise exception 'Without pages:publish, a published or scheduled page cannot change.'
      using errcode = '42501';
  end if;
  if new.status not in ('draft', 'review') then
    raise exception 'Without pages:publish, a page can only be a draft or in review.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.pages_status_guard() from public, anon, authenticated;

drop trigger if exists pages_status_guard on public.pages;
create trigger pages_status_guard
  before insert or update on public.pages
  for each row execute function public.pages_status_guard();

-- ---------- Data API grants ----------

-- anon gets select only, and the policy above shows live pages only. service_role gets select,
-- insert, update and delete.
grant select on public.pages to anon;
grant select, insert, update, delete on public.pages to authenticated;
grant select, insert, update, delete on public.pages to service_role;
