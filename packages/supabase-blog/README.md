# Blog layer for Pluto with Supabase

This layer adds a blog to Pluto. It stores posts in Supabase. Editors write them in the Pluto admin with a rich text editor. The layer builds on [`@plutocms/supabase`](https://github.com/plutocms/supabase).

**Docs:** [Blog layer](https://pluto.vulmix.dev/docs/layers/blog)

## What the layer gives

- **Post admin:** list, create, edit and delete posts at `/admin/posts`, `/admin/post/new` and `/admin/post/edit/:id`. The pages run on the generic content UI of `@plutocms/core`, against the `post` content type.
- **Rich text editor:** a Tiptap editor that stores Markdown. It runs in the core post editor: a Visual mode, a Markdown mode with a preview of the site, an outline of the headings, and draft/publish controls.
- **Images:** a cover image, and inline images in the body. The editor picks a file or uploads one, through the media library of `@plutocms/core` (stored in Supabase Storage).
- **Tags and categories:** the `tag` and `category` content types, and the post fields `categories` and `tags` with an inline create. The public API gives them on each post and filters by them (`?filter[tags]=<slug>`).
- **Authors:** the `author` content type (a name, a bio and an avatar), and the post field `authors`, in byline order, with an inline create. A new post gets the authors that you saved last time. The public API gives each author with the avatar and the bio, and filters by them (`?filter[authors]=<slug>`). An author has no link to a user account, so no user data goes to the public site.
- **Capabilities:** `posts:read_drafts`, `posts:write`, `posts:publish` and `posts:delete` gate the actions. The Contributor role (`posts:write`) writes posts and sends them to review. `terms:manage` gates creating, editing and deleting a tag or a category. `authors:manage` gates creating, editing and deleting an author. An admin holds all six.
- **Public data:** the published posts on the public API of Pluto, for a site in any stack: `GET /api/pluto/v1/content/post` and `GET /api/pluto/v1/content/post/<id or slug>`. A list item has an `excerpt`, and one post has its body as sanitized `html`. In Nuxt, use `usePlutoPublicList` and `usePlutoPublicItem`. See https://pluto.vulmix.dev/docs/build/public-api.
- **`PlutoProse`:** a component that shows a stored richtext value (Markdown, HTML or Tiptap JSON) as sanitized, styled HTML. Use it on a public post page.
- **Migrations:** the `posts` table and its policies ship as layer migrations. An admin applies them from `/admin/migrations`.

For the full detail, see [FEATURES.md](./FEATURES.md).

## Requirements

- A Supabase project, with `SUPABASE_URL` and `SUPABASE_KEY` in your `.env`. See [Supabase](https://pluto.vulmix.dev/docs/supabase).
- Nuxt 4 and a Tailwind entry file that your app owns. See [Styles](https://pluto.vulmix.dev/docs/build/styles).

## Installation

Install the layer. It brings `@plutocms/supabase` (and with it `@plutocms/core`). Your app extends only this layer.

```bash
# npm
npm i @plutocms/supabase-blog

# pnpm
pnpm add @plutocms/supabase-blog

# bun
bun add @plutocms/supabase-blog
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@plutocms/supabase-blog'],
})
```

The `package.json` of the app lists only `@plutocms/supabase-blog`, besides `nuxt`, `vue` and `vue-router`.

## Links

- Starter: the blog template, [`blog`](https://github.com/plutocms/templates/tree/main/templates/blog) of `plutocms/templates`, with the Supabase backend: `npm create pluto@latest my-blog -t blog --backend supabase`. The same template works with the Git CMS.

## Development

This package lives in the [`plutocms/supabase`](https://github.com/plutocms/supabase) monorepo, in `packages/supabase-blog`. Run `bun install` at the root of the repo, then the scripts of the package (`bun run --cwd packages/supabase-blog dev`). Bun links `@plutocms/supabase` from the workspace, so you do not need `PLUTO_SUPABASE_PATH`. Each package reads its own `.env` file.
