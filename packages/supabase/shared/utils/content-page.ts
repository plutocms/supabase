import { definePlutoPageType } from '@plutocms/core/shared/utils/page-type'

// The `page` content type on Supabase: the definition of core (`definePlutoPageType`) with the
// storage parts of `db/migrations/013_pages.sql`. A site gets it with `plutoPages.enabled`.
// The explicit import is on purpose: this layer imports the helper from the package of core.
export const supabasePageType = definePlutoPageType({
  source: 'pages',
  publishedAtColumn: 'published_at',
  timestamps: { created: 'created_at', updated: 'updated_at' },
  defaultSort: { field: 'slug', direction: 'asc' },
  capabilities: {
    read: 'pages:read_drafts',
    // A contributor (pages:write) saves drafts and sends them to review; an editor publishes.
    write: 'pages:write',
    publish: 'pages:publish',
    delete: 'pages:delete',
  },
  // Scheduled publish and pending review, like the posts of the blog.
  status: { schedule: true, review: true },
})
