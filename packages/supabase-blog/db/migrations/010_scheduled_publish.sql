-- Scheduled publish and pending review of the blog (the "Scheduled publish and review" of the
-- content-model skill of @plutocms/core). Two new post statuses:
--   review     a contributor (posts:write, no posts:publish) sends a post to an editor;
--   scheduled  an editor plans a post: published_at holds the planned time, and the post is live
--              from that time (public.pluto_is_live). The scheduled task of core then sets the
--              status to published.
-- Every statement is idempotent.

alter table public.posts drop constraint if exists posts_status_check;
alter table public.posts add constraint posts_status_check
  check (status in ('draft', 'review', 'scheduled', 'published'));

-- The scheduled task reads the scheduled posts by time.
create index if not exists idx_posts_scheduled
  on public.posts (published_at) where status = 'scheduled';

-- ---------- the live rule ----------

-- Live: published, or scheduled with a time that has come. The same rule as isLiveStatus of core.
-- The shop has the same function (create or replace with the same body).
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

-- ---------- capabilities and the Contributor role ----------

-- posts:write edits posts without publishing them. Every role that publishes also writes.
insert into public.role_capabilities (role_key, capability)
select distinct role_key, 'posts:write'
from public.role_capabilities
where capability = 'posts:publish'
on conflict do nothing;

insert into public.roles (key, label, description, is_builtin) values
  ('contributor', 'Contributor', 'Writes posts and sends them to review. Cannot publish.', true)
on conflict (key) do nothing;

insert into public.role_capabilities (role_key, capability) values
  ('contributor', 'posts:write'),
  ('contributor', 'posts:read_drafts')
on conflict do nothing;

-- ---------- posts: read ----------

-- A visitor reads the live posts that are not in the trash.
drop policy if exists "Allow public read of published posts" on public.posts;
create policy "Allow public read of published posts"
  on public.posts
  for select
  to anon
  using (public.pluto_is_live(status, published_at) and deleted_at is null);

-- A signed-in user reads the same, staff with posts:read_drafts reads every post, and a role with
-- posts:delete reads the trash.
drop policy if exists "Allow authenticated read" on public.posts;
create policy "Allow authenticated read"
  on public.posts
  for select
  to authenticated
  using (
    (public.pluto_is_live(status, published_at) and deleted_at is null)
    or public.has_capability('posts:read_drafts')
    or (deleted_at is not null and public.has_capability('posts:delete'))
  );

-- ---------- posts: write ----------

-- posts:write or posts:publish creates and edits posts. The status guard below keeps a role
-- without posts:publish to drafts and review.
drop policy if exists "Allow authenticated insert" on public.posts;
create policy "Allow authenticated insert"
  on public.posts
  for insert
  to authenticated
  with check (public.has_capability('posts:write') or public.has_capability('posts:publish'));

drop policy if exists "Allow authenticated update" on public.posts;
create policy "Allow authenticated update"
  on public.posts
  for update
  to authenticated
  using (public.has_capability('posts:write') or public.has_capability('posts:publish'))
  with check (public.has_capability('posts:write') or public.has_capability('posts:publish'));

-- The trash guard of 009: a role with posts:write (not only posts:publish) may change a post.
create or replace function public.posts_trash_only_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
    and not public.has_capability('posts:publish')
    and not public.has_capability('posts:write')
    and (to_jsonb(new) - 'deleted_at' - 'updated_at')
      is distinct from (to_jsonb(old) - 'deleted_at' - 'updated_at')
  then
    raise exception 'Without posts:publish, only the trash state of a post can change.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Without posts:publish (a signed-in user only; the service role of the scheduled task and the
-- security definer triggers change posts as another role):
--   a new or changed post is a draft or in review;
--   a published or scheduled post does not change, except its trash state (the trash guard).
create or replace function public.posts_status_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' or public.has_capability('posts:publish') then
    return new;
  end if;
  if tg_op = 'UPDATE'
    and (to_jsonb(new) - 'deleted_at' - 'updated_at')
      is not distinct from (to_jsonb(old) - 'deleted_at' - 'updated_at')
  then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status in ('published', 'scheduled') then
    raise exception 'Without posts:publish, a published or scheduled post cannot change.'
      using errcode = '42501';
  end if;
  if new.status not in ('draft', 'review') then
    raise exception 'Without posts:publish, a post can only be a draft or in review.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.posts_status_guard() from public, anon, authenticated;

drop trigger if exists posts_status_guard on public.posts;
create trigger posts_status_guard
  before insert or update on public.posts
  for each row execute function public.posts_status_guard();
