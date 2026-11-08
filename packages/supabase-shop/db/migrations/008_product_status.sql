-- A status workflow for products, with scheduled publish and pending review (the "Scheduled
-- publish and review" of the content-model skill of @plutocms/core). Until now every product that
-- is not in the trash was public. Every existing product becomes 'published', so the shop shows
-- the same products as before. A product is live when it is published, or scheduled with a time
-- (published_at) that has come (public.pluto_is_live). Every statement is idempotent.

alter table public.products add column if not exists status text not null default 'published';
alter table public.products add column if not exists published_at timestamp with time zone null;

alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check
  check (status in ('draft', 'review', 'scheduled', 'published'));

create index if not exists idx_products_status on public.products (status);
-- The scheduled task reads the scheduled products by time.
create index if not exists idx_products_scheduled
  on public.products (published_at) where status = 'scheduled';

-- ---------- the live rule ----------

-- The same function as the blog (create or replace with the same body).
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

-- ---------- capabilities ----------

-- products:publish publishes and schedules products. Every role that manages products keeps doing
-- it: it gets products:publish. A role with products:manage only can send products to review.
insert into public.role_capabilities (role_key, capability)
select distinct role_key, 'products:publish'
from public.role_capabilities
where capability = 'products:manage'
on conflict do nothing;

-- ---------- read ----------

-- Visitors and shoppers read the live products that are not in the trash.
drop policy if exists "Allow public read access" on public.products;
create policy "Allow public read access"
  on public.products
  for select
  to anon, authenticated
  using (public.pluto_is_live(status, published_at) and deleted_at is null);

-- Staff with products:manage reads every product that is not in the trash (drafts, review,
-- scheduled). The trash keeps its own policy (007).
drop policy if exists "Allow products:manage read of every product" on public.products;
create policy "Allow products:manage read of every product"
  on public.products
  for select
  to authenticated
  using (deleted_at is null and public.has_capability('products:manage'));

-- ---------- the status guard ----------

-- Without products:publish (a signed-in user only; the service role of the scheduled task changes
-- products as another role):
--   a new or changed product is a draft or in review;
--   a published or scheduled product does not change, except its trash state (the trash guard).
create or replace function public.products_status_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' or public.has_capability('products:publish') then
    return new;
  end if;
  if tg_op = 'UPDATE'
    and (to_jsonb(new) - 'deleted_at' - 'updated_at')
      is not distinct from (to_jsonb(old) - 'deleted_at' - 'updated_at')
  then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status in ('published', 'scheduled') then
    raise exception 'Without products:publish, a published or scheduled product cannot change.'
      using errcode = '42501';
  end if;
  if new.status not in ('draft', 'review') then
    raise exception 'Without products:publish, a product can only be a draft or in review.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.products_status_guard() from public, anon, authenticated;

drop trigger if exists products_status_guard on public.products;
create trigger products_status_guard
  before insert or update on public.products
  for each row execute function public.products_status_guard();
