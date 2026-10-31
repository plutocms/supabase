-- ============================================================
-- Capability-based authorization
-- Gates mutation policies on public.has_capability(cap) instead
-- of public.is_admin(). Requires 001_baseline.sql and
-- 002_admin_policies.sql to be applied first, and requires
-- public.has_capability() from @plutocms/supabase (0.7.0+).
-- ============================================================

-- ---------- product_availability ----------

-- Only a user with the shop:manage_taxonomy capability can manage
-- availability statuses.
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.product_availability;

CREATE POLICY "Allow authenticated insert"
  ON public.product_availability
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_capability('shop:manage_taxonomy'));

DROP POLICY IF EXISTS "Allow authenticated update" ON public.product_availability;

CREATE POLICY "Allow authenticated update"
  ON public.product_availability
  FOR UPDATE
  TO authenticated
  USING (public.has_capability('shop:manage_taxonomy'))
  WITH CHECK (public.has_capability('shop:manage_taxonomy'));

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.product_availability;

CREATE POLICY "Allow authenticated delete"
  ON public.product_availability
  FOR DELETE
  TO authenticated
  USING (public.has_capability('shop:manage_taxonomy'));

-- ---------- product_category ----------

-- Only a user with the shop:manage_taxonomy capability can manage
-- product categories.
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.product_category;

CREATE POLICY "Allow authenticated insert"
  ON public.product_category
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_capability('shop:manage_taxonomy'));

DROP POLICY IF EXISTS "Allow authenticated update" ON public.product_category;

CREATE POLICY "Allow authenticated update"
  ON public.product_category
  FOR UPDATE
  TO authenticated
  USING (public.has_capability('shop:manage_taxonomy'))
  WITH CHECK (public.has_capability('shop:manage_taxonomy'));

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.product_category;

CREATE POLICY "Allow authenticated delete"
  ON public.product_category
  FOR DELETE
  TO authenticated
  USING (public.has_capability('shop:manage_taxonomy'));

-- ---------- products ----------

-- A user with the products:manage capability can create and update
-- products. Deleting a product needs the separate products:delete
-- capability.
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.products;

CREATE POLICY "Allow authenticated insert"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_capability('products:manage'));

DROP POLICY IF EXISTS "Allow authenticated update" ON public.products;

CREATE POLICY "Allow authenticated update"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (public.has_capability('products:manage'))
  WITH CHECK (public.has_capability('products:manage'));

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.products;

CREATE POLICY "Allow authenticated delete"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (public.has_capability('products:delete'));

-- ---------- product_media ----------

-- Product media follows products:manage, the same capability that
-- gates product create/update. There is no separate delete
-- capability for media.
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.product_media;

CREATE POLICY "Allow authenticated insert"
  ON public.product_media
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_capability('products:manage'));

DROP POLICY IF EXISTS "Allow authenticated update" ON public.product_media;

CREATE POLICY "Allow authenticated update"
  ON public.product_media
  FOR UPDATE
  TO authenticated
  USING (public.has_capability('products:manage'))
  WITH CHECK (public.has_capability('products:manage'));

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.product_media;

CREATE POLICY "Allow authenticated delete"
  ON public.product_media
  FOR DELETE
  TO authenticated
  USING (public.has_capability('products:manage'));

-- ---------- storage: product-media bucket ----------

-- The bucket check (bucket_id = 'product-media') stays. Only the
-- admin check is replaced, with the products:manage capability.
DROP POLICY IF EXISTS "product-media: authenticated insert" ON storage.objects;

CREATE POLICY "product-media: authenticated insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-media' AND public.has_capability('products:manage'));

DROP POLICY IF EXISTS "product-media: authenticated update" ON storage.objects;

CREATE POLICY "product-media: authenticated update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-media' AND public.has_capability('products:manage'))
  WITH CHECK (bucket_id = 'product-media' AND public.has_capability('products:manage'));

DROP POLICY IF EXISTS "product-media: authenticated delete" ON storage.objects;

CREATE POLICY "product-media: authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-media' AND public.has_capability('products:manage'));
