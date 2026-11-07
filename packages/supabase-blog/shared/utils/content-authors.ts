// The author type of the blog: the public profile of a post author (a name, a slug, a bio and an
// avatar). The table is `authors` (`db/migrations/008_post_authors.sql`). It has no link to a
// sign-in user and holds no private data. A post stores the ids of its authors in `author_ids`
// (see `content-post.ts`). Writing and deleting an author need `authors:manage`. See the authors
// skill of `@plutocms/core`.
//
// This file is in `shared/utils/` for the same reason as `content-post.ts`: only that folder gets
// a real auto-import for a consumer of this layer.

export const blogAuthorType: PlutoContentType = defineContentType({
  name: 'author',
  label: 'Author',
  labelPlural: 'Authors',
  icon: 'lucide:user-pen',
  source: 'authors',
  titleField: 'name',
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Name',
      required: true,
      inList: true,
      region: 'main',
    },
    {
      name: 'slug',
      type: 'slug',
      label: 'Slug',
      from: 'name',
      preview: '/authors/',
      inList: true,
      region: 'main',
    },
    {
      name: 'bio',
      type: 'textarea',
      label: 'Bio',
      rows: 3,
      region: 'main',
    },
    {
      name: 'avatar',
      type: 'media',
      label: 'Avatar',
      accept: ['image/*'],
      region: 'main',
    },
  ],
  slug: { field: 'slug' },
  // The author page of the site. Change it with `extendContentTypes` when the site uses another
  // path.
  previewUrl: (item) =>
    typeof item.slug === 'string' && item.slug
      ? `/authors/${item.slug}`
      : undefined,
  timestamps: { created: 'created_at', updated: 'updated_at' },
  capabilities: {
    write: 'authors:manage',
    delete: 'authors:manage',
  },
  defaultSort: { field: 'name', direction: 'asc' },
  navOrder: 230,
  // An author is public once saved: the public API gives it, and the post field expands to it.
  api: { public: true },
})
