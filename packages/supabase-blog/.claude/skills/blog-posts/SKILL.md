---
name: blog-posts
description: Blog post admin (create, edit, list, delete) with a rich text editor and image upload.
---

# Blog posts

This skill covers the blog post feature in the `supabase-blog` layer. It lets an admin create,
edit, list, and delete blog posts. Each post has a title and a rich text body.

## The `posts` table

The table is defined in this layer's `db/migrations/` directory (see below). It has these
columns:

- `id` — bigint. The primary key. The database generates it.
- `created_at` — timestamptz. The database sets it when a row is created.
- `updated_at` — timestamptz. The API sets it on every create and edit.
- `slug` — text. Unique. It forms the public post path, `/posts/<slug>`.
- `title` — text. Required.
- `content` — text. The post body, in markdown. It can hold inline images.
- `status` — text. Either `draft` or `published`. The default is `draft`.
- `published_at` — timestamptz. Null until the post is published for the first time. The API
  sets it on the first publish only. It does not clear it when a post goes back to draft. A
  post that is unpublished and then published again keeps its original date.

Row Level Security rules use named capabilities, checked through
`public.has_capability(cap)` (from `@plutocms/supabase` 0.7.0+):

- `posts:read_drafts` — read a row where `status = 'draft'`. An anonymous visitor (`anon`)
  always reads only rows where `status = 'published'`, capability or not.
- `posts:publish` — insert a row, or update any row.
- `posts:delete` — delete any row.
- `terms:manage` — insert, update or delete a row of `tags` or `categories` (see "Tags and categories").
- `authors:manage` — insert, update or delete a row of `authors` (see "Authors").

`public.has_capability()` folds in `public.is_admin()`, so an admin holds every
capability with no extra setup. There is no ownership-scoped capability yet — a holder of
`posts:publish` can edit every post, not only their own.

### How the migration applies

This layer ships versioned migrations under `db/migrations/`, following the convention
described in `@plutocms/supabase`'s own `layer-migrations` skill. See that skill for how the
engine discovers, applies, and records migrations. This layer's migration files, in order:

- `db/migrations/001_baseline.sql` — the `posts` table, its indexes, and the original RLS
  policies. This is the exact schema released in `v0.1.3`.
- `db/migrations/002_admin_policies.sql` — hardens the `posts` RLS policies so that reading a
  draft, and every insert, update, and delete, requires `public.is_admin()`.
- `db/migrations/003_capability_policies.sql` — rewrites the same four `posts` RLS policies to
  the three named capabilities above, instead of `public.is_admin()`.
- `db/migrations/004_data_api_grants.sql` — the table grants of the Data API.
- `db/migrations/005_post_cover.sql` — the `cover` column (see "Media").
- `db/migrations/006_post_seo.sql` — the SEO columns for the `@plutocms/seo` add-on layer:
  `seo_title`, `seo_description`, `seo_image` (a media id, like `cover`) and `seo_noindex`
  (default false). This layer does not depend on `@plutocms/seo` and defines no field for them:
  the add-on adds the fields to the `post` type and names the columns (`PLUTO_SEO_FIELDS`). Without
  the add-on, the columns stay empty.

- `db/migrations/007_post_terms.sql` — the tables `tags` and `categories`, the columns
  `posts.tag_ids` and `posts.category_ids`, their RLS, grants, the `terms:manage` capability and the
  delete triggers (see "Tags and categories").
- `db/migrations/008_post_authors.sql` — the table `authors`, the column `posts.author_ids`, its RLS,
  grants, the `authors:manage` capability and the delete trigger (see "Authors").
- `db/migrations/009_trash.sql` — the trash: `deleted_at` and a partial index on `posts`, `tags`,
  `categories` and `authors`. The public reads hide a trashed row (anon and a signed-in user with no
  capability); staff with the delete capability of the type (`posts:delete`, `terms:manage`,
  `authors:manage`) reads it. A role with `posts:delete` may update a post
  (`"Allow posts:delete trash on posts"`), and the trigger `posts_trash_only_guard` keeps a signed-in
  user without `posts:publish` to `deleted_at` (and `updated_at`). The guard checks `current_user =
'authenticated'`, so the delete triggers (security definer) and the service role pass. The post,
  term and author types have `trash: true`. The delete triggers run at the purge, not at the trash.
