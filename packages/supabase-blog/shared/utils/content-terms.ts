// The term types of the blog: `tag` and `category`. A term is a content type, so the admin, the
// public API and the filters need no special case. The tables are `tags` and `categories`
// (`db/migrations/007_post_terms.sql`). A post stores the ids of its terms in the columns
// `tag_ids` and `category_ids` (see `content-post.ts`). Writing and deleting a term need
// `terms:manage`. See the tags-and-categories skill of `@plutocms/core`.
//
// This file is in `shared/utils/` for the same reason as `content-post.ts`: only that folder gets
// a real auto-import for a consumer of this layer.

interface TermTypeOptions {
  name: 'tag' | 'category'
  label: string
  labelPlural: string
  icon: string
  source: string
  /** The path of the term page of the site, with the trailing slash. */
  path: string
  navOrder: number
}

function termType(options: TermTypeOptions): PlutoContentType {
  return defineContentType({
    name: options.name,
    label: options.label,
    labelPlural: options.labelPlural,
    icon: options.icon,
    source: options.source,
    titleField: 'title',
    fields: [
      {
        name: 'title',
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
        from: 'title',
        preview: options.path,
        inList: true,
        region: 'main',
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Description',
        region: 'main',
      },
    ],
    slug: { field: 'slug' },
    // The term page of the site. Change it with `extendContentTypes` when the site uses another
    // path.
    previewUrl: (item) =>
      typeof item.slug === 'string' && item.slug
        ? `${options.path}${item.slug}`
        : undefined,
    timestamps: { created: 'created_at', updated: 'updated_at' },
    capabilities: {
      write: 'terms:manage',
      delete: 'terms:manage',
    },
    defaultSort: { field: 'title', direction: 'asc' },
    navOrder: options.navOrder,
    // The terms are public: the public API gives them and the post fields expand to them.
    api: { public: true },
  })
}

export const blogTagType = termType({
  name: 'tag',
  label: 'Tag',
  labelPlural: 'Tags',
  icon: 'lucide:tag',
  source: 'tags',
  path: '/tags/',
  navOrder: 210,
})

export const blogCategoryType = termType({
  name: 'category',
  label: 'Category',
  labelPlural: 'Categories',
  icon: 'lucide:folder',
  source: 'categories',
  path: '/categories/',
  navOrder: 220,
})

/** The term types that register with `post`. */
export const blogTermTypes: PlutoContentType[] = [blogTagType, blogCategoryType]
