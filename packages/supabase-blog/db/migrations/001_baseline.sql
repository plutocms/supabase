-- ============================================================
-- Blog Schema
-- ============================================================

-- ---------- posts ----------

CREATE TABLE public.posts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content text,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_status_check CHECK (status IN ('draft', 'published'))
);

CREATE INDEX idx_posts_status ON public.posts (status);
CREATE INDEX idx_posts_created_at ON public.posts (created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Anonymous visitors read published posts only.
CREATE POLICY "Allow public read of published posts"
  ON public.posts
  FOR SELECT
  TO anon
  USING (status = 'published');

-- Signed-in editors read every post, including drafts.
CREATE POLICY "Allow authenticated read"
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert"
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete"
  ON public.posts
  FOR DELETE
  TO authenticated
  USING (true);
