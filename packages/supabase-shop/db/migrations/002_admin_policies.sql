-- ============================================================
-- Admin-authorization hardening
-- Gates mutation policies on public.is_admin() instead of the
-- authenticated role alone. Requires 001_baseline.sql to be
-- applied first.
-- ============================================================

-- ---------- product_availability ----------

-- Only admins can manage availability statuses. There is no editor/author
-- role yet, so "authenticated" previously meant "any signed-up account,
-- admin or not". public.is_admin() is defined in the core schema
-- (@plutocms/supabase), which always applies before any layer schema.
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.product_availability;

CREATE POLICY "Allow authenticated insert"
  ON public.product_availability
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated update" ON public.product_availability;

CREATE POLICY "Allow authenticated update"
  ON public.product_availability
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.product_availability;

CREATE POLICY "Allow authenticated delete"
  ON public.product_availability
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------- product_category ----------

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.product_category;

CREATE POLICY "Allow authenticated insert"
  ON public.product_category
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated update" ON public.product_category;

CREATE POLICY "Allow authenticated update"
  ON public.product_category
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.product_category;

CREATE POLICY "Allow authenticated delete"
  ON public.product_category
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------- products ----------

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.products;

CREATE POLICY "Allow authenticated insert"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated update" ON public.products;

CREATE POLICY "Allow authenticated update"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.products;

CREATE POLICY "Allow authenticated delete"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------- product_media ----------

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.product_media;

CREATE POLICY "Allow authenticated insert"
  ON public.product_media
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated update" ON public.product_media;

CREATE POLICY "Allow authenticated update"
  ON public.product_media
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.product_media;

CREATE POLICY "Allow authenticated delete"
  ON public.product_media
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------- storage: product-media bucket ----------

DROP POLICY IF EXISTS "product-media: public read" ON storage.objects;

CREATE POLICY "product-media: public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-media');

DROP POLICY IF EXISTS "product-media: authenticated insert" ON storage.objects;

CREATE POLICY "product-media: authenticated insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-media' AND public.is_admin());

DROP POLICY IF EXISTS "product-media: authenticated update" ON storage.objects;

CREATE POLICY "product-media: authenticated update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-media' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-media' AND public.is_admin());

DROP POLICY IF EXISTS "product-media: authenticated delete" ON storage.objects;

CREATE POLICY "product-media: authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-media' AND public.is_admin());