- `db/migrations/010_scheduled_publish.sql` — scheduled publish and pending review: the status check
  allows `draft`, `review`, `scheduled`, `published`; `public.pluto_is_live(status, published_at)`
  (published, or scheduled with a time that has come) in both read policies; the capability
  `posts:write` (every role with `posts:publish` gets it) and the built-in role `contributor`
  (`posts:write`, `posts:read_drafts`); insert and update need `posts:write` or `posts:publish`;
  the trigger `posts_status_guard` keeps a signed-in user without `posts:publish` to drafts and
  review, and refuses a change of a published or scheduled post (a trash-only change passes). The
  trash guard of 009 also passes `posts:write`. The post type: `schedule: true`, `review: true`,
  `write: 'posts:write'`, `publish: 'posts:publish'`.

## Tags and categories

A term is a content type (`shared/utils/content-terms.ts`: `blogTagType`, `blogCategoryType`, `blogTermTypes`).
Both are public on the public API, have no status, sort by `title`, and take `created_at` and
`updated_at`. Their nav order is 210 and 220. Writing and deleting need `terms:manage`. The
server plugin and the client plugin register them with `post`. The tables have `id` (identity),
`created_at`, `updated_at`, `title`, `slug` (unique) and `description`.

A post stores the ids of its terms in `category_ids` and `tag_ids` (`bigint[] not null default '{}'`,
GIN indexes). There is no join table and no foreign key per element. The post fields `categories`
and `tags` are `multiple` `reference` fields with `create: true`, mapped to those columns. Core
expands them in the public API to `{ id, label, slug }` and resolves `?filter[tags]=<slug>` to the
id. The adapter then filters with `contains` (see the content-adapter skill of `@plutocms/supabase`).

Migration 007 gives `terms:manage` to every role that holds `posts:publish`. The built-in admin role
holds `*`. Two `security definer` functions (`search_path = ''`, execute revoked from public, anon
and authenticated) run in `after delete` triggers on `tags` and `categories`. They remove the
deleted id from the posts with `array_remove`, so a post never keeps a dangling id. A post save
fails until the migration runs. `test/post-terms-migration.test.ts` checks the text of the SQL.

## Authors

An author is the public profile of a post author (`shared/utils/content-authors.ts`:
`blogAuthorType`): `name` (the title field), `slug`, `bio` and `avatar` (a media id). It is
public on the public API, has no status, sorts by `name`, and takes `created_at` and `updated_at`.
Its nav order is 230. Writing and deleting need `authors:manage`. The server plugin and the client
plugin register it with `post`. See the authors skill of `@plutocms/core`.

The table `authors` has `id` (identity), `created_at`, `updated_at`, `name`, `slug` (unique), `bio`
and `avatar`. It has no link to a sign-in user. A visitor reads every column (the public API reads
with `select('*')`), so never add a user id, an email or a role to it.

A post stores the ids of its authors in `author_ids` (`bigint[] not null default '{}'`, a GIN index),
in byline order. The post field `authors` is a `multiple` `reference` field with `create: true`,
`remember: true` (a new post gets the authors that the user saved last time) and
`publicFields: ['avatar', 'bio']`. Core expands it in the public API to
`[{ id, label, slug, avatar, bio }]` and resolves `?filter[authors]=<slug>`.

Migration 008 gives `authors:manage` to every role that holds `posts:publish`. A `security definer`
function in an `after delete` trigger on `authors` removes the deleted id from the posts. A post
save fails until the migration runs. `test/post-authors-migration.test.ts` checks the text of the
SQL, and the copy test of the plan ran it on PGlite.

## The public API

The layer has no route of its own. The public site, in Nuxt or in any other stack, reads posts
through core's public API (see "The public API" in the content-model skill of `@plutocms/core`):

- `GET /api/pluto/v1/content/post` — the published posts, `{ data, meta: { total, limit, offset } }`.
  Query: `limit`, `offset`, `search`, `sort` (`-publishedAt`, `title`, …), `filter[slug]`.
- `GET /api/pluto/v1/content/post/<id or slug>` — one published post, `{ data }`. A draft or a
  missing post answers 404.
