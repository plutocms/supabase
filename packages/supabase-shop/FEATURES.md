# Features

This file lists every implemented feature of this project. Each entry links to a skill file
with full detail, so this file stays short.

See the workspace-level `CLAUDE.md` (one directory up) for the delegation, writing, and git
policies shared by every project here.

- Product admin (list, create, edit, delete) built on `@plutocms/core`'s content model, with a
  media gallery and the is-custom/availability/stock cross-field rule. Prices are integer cents, with
  a conversion helper. The media upload checks
  the type and size, and explains each rejected or failed upload.
  @.claude/skills/shop-products/SKILL.md
- Headless storefront API: the `product`, `product-category` and `product-availability` types
  are on the public API of `@plutocms/core`. A `toPublic` hook adds media, category and
  availability to a product with a fixed number of queries. The admin routes are under
  `/api/_pluto/shop/`.
  @.claude/skills/shop-products/SKILL.md
