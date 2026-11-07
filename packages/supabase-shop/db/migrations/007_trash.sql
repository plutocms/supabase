-- The trash of the shop (the "Trash" of the content-model skill of @plutocms/core). A trashed row
-- has deleted_at. It keeps its id and the references to it; the real delete is the purge, after
-- 30 days or with Delete forever. Visitors and shoppers never see a trashed row. The images of a
-- product (product_media) stay as they are. Every statement is idempotent.

alter table public.products add column if not exists deleted_at timestamp with time zone null;
alter table public.product_category add column if not exists deleted_at timestamp with time zone null;
alter table public.product_availability add column if not exists deleted_at timestamp with time zone null;

-- The Trash tab and the purge read the trashed rows only.
create index if not exists idx_products_deleted_at
  on public.products (deleted_at) where deleted_at is not null;
create index if not exists idx_product_category_deleted_at
  on public.product_category (deleted_at) where deleted_at is not null;
create index if not exists idx_product_availability_deleted_at
  on public.product_availability (deleted_at) where deleted_at is not null;

-- ---------- products ----------

drop policy if exists "Allow public read access" on public.products;
create policy "Allow public read access"
  on public.products
  for select
  to anon, authenticated
  using (deleted_at is null);

drop policy if exists "Allow products:delete read of trashed products" on public.products;
create policy "Allow products:delete read of trashed products"
  on public.products
  for select
  to authenticated
  using (deleted_at is not null and public.has_capability('products:delete'));

-- Moving a product to the trash and back is an update of deleted_at. A role with products:delete
-- may do it without products:manage; the trigger below keeps such a role to deleted_at only.
drop policy if exists "Allow products:delete trash on products" on public.products;
create policy "Allow products:delete trash on products"
  on public.products
  for update
  to authenticated
  using (public.has_capability('products:delete'))
  with check (public.has_capability('products:delete'));

-- Only for a signed-in user (the authenticated role): the service role and the functions of other
-- roles change products as another role.
create or replace function public.products_trash_only_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
    and not public.has_capability('products:manage')
    and (to_jsonb(new) - 'deleted_at' - 'updated_at')
      is distinct from (to_jsonb(old) - 'deleted_at' - 'updated_at')
  then
    raise exception 'Without products:manage, only the trash state of a product can change.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.products_trash_only_guard() from public, anon, authenticated;

drop trigger if exists products_trash_only_guard on public.products;
create trigger products_trash_only_guard
  before update on public.products
  for each row execute function public.products_trash_only_guard();

-- ---------- categories and availability ----------

drop policy if exists "Allow public read access" on public.product_category;
create policy "Allow public read access"
  on public.product_category
  for select
  to anon, authenticated
  using (deleted_at is null);

drop policy if exists "Allow shop:manage_taxonomy read of trashed categories" on public.product_category;
create policy "Allow shop:manage_taxonomy read of trashed categories"
  on public.product_category
  for select
  to authenticated
  using (deleted_at is not null and public.has_capability('shop:manage_taxonomy'));

drop policy if exists "Allow public read access" on public.product_availability;
create policy "Allow public read access"
  on public.product_availability
  for select
  to anon, authenticated
  using (deleted_at is null);

drop policy if exists "Allow shop:manage_availability read of trashed availability" on public.product_availability;
create policy "Allow shop:manage_availability read of trashed availability"
  on public.product_availability
  for select
  to authenticated
  using (deleted_at is not null and public.has_capability('shop:manage_availability'));