- The post type sets `api: { public: true }`. An item has `id`, `title`, `slug`, and `createdAt`,
  `updatedAt`, `publishedAt` (the Supabase adapter's `timestampKeys`).
- `server/utils/post-public.ts` (`postToPublic`, the `hooks.toPublic` that `server/plugins/content.ts`
  attaches): a list item has no `content` and has `excerpt` (`richtextToPlainText`, cut at a word
  to 200 characters, `cutText`). One item keeps the stored `content` and adds `html`: the body
  rendered and sanitized by `renderRichtext`, the same code as `PlutoProse`. Tests:
  `test/post-public.test.ts`.
- In Nuxt, use core's `usePlutoPublicList('post', { … })` and `usePlutoPublicItem('post', slug)`.
  Show `html` with `PlutoProse` (pass `format: 'html'`) or set it as `innerHTML`.

The old routes `GET /api/post/list` and `GET /api/post/get/:id` and the `usePost` composable are
gone. The admin UI writes through the generic `/api/_pluto/content/post/*` routes (see "The admin
UI: the `post` content type" below).

## The admin UI: the `post` content type

`/admin/posts`, `/admin/post/new`, and `/admin/post/edit/:id` no longer run hand-written pages
and forms. They run `@plutocms/core`'s generic content-model admin UI, against one content
type declared in `shared/utils/content-post.ts`:

- `app/pages/admin/posts.vue` renders `<PlutoContentList type="post" />`.
- `app/pages/admin/post/new.vue` renders `<PlutoContentForm type="post" />`.
- `app/pages/admin/post/edit/[id].vue` renders `<PlutoContentForm type="post" :id="..." />`.

`shared/utils/content-post.ts` declares the `title`, `slug`, and `content` fields, the `status`
workflow (`draft`/`published`, stamping `published_at` the first time a post is published), the
`created_at`/`updated_at` timestamps, and the three capabilities above. It sets
`autoRoutes: false` and explicit `basePath`/`newPath`/`editPath` values, so the URLs above never
changed — see `@plutocms/core`'s content-model skill for what every field on a content type
means, and `@plutocms/supabase`'s content-adapter skill for how a content type maps onto a real
table.

The old hand-written equivalents — `app/components/PostForm.vue`, and the `PostForm`-rendering
bodies of the three pages above — are gone. `app/components/PostEditor.vue` (the rich text
editor, see "The rich text editor" and "Image upload" below) keeps its plain `v-model` contract,
but the generic form does not call it directly: `app/components/PlutoRichtextField.vue` adapts
that `v-model` to the `field`/`modelValue`/`disabled`/`update:modelValue` contract every
content-model field widget shares, and is registered for the `richtext` field type in
`app/plugins/pluto-extension.ts`, with `defineAsyncComponent`. The Tiptap and ProseMirror code then
stays out of the entry chunk, and core shows a field skeleton while the editor chunk loads.

## The rich text editor

`app/components/PostEditor.vue` builds a `@tiptap/vue-3` editor directly, with `useEditor()`.
It does not use Nuxt UI's `<UEditor>` component. `<UEditor>`'s own `onUpdate` handler always
serializes the whole document to markdown on every keystroke, with no way to debounce it. Under
fast typing or a held backspace, that serialization queues up and freezes the page. Building the
editor directly gives full control over when serialization happens.

The toolbar and menu item definitions (fixed toolbar, bubble toolbar, suggestion menu, and the
drag-handle's block menu) live in `app/utils/postEditorItems.ts`. The editor reads them through
`usePostEditorItems()` (see "Translation" below).

Content components (the content-components skill of core): the extensions have
`PlutoContentComponentNode` of core (a chip with a props form). `usePostEditorItems()` reads
`usePlutoContentComponents()`: with at least one component, the fixed toolbar gets a `component`
slot (filled with `PlutoBlockInsertMenu` of core), and the Insert group of the slash menu gets one
`plutoComponent` item per component (`{ name, label, icon }`). The custom handler `plutoComponent`
runs `insertPlutoComponent(item.name)`. The tests stub `usePlutoContentComponents`.

### Markdown at the boundary

The document lives as native ProseMirror state while the user types. `PostEditor.vue` never
calls `editor.getMarkdown()` (a full-document serialize) inside the editor's `onUpdate` handler.
Instead:

- `onUpdate` only marks the document dirty and (re)starts a 400ms debounce timer.
- The debounce timer's callback, and the editor's `onBlur` handler, do the real markdown
  serialization and write it to the component's `v-model`.
- An external change to the `v-model` (for example, the parent loading a different post) is
  compared against the last markdown string this component itself emitted. If it matches, the
  incoming change is the component's own echo, and it is ignored — no re-serialization needed to
  detect that.

- `PostEditor.vue` exposes `flush()` (`defineExpose`): it clears the timer and runs the same flush
  as a blur. `PlutoRichtextField.vue` registers it with `usePlutoContentForm()?.onFlush(...)`, so
  the content form of core flushes the editor before it builds the payload of a save and before it
  writes a backup (browser and server copy). Without this, a Ctrl+S right after typing could miss
  up to 400 ms of text.

This keeps every keystroke cheap. The only place a full-document serialization ever runs is the
debounced flush, at most once per 400ms of active typing, plus once on blur.

### Removed features

Mention, Emoji, and Horizontal Rule are not in the editor. They may return later as separate
features. Text Align was removed too — it was a toolbar button that never worked, because the
`@tiptap/extension-text-align` package was never installed.

### Canvas layout and publish controls

The `post` content type sets `form: { layout: 'canvas', canvasField: 'content', leftPanel: {
label: 'pluto.post.outline', … } }`, and the `content` field sets `widget: 'post-canvas'`. The
`post-canvas` widget is the core post editor of `@plutocms/core`:

- **Visual** mode shows the `richtext` widget of this layer (`PlutoRichtextField.vue`, which
  wraps `PostEditor.vue`) with the `canvas` prop. In canvas, the wrapper has no label and no
  border, and the text fills the rest of the height (the compose panel of core scrolls, not the
  widget). `PostEditor` gets `canvas` too: its fixed toolbar is a separate rounded bar, one step
  darker than the text (`bg-pluto-toolbar` of core), sticky at `top-2`, in one row
  (`EditorToolbar` `overflow`: the items that do not fit go into a **More tools** popover,
  `supabase-blog.editor.moreTools`). The image upload stays.
- **Markdown** mode shows the Markdown source next to a preview of the site. The preview is an
  iframe of `/_pluto/post-preview`. An app can replace the default preview with its own
  `components/PlutoPostPreview.vue`.
- The left panel shows the outline (the headings of the post) and the mode switch. Markdown that
  the visual editor cannot keep turns Visual off.
- The title is above the editor (core shows it, and takes it out of the right panel). The other
  fields (the slug and the rest) are in the panel on the right.
- The form's toolbar shows the post status (Draft or Published), Save draft or Update, Publish,
  and an overflow menu with Unpublish and Delete. Publish uses the `posts:publish` capability.

`@plutocms/core`'s `admin-view-chrome` and `git-cms` skills describe the canvas layout and
the post editor. This layer only sets the config and gives the `canvas` prop to its widget.

The editor's sticky toolbar uses `z-10`, not `z-50`. The admin navbar uses `z-50`. The editor
toolbar must stay below page-level chrome.

## Images

A post body can hold inline images, and a post has a cover. Both use the media library of core
(the media skill of `@plutocms/core`), with the Supabase driver of `@plutocms/supabase`:

1. The image button of the toolbar, or the "Image" entry of the suggestion menu, runs the
   `imageUpload` custom handler of `PostEditor.vue`. It opens `PlutoMediaPicker` (images only).
2. In the picker, the editor picks a file or uploads one. The browser makes a photo WebP (at
   most 2400 px, no metadata), and core checks it on the server.
3. `onInsertMedia` gets the chosen records and inserts the first one:
   `editor.chain().focus().setImage({ src: image.url, alt: image.alt }).run()`.

The `cover` field (`type: 'media'`, `accept: ['image/*']`) stores the id of a media record in
`posts.cover` (`db/migrations/005_post_cover.sql`). The core `media` widget edits it. The public
API gives the record (`url`, `width`, `height`, `alt`) in place of the id.

## Translation

The admin text of this layer uses the i18n system of `@plutocms/core` (see the `i18n` skill
in `pluto`). The shipped languages are `en` and `pt-BR`. The English text is the same, byte for
byte, as before.

- `i18n/locales/en.json` and `i18n/locales/pt-BR.json` hold all keys. The layer namespace is
  `supabase-blog`. Shared words use `pluto.common.*` (for example `pluto.common.delete`).
- The `post` content type keeps its English literals in `shared/utils/content-post.ts`. The keys
  `content.post.label`, `content.post.labelPlural`, `content.post.fields.<field>.label`, and
  `content.post.status.<value>` translate it. Core finds them by convention. The type has no field
  descriptions, placeholders, or select options, so it has no keys for them. Add a key with the
  same pattern when the type gets one.
- `app/plugins/pluto-extension.ts` holds keys, not text, for the nav labels, the page titles, and
  the capability labels. Pluto resolves them with `tx()`.
- `PlutoRichtextField.vue` builds the editor placeholder from the translated field label:
  `supabase-blog.editor.fieldPlaceholder` with `{label}` in lowercase. The field label is already
  translated, because `PlutoContentField` hands the widget a translated copy of the field.

### Editor items

`usePostEditorItems()` (`app/composables/post-editor-items.ts`) returns the fixed toolbar, the
bubble toolbar, the suggestion menu, and `createBlockMenuItemTree`. The three arrays are
`computed`, so a language switch updates them. The pure builders are in
`app/utils/postEditorItems.ts`. They take a translate function: `createFixedToolbarItems(t)`,
`createBubbleToolbarItems(t)`, `createSuggestionItems(t)` and
`createBlockMenuItemTree(t, editor, selectedNode)`. Snapshot tests hold the English items, so the
English text cannot drift.

The block menu names the selected node ("Paragraph", "BulletList"). The map `NODE_TYPE_KEYS` gives
the key for each known node type. The English values keep the old spelling ("BulletList"). An
unknown node type shows its name through `upperFirst`, in English.

The toolbar items are built outside Vue reactivity (see `useEditorSnapshot`).
`EditorToolbar.vue` passes a `rebuildOn` getter to `useEditorSnapshot`, so the toolbar rebuilds
when its `items` prop or the admin language changes.

The Tiptap placeholder is a function. `PostEditor.vue` sends an empty transaction when the language
changes, so the editor draws the placeholder again at once.

### Server errors

The public API of core answers its own errors (`pluto.errors.notFound` for a missing or draft
post). This layer has no route of its own, so it throws no server error of its own.

### Not translated

- The public prose rendering (`PlutoProse`) and the public pages. They belong to the app's site
  scope (`usePlutoSiteI18n`).
- Server code and logs.

### Tests

`test/i18n-locale-files.test.ts` checks that every locale has the same keys, placeholders, and
plural form count as `en`, and no empty value. The top-level namespaces are only `supabase-blog`
and `content`, and `content` holds only `post`. It checks that the English `content.post.*` text
equals the literals of the type. It also scans `app/`, `server/`, and `shared/` for literal
`supabase-blog.*` and `pluto.*` keys. Each key must exist, and each `supabase-blog.*` key of
`en.json` must be used. Keep a key that the code builds at run time as a full literal.
`test/post-editor-items.test.ts` checks the English editor items against snapshots.
`test/fixtures/i18n-stub.ts` builds a translator over the English messages.

## The `BlogDatabase` shim

`shared/types/post.ts` declares `BlogDatabase`. It takes the generated `Database` type (from
`shared/types/supabase.ts`, which is gitignored and regenerated per environment) and adds a
`posts` table to it. Without the shim, none of this layer's code that calls
`client.from('posts')` would typecheck, because the generated snapshot has no `posts` table
until this layer's migration has run once against a real database and the Supabase CLI has
regenerated the snapshot from it.

Delete the `posts` block from `BlogDatabase` once the generated `Database` snapshot declares
the `posts` table on its own. At that point `BlogDatabase` can become a plain alias for
`Database`, or every reference to `BlogDatabase` can move back to `Database`.

## Data API grants

`db/migrations/004_data_api_grants.sql` grants `public.posts` for the Data API (anon `select` only, authenticated and service_role `select, insert, update, delete`). The anon policy still shows published posts only. A new table in this layer needs a grant in the same migration file. See the `layer-migrations` skill in `@plutocms/supabase`.
