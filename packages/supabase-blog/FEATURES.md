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
  and draft/publish controls. Posts are public on the public API of
  Pluto (`/api/pluto/v1/content/post`): a list item has `excerpt`, one post has sanitized `html`.
  @.claude/skills/blog-posts/SKILL.md
- `PlutoProse`: displays a stored richtext value (markdown, HTML, or Tiptap JSON) as sanitized,
  styled HTML on a public page, with no Tiptap editor instance involved.
  @.claude/skills/prose/SKILL.md
