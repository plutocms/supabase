-- The shop moves to the core media library (the media skill of @plutocms/pluto).
-- `products.media` holds the ids of the files, in order. The old
-- `product_media` rows become `media` records: one record for each file (a file
-- that two products used had two rows), with the real type and size from
-- Storage. The files stay in the `product-media` bucket, so no bytes move.
-- `product_media` is renamed to `product_media_archived`, not dropped.
--
-- The core migration (`core/009_media.sql`) runs first: it makes `media` with
-- the `bucket`, `width` and `height` columns.

alter table public.products
  add column if not exists media jsonb not null default '[]'::jsonb;

do $$
begin
  if to_regclass('public.product_media') is null then
    return;
  end if;

  -- One record for each file. The alt text comes from a row that has one.
  insert into public.media (name, alt, bucket, storage_path, mime_type, size, created_at)
  select distinct on (f.path)
    f.name,
    nullif(f.alt, ''),
    'product-media',
    f.path,
    case
      when f.path ilike '%.glb' then 'model/gltf-binary'
      else coalesce(f.mime_type, nullif(o.metadata ->> 'mimetype', ''), 'application/octet-stream')
    end,
    coalesce(f.size, (o.metadata ->> 'size')::bigint, 0),
    f.created_at
  from (
    select
      pm.id,
      pm.name,
      pm.alt,
      pm.mime_type,
      pm.size,
      pm.created_at,
      coalesce(pm.storage_path, 'uploads/' || pm.name) as path
    from public.product_media pm
    where pm.name is not null
  ) f
  left join storage.objects o
    on o.bucket_id = 'product-media' and o.name = f.path
  where not exists (
    select 1 from public.media m
    where m.bucket = 'product-media' and m.storage_path = f.path
  )
  order by f.path, (coalesce(f.alt, '') = ''), f.id;

  -- The files of each product, in the order of the old rows. A file appears once.
  update public.products p
  set media = linked.ids
  from (
    select product_id, jsonb_agg(media_id order by first_row) as ids
    from (
      select pm.product_id, m.id::text as media_id, min(pm.id) as first_row
      from public.product_media pm
      join public.media m
        on m.bucket = 'product-media'
        and m.storage_path = coalesce(pm.storage_path, 'uploads/' || pm.name)
      where pm.product_id is not null
      group by pm.product_id, m.id
    ) files
    group by product_id
  ) linked
  where p.id = linked.product_id
    and p.media = '[]'::jsonb;

  alter table public.product_media rename to product_media_archived;
end
$$;

-- A user who can delete media can delete an older file of the shop bucket too.
drop policy if exists "product-media: media delete" on storage.objects;
create policy "product-media: media delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-media' and public.has_capability('media:delete'));
