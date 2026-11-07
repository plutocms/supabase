-- The trash of the blog (the "Trash" of the content-model skill of @plutocms/core). A trashed row
-- has deleted_at. It keeps its id and the references to it; the real delete is the purge, after
-- 30 days or with Delete forever, and the delete triggers of the tags, the categories and the
-- authors run then. Visitors and signed-in readers never see a trashed row. Every statement is
-- idempotent.

alter table public.posts add column if not exists deleted_at timestamp with time zone null;
alter table public.tags add column if not exists deleted_at timestamp with time zone null;
alter table public.categories add column if not exists deleted_at timestamp with time zone null;
alter table public.authors add column if not exists deleted_at timestamp with time zone null;

-- The Trash tab and the purge read the trashed rows only.
create index if not exists idx_posts_deleted_at
  on public.posts (deleted_at) where deleted_at is not null;
create index if not exists idx_tags_deleted_at
  on public.tags (deleted_at) where deleted_at is not null;
create index if not exists idx_categories_deleted_at
  on public.categories (deleted_at) where deleted_at is not null;
create index if not exists idx_authors_deleted_at
  on public.authors (deleted_at) where deleted_at is not null;

-- ---------- posts ----------

-- A visitor reads the published posts that are not in the trash.
drop policy if exists "Allow public read of published posts" on public.posts;
create policy "Allow public read of published posts"
  on public.posts
  for select
  to anon
  using (status = 'published' and deleted_at is null);

-- A signed-in user reads the same, staff with posts:read_drafts reads every post, and a role with
-- posts:delete reads the trash.
drop policy if exists "Allow authenticated read" on public.posts;
create policy "Allow authenticated read"
  on public.posts
  for select
  to authenticated
  using (
    (status = 'published' and deleted_at is null)
    or public.has_capability('posts:read_drafts')
    or (deleted_at is not null and public.has_capability('posts:delete'))
  );

-- Moving a post to the trash and back is an update of deleted_at. A role with posts:delete may do
-- it without posts:publish; the trigger below keeps such a role to deleted_at only.
drop policy if exists "Allow posts:delete trash on posts" on public.posts;
create policy "Allow posts:delete trash on posts"
  on public.posts
  for update
  to authenticated
  using (public.has_capability('posts:delete'))
  with check (public.has_capability('posts:delete'));

-- Only for a signed-in user (the authenticated role): the delete triggers of the tags and the
-- authors (security definer) and the service role change posts as another role.
create or replace function public.posts_trash_only_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
    and not public.has_capability('posts:publish')
    and (to_jsonb(new) - 'deleted_at' - 'updated_at')
      is distinct from (to_jsonb(old) - 'deleted_at' - 'updated_at')
  then
    raise exception 'Without posts:publish, only the trash state of a post can change.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.posts_trash_only_guard() from public, anon, authenticated;

drop trigger if exists posts_trash_only_guard on public.posts;
create trigger posts_trash_only_guard
  before update on public.posts
  for each row execute function public.posts_trash_only_guard();

-- ---------- tags and categories ----------

drop policy if exists "Allow public read of tags" on public.tags;
create policy "Allow public read of tags"
  on public.tags
  for select
  to anon, authenticated
  using (deleted_at is null);

drop policy if exists "Allow terms:manage read of trashed tags" on public.tags;
create policy "Allow terms:manage read of trashed tags"
  on public.tags
  for select
  to authenticated
  using (deleted_at is not null and public.has_capability('terms:manage'));

drop policy if exists "Allow public read of categories" on public.categories;
create policy "Allow public read of categories"
  on public.categories
  for select
  to anon, authenticated
  using (deleted_at is null);

drop policy if exists "Allow terms:manage read of trashed categories" on public.categories;
create policy "Allow terms:manage read of trashed categories"
  on public.categories
  for select
  to authenticated
  using (deleted_at is not null and public.has_capability('terms:manage'));

-- ---------- authors ----------

drop policy if exists "Allow public read of authors" on public.authors;
create policy "Allow public read of authors"
  on public.authors
  for select
  to anon, authenticated
  using (deleted_at is null);

drop policy if exists "Allow authors:manage read of trashed authors" on public.authors;
create policy "Allow authors:manage read of trashed authors"
  on public.authors
  for select
  to authenticated
  using (deleted_at is not null and public.has_capability('authors:manage'));
