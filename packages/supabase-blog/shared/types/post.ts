import type { Database } from '#shared/types/supabase'

export type PostStatus = 'draft' | 'published'

// These two must stay plain object type aliases, not interfaces. An
// interface has no implicit index signature, so it does not structurally
// satisfy @supabase/postgrest-js's GenericTable constraint (`Row:
// Record<string, unknown>`, and so on). That constraint failing silently
// collapses every query on `posts` to `never`. A type alias for a plain
// object literal does satisfy it.
// eslint-disable-next-line ts/consistent-type-definitions -- must stay a type alias, see comment above
export type PostRow = {
  id: number
  created_at: string
  updated_at: string
  slug: string
  title: string
  content: string | null
  status: string
  published_at: string | null
}

// eslint-disable-next-line ts/consistent-type-definitions -- must stay a type alias, see comment above
export type PostInsert = {
  id?: never
  created_at?: string
  updated_at?: string
  slug: string
  title: string
  content?: string | null
  status?: string
  published_at?: string | null
}

export type PostUpdate = Partial<PostInsert>

/**
 * The generated `Database` type comes from a live database. It has no
 * `posts` table until the layer migration runs and the Supabase CLI
 * regenerates the snapshot. This shim adds the table so the layer
 * typechecks on its own. Remove the `posts` block after the generated
 * snapshot declares the table.
 */
export type BlogDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables'> & {
    Tables: Database['public']['Tables'] & {
      posts: {
        Row: PostRow
        Insert: PostInsert
        Update: PostUpdate
        Relationships: []
      }
    }
  }
}

export type Post = PostRow

export interface FormPost {
  title: string
  slug: string
  content: string
  status: PostStatus
}
