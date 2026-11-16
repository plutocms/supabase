# Pages

The base layer has the `page` content type: pages with a block body and a nested path
(`about/team`). Every Supabase site has the table (migration `013_pages.sql`). A site uses it
only when it turns pages on.

## Turn pages on

Set the core option in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  plutoPages: { enabled: true },
})
```

The default is `false`, so a site that does not use pages has no empty menu item. The option sets
`runtimeConfig.public.plutoPages.enabled`. Then:

- `server/plugins/pages.ts` registers `supabasePageType` with the content registry of core, so
  the generic content routes and the public API know the type.
- `app/plugins/pluto-extension.ts` registers the type and the four capabilities on the client.

The site needs the migration applied (the Migrations page of the admin) and a catch-all route
(`pages/[...path].vue`) that calls `usePage(path)` and renders `<PlutoBlocks :value="page.blocks" />`.

## The type

`shared/utils/content-page.ts` calls `definePlutoPageType` of `@plutocms/core`
(`shared/utils/page-type.ts`) with the Supabase storage parts. The explicit import is on purpose.
The definition is the same for every backend; see the content-model skill of core ("Pages").

- `source: 'pages'`, `timestamps` `created_at` and `updated_at`, `publishedAtColumn: 'published_at'`.
- `status` has `schedule: true` and `review: true`, like the posts of the blog.
- `capabilities`: read `pages:read_drafts`, write `pages:write`, publish `pages:publish`, delete
  `pages:delete`. The admin role holds them with its wildcard. Give them to another role in the
  Roles editor. No migration grants them to a role: a page is public content, so the grant is a
  choice of the owner of the site.
- Revisions, backups, trash and scheduled publish are the generic features of the adapter. They
  find the type by its name, so a page works like a post. See the content-adapter skill.
- The public item has `blocks` and no `html` (core does it for every type whose body has
  `widget: 'blocks'`).

## The table

`public.pages` is the shape of `public.posts` after the blog migrations 001 to 010, plus
`description`:

- Columns: `id` (identity), `created_at`, `updated_at`, `slug` (unique; the whole path), `title`,
  `description`, `body`, `status`, `published_at`, `deleted_at`.
- `status` is `draft`, `review`, `scheduled` or `published`. `public.pluto_is_live` is the live
  rule; the migration has it with `create or replace`, like the blog and the shop.
- `slug` cannot start or end with `/` and cannot be empty.
- No trigger sets `updated_at`: the content adapter stamps it, as for posts.
- RLS (capability policies, as `003_capability_policies.sql` of the blog): anon reads live pages
  that are not in the trash. A signed-in user reads the same; `pages:read_drafts` reads all;
  `pages:delete` reads the trash. Insert and update need `pages:write` or `pages:publish`. Delete
  needs `pages:delete`. A separate update policy lets `pages:delete` move a page to the trash.
- Two guards (triggers, for the `authenticated` role only): without `pages:publish` a page can
  only be a draft or in review, and a published or scheduled page does not change. A role with only
  `pages:delete` changes `deleted_at` only.
- Grants: anon select; authenticated and service_role select, insert, update and delete.

Tests: `test/pages-migration.test.ts` runs migrations 001 to 013 in PGlite (Postgres in memory,
with stub roles and auth functions; no real database), `test/content-page.test.ts` and
`test/data-api-grants.test.ts`.
