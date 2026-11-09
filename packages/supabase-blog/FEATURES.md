# Features

This file lists every implemented feature of this project. Each entry links to a skill file
with full detail, so this file stays short.

See the workspace-level `CLAUDE.md` (one directory up) for the delegation, writing, and git
policies shared by every project here.

## Features

- Blog post admin: create, edit, list, and delete posts with a rich text editor, gated by the
  `posts:read_drafts`, `posts:publish`, and `posts:delete` capabilities. The admin UI runs on
  `@plutocms/core`'s generic content-model UI, against the `post` content type. The post
  editor uses the canvas layout of the core post editor (Visual or Markdown with a site preview)
  and draft/publish controls. The editor flushes its pending text before a save and before a backup of
  unsaved changes (the `onFlush` hook of core), so Ctrl+S right after typing keeps the last keystrokes.
  Posts are public on the public API of
  Pluto (`/api/pluto/v1/content/post`): a list item has `excerpt`, one post has sanitized `html`.
  The `posts` table has the SEO columns that the `@plutocms/seo` add-on layer uses.
  @.claude/skills/blog-posts/SKILL.md
- Tags and categories: the `tag` and `category` content types (tables `tags` and `categories`,
  migration 007), public on the public API. A post has the fields `categories` and `tags` (the
  array columns `category_ids` and `tag_ids`); the public API gives `{ id, label, slug }` and
  `?filter[tags]=<slug>` filters. The `terms:manage` capability gates writing a term, including
  the inline create in the post form. Deleting a term removes it from the posts (a trigger).
  @.claude/skills/blog-posts/SKILL.md
- Authors: the `author` content type (table `authors`, migration 008: name, slug, bio, avatar; no link to
  sign-in users), public on the public API. A post has the field `authors` (the array column
  `author_ids`, in byline order); the public API gives `[{ id, label, slug, avatar, bio }]` and
  `?filter[authors]=<slug>` filters. A new post gets the authors that the user saved last time. The
  `authors:manage` capability gates writing an author. Deleting an author removes it from the posts (a
  trigger). @.claude/skills/blog-posts/SKILL.md
- Trash: posts, tags, categories and authors go to the trash (migration 009, `deleted_at`), with
  restore and a purge after 30 days. Visitors never read a trashed row. A role with `posts:delete`
  moves a post to the trash without `posts:publish`.
- Scheduled publish and review (migration 010): schedule a post for a date and time; a
  Contributor role (`posts:write`) writes posts and sends them to review, and an editor
  (`posts:publish`) publishes them.
- Embeds: a URL alone on its line of a post becomes the player of an embed provider of core
  (YouTube, Vimeo); `PlutoProse` shows the body through `PlutoHtml` of core.
- Content components: a component of the site (`components/content/` with `definePlutoBlock`) in
  a post, `::name{props}` then `::`. `PostEditor` shows it as the chip of core
  (`PlutoContentComponentNode`), with **Insert a component** in the toolbar
  (`PlutoBlockInsertMenu`) and an item for each component in the slash menu; the Markdown path
  and the sanitizer keep the mark of core, and `PlutoHtml` renders the component. See the
  content-components skill of core.
- `PlutoProse`: displays a stored richtext value (markdown, HTML, or Tiptap JSON) as sanitized,
  styled HTML on a public page, with no Tiptap editor instance involved. Plain CSS (`.pluto-prose`
  of core, from `@plutocms/css/base`), so it works with no Tailwind.
  @.claude/skills/prose/SKILL.md
