-- Tags and categories for posts.
--
-- A term is a row of `public.tags` or `public.categories`. A post stores the ids of its terms in
-- two array columns, `tag_ids` and `category_ids`: no join table. One column per kind keeps
-- `select('*')`, the revisions (the item is jsonb) and the filter of the public API simple. A
-- filter by term is one `cs` (contains) test, which the GIN indexes serve. The cost is that the
-- database holds no foreign key per element, so the delete triggers below remove a deleted term
-- from the posts.
--
-- Writing a term needs the `terms:manage` capability (`public.has_capability()`, from
-- `@plutocms/supabase`). Every role that holds `posts:publish` today gets it. The built-in admin
-- role holds `*`, so it needs no row. Every statement is safe to run twice.

-- ---------- tags and categories ----------

create table if not exists public.tags (
  id bigint generated always as identity not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  slug text not null unique,
  description text null,
  constraint tags_pkey primary key (id)
);

create table if not exists public.categories (
  id bigint generated always as identity not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  slug text not null unique,
  description text null,
  constraint categories_pkey primary key (id)
);

-- ---------- the term ids of a post ----------

alter table public.posts add column if not exists tag_ids bigint[] not null default '{}';
alter table public.posts add column if not exists category_ids bigint[] not null default '{}';

create index if not exists idx_posts_tag_ids on public.posts using gin (tag_ids);
create index if not exists idx_posts_category_ids on public.posts using gin (category_ids);

-- ---------- row level security ----------

alter table public.tags enable row level security;
alter table public.categories enable row level security;

-- Terms are public: a visitor reads every term.
drop policy if exists "Allow public read of tags" on public.tags;
create policy "Allow public read of tags"
  on public.tags
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow terms:manage insert on tags" on public.tags;
create policy "Allow terms:manage insert on tags"
  on public.tags
  for insert
  to authenticated
  with check (public.has_capability('terms:manage'));

drop policy if exists "Allow terms:manage update on tags" on public.tags;
create policy "Allow terms:manage update on tags"
  on public.tags
  for update
  to authenticated
  using (public.has_capability('terms:manage'))
  with check (public.has_capability('terms:manage'));

drop policy if exists "Allow terms:manage delete on tags" on public.tags;
create policy "Allow terms:manage delete on tags"
  on public.tags
  for delete
  to authenticated
  using (public.has_capability('terms:manage'));

drop policy if exists "Allow public read of categories" on public.categories;
create policy "Allow public read of categories"
  on public.categories
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow terms:manage insert on categories" on public.categories;
create policy "Allow terms:manage insert on categories"
  on public.categories
  for insert
  to authenticated
  with check (public.has_capability('terms:manage'));

drop policy if exists "Allow terms:manage update on categories" on public.categories;
create policy "Allow terms:manage update on categories"
  on public.categories
  for update
  to authenticated
  using (public.has_capability('terms:manage'))
  with check (public.has_capability('terms:manage'));

drop policy if exists "Allow terms:manage delete on categories" on public.categories;
create policy "Allow terms:manage delete on categories"
  on public.categories
  for delete
  to authenticated
  using (public.has_capability('terms:manage'));

-- ---------- grants ----------
-- The Data API needs an explicit grant on a new table (see 004_data_api_grants.sql).

grant select on public.tags to anon;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.tags to service_role;

grant select on public.categories to anon;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.categories to service_role;

-- ---------- the capability ----------

insert into public.role_capabilities (role_key, capability)
select role_key, 'terms:manage'
  from public.role_capabilities
 where capability = 'posts:publish'
on conflict do nothing;

-- ---------- a deleted term leaves the posts ----------
-- Security definer: the user who deletes a term may not be able to update every post (RLS), but
-- no post may keep the id of a deleted term. The search path is empty, so every name is
-- qualified. Only the triggers call these functions.

create or replace function public.remove_deleted_tag_from_posts()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.posts
     set tag_ids = array_remove(tag_ids, old.id)
   where tag_ids @> array[old.id];

  return old;
end;
$$;

create or replace function public.remove_deleted_category_from_posts()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.posts
     set category_ids = array_remove(category_ids, old.id)
   where category_ids @> array[old.id];

  return old;
end;
$$;

revoke execute on function public.remove_deleted_tag_from_posts() from public, anon, authenticated;
revoke execute on function public.remove_deleted_category_from_posts() from public, anon, authenticated;

drop trigger if exists tags_remove_from_posts on public.tags;
create trigger tags_remove_from_posts
  after delete on public.tags
  for each row execute function public.remove_deleted_tag_from_posts();

drop trigger if exists categories_remove_from_posts on public.categories;
create trigger categories_remove_from_posts
  after delete on public.categories
  for each row execute function public.remove_deleted_category_from_posts();
