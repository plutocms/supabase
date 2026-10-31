-- ============================================================
-- Capability-gated RLS policies for posts
-- ============================================================
--
-- Rewrites the posts policies from 002_admin_policies.sql to use named
-- capabilities instead of public.is_admin(). public.has_capability(cap)
-- is defined in the core schema (@plutocms/supabase 0.7.0+), which
-- always applies before any layer schema. public.has_capability() folds
-- in public.is_admin(), so every existing admin keeps full access with
-- no data migration.
--
-- Standalone and self-sufficient: safe to run once, on top of
-- 001_baseline.sql and 002_admin_policies.sql, against a database that
-- already has both applied.

-- Only a holder of posts:read_drafts may read drafts. Published posts
-- stay readable by any signed-in editor, same as before.
DROP POLICY IF EXISTS "Allow authenticated read" ON public.posts;

CREATE POLICY "Allow authenticated read"
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (status = 'published' OR public.has_capability('posts:read_drafts'));

-- Creating and editing a post requires posts:publish.
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.posts;

CREATE POLICY "Allow authenticated insert"
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_capability('posts:publish'));

DROP POLICY IF EXISTS "Allow authenticated update" ON public.posts;

CREATE POLICY "Allow authenticated update"
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING (public.has_capability('posts:publish'))
  WITH CHECK (public.has_capability('posts:publish'));

-- Deleting a post requires posts:delete, a separate capability from
-- posts:publish on purpose — a role may publish without being able to
-- delete.
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.posts;

CREATE POLICY "Allow authenticated delete"
  ON public.posts
  FOR DELETE
  TO authenticated
  USING (public.has_capability('posts:delete'));

-- "Allow public read of published posts" (the anon policy) is untouched.
-- It never referenced public.is_admin() or a capability.
