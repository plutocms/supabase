-- The menus and areas tables (the "Menus and areas" of the content-model skill of @plutocms/core).
-- A menu is the navigation of the site: a title, a handle (`main`) and a body of `menu-item`
-- blocks. An area is a part that many pages share, such as the footer: a title, a handle
-- (`footer`) and a block body. Neither has a status, and both have a trash.
-- The tables are in the base layer, so every Supabase site has them. A site uses a table only
-- when the option `plutoMenus.enabled` or `plutoAreas.enabled` is on. Capabilities: menus:write
-- and areas:write (each also covers the delete). The built-in admin role holds them through its
-- wildcard. No role gets them from data in this migration: give them to another role in the
-- admin. Every statement is idempotent.

-- ---------- menus ----------

-- A menu is a title, a handle and a block body. `slug` is the handle (main, footer-links). It is unique and has no
-- slash. `body` holds the blocks as Markdown. A menu has no status: it is always live. `deleted_at`
-- is the trash: a trashed row keeps its id, and visitors never see it. The content adapter writes
-- created_at and updated_at, as it does for posts.
create table if not exists public.menus (
  id bigint generated always as identity not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  slug text not null unique,
  title text not null,
  body text null,
  deleted_at timestamp with time zone null,
  constraint menus_pkey primary key (id),
  -- A handle has text and no slash: main, footer-links.
  constraint menus_slug_check check (slug ~ '^[^/]+$')
);

-- The Trash tab and the purge read the trashed rows only.
create index if not exists idx_menus_deleted_at
  on public.menus (deleted_at) where deleted_at is not null;

alter table public.menus enable row level security;

-- A visitor reads the menus that are not in the trash.
drop policy if exists "Allow public read of menus" on public.menus;
create policy "Allow public read of menus"
  on public.menus
  for select
  to anon
  using (deleted_at is null);

-- A signed-in user reads the same, and a role with menus:write reads the trash too.
drop policy if exists "Allow authenticated read" on public.menus;
create policy "Allow authenticated read"
  on public.menus
  for select
  to authenticated
  using (deleted_at is null or public.has_capability('menus:write'));

-- menus:write creates, edits, trashes and deletes. The core type uses one capability for write and
-- delete. Moving a row to the trash is an update of deleted_at.
drop policy if exists "Allow authenticated insert" on public.menus;
create policy "Allow authenticated insert"
  on public.menus
  for insert
  to authenticated
  with check (public.has_capability('menus:write'));

drop policy if exists "Allow authenticated update" on public.menus;
create policy "Allow authenticated update"
  on public.menus
  for update
  to authenticated
  using (public.has_capability('menus:write'))
  with check (public.has_capability('menus:write'));

drop policy if exists "Allow authenticated delete" on public.menus;
create policy "Allow authenticated delete"
  on public.menus
  for delete
  to authenticated
  using (public.has_capability('menus:write'));

-- anon gets select only, and the policy above hides the trash. service_role gets the four commands.
grant select on public.menus to anon;
grant select, insert, update, delete on public.menus to authenticated;
grant select, insert, update, delete on public.menus to service_role;

-- ---------- areas ----------

-- A area is a title, a handle and a block body. `slug` is the handle (footer). It is unique and has no
-- slash. `body` holds the blocks as Markdown. A area has no status: it is always live. `deleted_at`
-- is the trash: a trashed row keeps its id, and visitors never see it. The content adapter writes
-- created_at and updated_at, as it does for posts.
create table if not exists public.areas (
  id bigint generated always as identity not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  slug text not null unique,
  title text not null,
  body text null,
  deleted_at timestamp with time zone null,
  constraint areas_pkey primary key (id),
  -- A handle has text and no slash: footer.
  constraint areas_slug_check check (slug ~ '^[^/]+$')
);

-- The Trash tab and the purge read the trashed rows only.
create index if not exists idx_areas_deleted_at
  on public.areas (deleted_at) where deleted_at is not null;

alter table public.areas enable row level security;

-- A visitor reads the areas that are not in the trash.
drop policy if exists "Allow public read of areas" on public.areas;
create policy "Allow public read of areas"
  on public.areas
  for select
  to anon
  using (deleted_at is null);

-- A signed-in user reads the same, and a role with areas:write reads the trash too.
drop policy if exists "Allow authenticated read" on public.areas;
create policy "Allow authenticated read"
  on public.areas
  for select
  to authenticated
  using (deleted_at is null or public.has_capability('areas:write'));

-- areas:write creates, edits, trashes and deletes. The core type uses one capability for write and
-- delete. Moving a row to the trash is an update of deleted_at.
drop policy if exists "Allow authenticated insert" on public.areas;
create policy "Allow authenticated insert"
  on public.areas
  for insert
  to authenticated
  with check (public.has_capability('areas:write'));

drop policy if exists "Allow authenticated update" on public.areas;
create policy "Allow authenticated update"
  on public.areas
  for update
  to authenticated
  using (public.has_capability('areas:write'))
  with check (public.has_capability('areas:write'));

drop policy if exists "Allow authenticated delete" on public.areas;
create policy "Allow authenticated delete"
  on public.areas
  for delete
  to authenticated
  using (public.has_capability('areas:write'));

-- anon gets select only, and the policy above hides the trash. service_role gets the four commands.
grant select on public.areas to anon;
grant select, insert, update, delete on public.areas to authenticated;
grant select, insert, update, delete on public.areas to service_role;
