-- ============================================================
-- Shop Schema
-- Tables are ordered by dependency (referenced tables first).
-- ============================================================

-- ---------- product_availability ----------

CREATE TABLE public.product_availability (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  label text NOT NULL,
  slug text NOT NULL UNIQUE,
  CONSTRAINT product_availability_pkey PRIMARY KEY (id)
);

ALTER TABLE public.product_availability ENABLE ROW LEVEL SECURITY;

-- Everyone can read availability statuses
CREATE POLICY "Allow public read access"
  ON public.product_availability
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated users can manage availability statuses
CREATE POLICY "Allow authenticated insert"
  ON public.product_availability
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
  ON public.product_availability
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete"
  ON public.product_availability
  FOR DELETE
  TO authenticated
  USING (true);

-- Seed default availability statuses
INSERT INTO public.product_availability (label, slug) VALUES
  ('In stock', 'in-stock'),
  ('Commission', 'commission');

-- ---------- product_category ----------

CREATE TABLE public.product_category (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  slug varchar NOT NULL UNIQUE,
  label text NOT NULL UNIQUE,
  description text,
  CONSTRAINT product_category_pkey PRIMARY KEY (id)
);

ALTER TABLE public.product_category ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON public.product_category
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert"
  ON public.product_category
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
  ON public.product_category
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete"
  ON public.product_category
  FOR DELETE
  TO authenticated
  USING (true);

-- ---------- products ----------

CREATE TABLE public.products (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  category bigint,
  is_custom boolean NOT NULL DEFAULT false,
  stock_quantity numeric DEFAULT 0,
  availability bigint,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_availability_fkey
    FOREIGN KEY (availability) REFERENCES public.product_availability (id)
    ON DELETE SET NULL,
  CONSTRAINT products_category_fkey
    FOREIGN KEY (category) REFERENCES public.product_category (id)
    ON DELETE SET NULL
);

CREATE INDEX idx_products_category ON public.products (category);
CREATE INDEX idx_products_availability ON public.products (availability);
CREATE INDEX idx_products_slug ON public.products (slug);
CREATE INDEX idx_products_created_at ON public.products (created_at DESC);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (true);

-- ---------- product_media ----------

CREATE TABLE public.product_media (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  name varchar NOT NULL,
  alt varchar,
  url text,
  storage_path varchar,
  mime_type varchar,
  size bigint,
  product_id bigint,
  CONSTRAINT product_media_pkey PRIMARY KEY (id),
  CONSTRAINT product_media_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products (id)
    ON DELETE CASCADE
);

CREATE INDEX idx_product_media_product_id ON public.product_media (product_id);

ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON public.product_media
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert"
  ON public.product_media
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
  ON public.product_media
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete"
  ON public.product_media
  FOR DELETE
  TO authenticated
  USING (true);

-- ---------- storage ----------

INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
  'product-media',
  'product-media',
  true,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'model/gltf-binary', 'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  52428800  -- 50 MB
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES (
  'product-media',
  'uploads/.emptyFolderPlaceholder',
  NULL,
  '{}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Storage RLS policies for the product-media bucket
CREATE POLICY "product-media: public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-media');

CREATE POLICY "product-media: authenticated insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-media');

CREATE POLICY "product-media: authenticated update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-media')
  WITH CHECK (bucket_id = 'product-media');

CREATE POLICY "product-media: authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-media');
