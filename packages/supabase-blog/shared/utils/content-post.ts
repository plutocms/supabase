// The `post` content type. It maps onto the `posts` table columns from
// `db/migrations/001_baseline.sql`: id, created_at, updated_at, slug,
// title, content, status, published_at. See the content-model skill in
// `@plutocms/core` for the full field/status/timestamp contract.
//
// `defineContentType` and the field types come from `@plutocms/core`'s
// `shared/utils`/`shared/types`, auto-imported the same way every other
// shared/utils export is across this layer (see, for example,
// `definePlutoExtension` in `app/plugins/pluto-extension.ts`). This file
// needs no explicit import for them.
//
// This file lives under `shared/utils/`, not a bespoke `shared/content/`
// folder — that placement is load-bearing, not stylistic. Nuxt's
// shared-imports auto-import only wires a real runtime import for names
// under `shared/utils/**` and `shared/types/**`; a value exported from an
// arbitrary `shared/` subfolder gets a type-only declaration (enough to
// satisfy `nuxi typecheck`) but no actual import injected into the
// compiled bundle. That gap only surfaces for a *consumer* extending this
// layer as a dependency — this layer's own dev server never needs the
// cross-layer path, so wave 5 shipped `postType` under `shared/content/`
// and both `server/plugins/content.ts` and `app/plugins/pluto-extension.ts`
// imported it explicitly via `#shared/content/post`. That alias resolves
// only to the *top-level app's own* `shared/` folder, never to this
// layer's, so it broke at Nitro startup ("postType is not defined") for
// any real site extending this layer instead of running it directly.
// Moving the file here and dropping the explicit import is the fix,
// confirmed live against `pluto-supabase-blog-template`.
//
// `basePath`/`newPath`/`editPath` point the generic list and form UI at
// this layer's existing, already-deployed admin URLs
// (`/admin/posts`, `/admin/post/new`, `/admin/post/edit/:id`) instead of
// the `/admin/content/post` convention `autoRoutes` would otherwise imply.
// `autoRoutes: false` keeps this content type from generating its own
// nav/pages entries — `app/plugins/pluto-extension.ts` already declares
// them by hand, at these same URLs.
export const postType = defineContentType({
  name: 'post',
  label: 'Post',
  labelPlural: 'Posts',
  icon: 'lucide:file-text',
  source: 'posts',
  titleField: 'title',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      required: true,
      inList: true,
      region: 'main',
    },
    {
      name: 'slug',
      type: 'slug',
      label: 'Slug',
      from: 'title',
      preview: '/posts/',
      inList: true,
      region: 'side',
    },
    // The cover: the id of a file of the core media library (the `posts.cover`
    // column). The public API gives the record. See the media skill of
    // `@plutocms/core`.
    {
      name: 'cover',
      type: 'media',
      label: 'Cover image',
      accept: ['image/*'],
      region: 'side',
    },
    {
      name: 'content',
      type: 'richtext',
      label: 'Content',
      region: 'main',
      // The core post editor: the rich text editor (Visual), or the Markdown
      // source next to a preview of the site (Markdown), with an outline.
      widget: 'post-canvas',
    },
  ],
  slug: { field: 'slug' },
  // The "View Post" link of the form: the post page of the Supabase blog
  // template (`pages/posts/[slug].vue`). A draft has no public page.
  previewUrl: (item) =>
    item.status === 'published' && typeof item.slug === 'string' && item.slug
      ? `/posts/${item.slug}`
      : undefined,
  // The canvas layout: the body fills the center, the outline is on the left,
  // and the other fields are in the panel on the right.
  form: {
    layout: 'canvas',
    canvasField: 'content',
    leftPanel: {
      label: 'pluto.post.outline',
      class: 'bg-white dark:bg-[#0b0b0b]',
    },
  },
  status: {
    column: 'status',
    default: 'draft',
    publishedValue: 'published',
    publishedAtColumn: 'published_at',
    values: [
      { label: 'Draft', value: 'draft' },
      { label: 'Published', value: 'published' },
    ],
  },
  timestamps: { created: 'created_at', updated: 'updated_at' },
  capabilities: {
    read: 'posts:read_drafts',
    write: 'posts:publish',
    delete: 'posts:delete',
  },
  autoRoutes: false,
  // The public API (`/api/pluto/v1/content/post`): published posts only. The server hook
  // `toPublic` (server/utils/post-public.ts) adds `excerpt` to a list item and `html` to one item.
  api: { public: true },
  basePath: '/admin/posts',
  newPath: '/admin/post/new',
  editPath: (id) => `/admin/post/edit/${id}`,
  // "New Post" in the admin bar, and "Edit Post" on a post page that calls
  // `usePlutoEditLink('post', post.id)`. The id, not the slug: a save matches the id.
  adminBar: true,
})
