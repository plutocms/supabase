-- Authors of posts.
--
-- An author is a row of `public.authors`: the public profile of a post author (a name, a slug, a
-- bio and an avatar). It has no link to a sign-in user, and it holds no private data: a visitor
-- reads every column (the public API reads with `select('*')`). Never add a user id, an email or a
-- role to this table.
--
-- A post stores the ids of its authors in `author_ids`, in byline order: no join table, as for
-- `tag_ids` (007). A filter by author is one `cs` (contains) test, which the GIN index serves. The
-- delete trigger below removes a deleted author from the posts.
--
-- Writing an author needs the `authors:manage` capability (`public.has_capability()`, from
-- `@plutocms/supabase`). Every role that holds `posts:publish` today gets it. The built-in admin
-- role holds `*`, so it needs no row. Every statement is safe to run twice.

-- ---------- authors ----------

create table if not exists public.authors (
  id bigint generated always as identity not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  bio text null,
  avatar text null,
  constraint authors_pkey primary key (id)
);

-- ---------- the author ids of a post ----------

alter table public.posts add column if not exists author_ids bigint[] not null default '{}';

create index if not exists idx_posts_author_ids on public.posts using gin (author_ids);

-- ---------- row level security ----------

alter table public.authors enable row level security;

-- Authors are public: a visitor reads every author.
drop policy if exists "Allow public read of authors" on public.authors;
create policy "Allow public read of authors"
  on public.authors
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow authors:manage insert on authors" on public.authors;
create policy "Allow authors:manage insert on authors"
  on public.authors
  for insert
  to authenticated
  with check (public.has_capability('authors:manage'));

drop policy if exists "Allow authors:manage update on authors" on public.authors;
create policy "Allow authors:manage update on authors"
  on public.authors
  for update
  to authenticated
  using (public.has_capability('authors:manage'))
  with check (public.has_capability('authors:manage'));

drop policy if exists "Allow authors:manage delete on authors" on public.authors;
create policy "Allow authors:manage delete on authors"
  on public.authors
  for delete
  to authenticated
  using (public.has_capability('authors:manage'));

-- ---------- grants ----------
-- The Data API needs an explicit grant on a new table (see 004_data_api_grants.sql).

grant select on public.authors to anon;
grant select, insert, update, delete on public.authors to authenticated;
grant select, insert, update, delete on public.authors to service_role;

-- ---------- the capability ----------

insert into public.role_capabilities (role_key, capability)
select role_key, 'authors:manage'
  from public.role_capabilities
 where capability = 'posts:publish'
on conflict do nothing;

-- ---------- a deleted author leaves the posts ----------
-- Security definer: the user who deletes an author may not be able to update every post (RLS),
-- but no post may keep the id of a deleted author. The search path is empty, so every name is
-- qualified. Only the trigger calls this function.

create or replace function public.remove_deleted_author_from_posts()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.posts
     set author_ids = array_remove(author_ids, old.id)
   where author_ids @> array[old.id];

  return old;
end;
$$;

revoke execute on function public.remove_deleted_author_from_posts() from public, anon, authenticated;

drop trigger if exists authors_remove_from_posts on public.authors;
create trigger authors_remove_from_posts
  after delete on public.authors
  for each row execute function public.remove_deleted_author_from_posts();
