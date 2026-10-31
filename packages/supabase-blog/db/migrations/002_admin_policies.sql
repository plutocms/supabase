-- ============================================================
-- Admin-gated RLS policies for posts
-- ============================================================
--
-- Hardens the posts policies from 001_baseline.sql. Only admins may read
-- drafts, insert, update, or delete. public.is_admin() is defined in the
-- core schema (@plutocms/supabase), which always applies before any layer
-- schema.

-- Anonymous visitors read published posts only.
DROP POLICY IF EXISTS "Allow public read of published posts" ON public.posts;

CREATE POLICY "Allow public read of published posts"
  ON public.posts
  FOR SELECT
  TO anon
  USING (status = 'published');

-- Only admins may read drafts — there is no editor/author role yet, so
-- "authenticated" previously meant "any signed-up account, admin or not".
DROP POLICY IF EXISTS "Allow authenticated read" ON public.posts;

CREATE POLICY "Allow authenticated read"
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (status = 'published' OR public.is_admin());

-- Writes require admin — same reasoning.
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.posts;

CREATE POLICY "Allow authenticated insert"
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated update" ON public.posts;

CREATE POLICY "Allow authenticated update"
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.posts;

CREATE POLICY "Allow authenticated delete"
  ON public.posts
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
