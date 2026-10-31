import type { BlogDatabase, FormPost, PostInsert } from '../shared/types/post'
import { describe, expectTypeOf, it } from 'vitest'

// Guards the schema/type-generation gap this layer starts with:
// the content adapter of @plutocms/supabase and server/utils/post-public.ts
// read a `posts` table that the generated Database
// snapshot (shared/types/supabase.ts, gitignored, regenerated per environment)
// does not declare until the layer migration runs and the Supabase CLI
// regenerates it. shared/types/post.ts adds a `BlogDatabase` shim so the layer
// typechecks on its own in the meantime. Delete the shim, and this test's
// `BlogDatabase` assertions, once the generated snapshot declares `posts`.
describe('blogDatabase shim', () => {
  it('declares the posts table shape the public read routes depend on', () => {
    type PostRow = BlogDatabase['public']['Tables']['posts']['Row']

    expectTypeOf<PostRow>().toHaveProperty('id').toEqualTypeOf<number>()
    expectTypeOf<PostRow>().toHaveProperty('slug').toEqualTypeOf<string>()
    expectTypeOf<PostRow>().toHaveProperty('title').toEqualTypeOf<string>()
    expectTypeOf<PostRow>()
      .toHaveProperty('content')
      .toEqualTypeOf<string | null>()
    expectTypeOf<PostRow>().toHaveProperty('status').toEqualTypeOf<string>()
  })

  it('accepts no value for id, the identity column', () => {
    expectTypeOf<PostInsert['id']>().toEqualTypeOf<undefined>()
  })
})

describe('formPost shape', () => {
  it('has exactly the four fields the post form submits', () => {
    expectTypeOf<FormPost>().toEqualTypeOf<{
      title: string
      slug: string
      content: string
      status: 'draft' | 'published'
    }>()
  })
})
