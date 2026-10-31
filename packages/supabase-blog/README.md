# Blog layer for Pluto with Supabase

This layer adds a blog to Pluto. It stores posts in Supabase. Editors write them in the Pluto admin with a rich text editor. The layer builds on [`@plutocms/supabase`](https://github.com/plutocms/supabase).

## What the layer gives

- **Post admin:** list, create, edit and delete posts at `/admin/posts`, `/admin/post/new` and `/admin/post/edit/:id`. The pages run on the generic content UI of `@plutocms/core`, against the `post` content type.
- **Rich text editor:** a Tiptap editor that stores Markdown. It runs in the core post editor: a Visual mode, a Markdown mode with a preview of the site, an outline of the headings, and draft/publish controls.
- **Images:** a cover image, and inline images in the body. The editor picks a file or uploads one, through the media library of `@plutocms/core` (stored in Supabase Storage).
- **Capabilities:** `posts:read_drafts`, `posts:publish` and `posts:delete` gate the actions. An admin holds all three.
- **Public data:** the published posts on the public API of Pluto, for a site in any stack: `GET /api/pluto/v1/content/post` and `GET /api/pluto/v1/content/post/<id or slug>`. A list item has an `excerpt`, and one post has its body as sanitized `html`. In Nuxt, use `usePlutoPublicList` and `usePlutoPublicItem`. See https://pluto.vulmix.dev/docs/core/public-api.
- **`PlutoProse`:** a component that shows a stored richtext value (Markdown, HTML or Tiptap JSON) as sanitized, styled HTML. Use it on a public post page.
- **Migrations:** the `posts` table and its policies ship as layer migrations. An admin applies them from `/admin/migrations`.

For the full detail, see [FEATURES.md](./FEATURES.md).

## Requirements

- A Supabase project, with `SUPABASE_URL` and `SUPABASE_KEY` in your `.env`. See the [`@plutocms/supabase` README](https://github.com/plutocms/supabase).
- Nuxt 4 and a Tailwind entry file that your app owns. See the single Tailwind build section in the [`@plutocms/core` README](https://github.com/plutocms/pluto).

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
  extends: [['@plutocms/supabase-blog', { install: true }]],
})
```

The `package.json` of the app lists only `@plutocms/supabase-blog`, besides `nuxt`, `vue` and `vue-router`.

## Links

- Starter: the blog template, [`pluto-blog-template`](https://github.com/plutocms/pluto-blog-template), with the Supabase backend: `npm create pluto@latest my-blog -t blog --backend supabase`. The same template works with the GitHub CMS.
- Skills: `.claude/skills/blog-posts/SKILL.md` and `.claude/skills/prose/SKILL.md`.
