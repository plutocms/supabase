---
name: shop-products
description: Product admin (create, edit, list, delete) built on @plutocms/core's content model, with the files of the core media library and the is-custom/availability/stock cross-field rule.
---

# Shop products

This skill covers the product feature in the `supabase-shop` layer. It lets an admin create,
edit, list, and delete products. A product has a name, a description, a price, a media gallery,
a category, and an availability status.

## The `products` table

The table is defined in this layer's `db/migrations/` directory. It has these columns:

- `id` — bigint. The primary key. The database generates it.
- `slug` — text. Unique. It forms the public product path, `/product/<slug>`.
- `name` — text. Required.
- `description` — text. Optional.
- `price` — bigint. Required. Integer cents: `4990` means R$ 49,90. See "Price in cents" below.
- `created_at` — timestamptz. The database sets it when a row is created. There is no
  `updated_at` column.
- `category` — bigint. A foreign key to `product_category`. Null when uncategorized.
- `is_custom` — boolean. Default false. True for a made-to-order (commission) product.
- `stock_quantity` — numeric. Default 0. Meaningful only when `availability` is "in stock".
- `availability` — bigint. A foreign key to `product_availability`.

Row Level Security gates `products` writes on two capabilities (see
`db/migrations/003_capability_policies.sql`): `products:manage` (insert, update) and
`products:delete` (delete). Reading a product needs no capability — the public API reads
every product.

## The media of a product

`products.media` (jsonb, default `[]`) holds the ids of the files of the **core media library**
(the media skill of `@plutocms/core`), in order: photos, and one optional `.glb` 3D model. The
Supabase driver of `@plutocms/supabase` stores the files (bucket `media`) and the records
(`public.media`). The `media` field is `{ type: 'media', multiple: true, accept: ['image/*',
'model/gltf-binary'] }`, edited by the core `media` widget. A product shows a 3D model when one
of its records has `mimeType: 'model/gltf-binary'`; do not look at the file name.

`db/migrations/006_core_media.sql` moved the old `product_media` rows: one `media` record for each
file (two products that used one file had two rows), in the `product-media` bucket (no bytes
moved), with the type and the size from `storage.objects`. `products.media` keeps the old order.
`product_media` is renamed to `product_media_archived`, to drop in a later release. The core
Media page has "Fill in missing image sizes" for the pixel size of those files.

## The admin UI: the `product` content type

`/admin/products`, `/admin/product/new`, and `/admin/product/edit/:id` run
`@plutocms/core`'s generic content-model admin UI, against one content type declared in
`shared/content/product.ts`:

- `app/pages/admin/products.vue` renders `<PlutoContentList type="product" />`.
- `app/pages/admin/product/new.vue` renders `<PlutoContentForm type="product" />`.
- `app/pages/admin/product/edit/[id].vue` renders `<PlutoContentForm type="product" :id="..." />`.

`shared/content/product.ts` declares every field, sets `status: false` (products have no
publish workflow) and `timestamps: { created: 'created_at', updated: false }` (no
`updated_at` column), and declares `capabilities.write`/`capabilities.delete` but no
`capabilities.read` — matching the RLS rule above, and the content-model skill's rule that a
content type with no declared capability for an operation leaves that operation open. It sets
`autoRoutes: false` and explicit `basePath`/`newPath`/`editPath` values, so the URLs above never
changed.

See `@plutocms/core`'s content-model skill for what every field on a content type means, and
`@plutocms/supabase`'s content-adapter skill for how a content type maps onto a real table.

### The old hand-written admin UI

`app/components/Post.vue` (a leftover name from forking the blog layer — it was always the
product form, never a post) and the three hand-written write routes it called
(`POST /api/product/create`, `POST /api/product/edit/:id`, `DELETE /api/product/delete/:id`) are
gone. `app/composables/availability.ts` (`useProductAvailability`), only ever called by
`Post.vue`, is gone too. The admin UI writes through the generic
`/api/_pluto/content/product/*` routes instead.

## The field widgets

Five fields use a layer-specific widget, each registered in `app/plugins/pluto-extension.ts` by
`widget:` name (never bare `fieldType:` — a `fieldType`-keyed entry would become the app-wide
default for every layer's fields of that type):

- **`product-price`** (`PlutoProductPriceField.vue`) — a `UInput` with a cents mask. It stores
  integer cents (see "Price in cents"). Each typed digit enters from the right (5 -> 0,05 ->
  0,50 -> 5,09 -> 50,90), Backspace removes the last digit, and Backspace on R$ 0,00 empties the
  field. `digitsToCents` reads the digits of the whole text on each input event, so phone
  keyboards and paste work. It does not use `UInputNumber`, because that input snaps the value to
  its `step` (1), so 50,90 became 51. The text uses `formatProductPrice`, with a hardcoded `BRL`
  currency. This is a known, separate issue (see "Known gaps" below).
- **`product-is-custom`**, **`product-availability`**, **`product-stock`** — the cross-field
  rule. See "The is-custom/availability/stock rule" below.
- **`product-category`** (`PlutoProductCategoryField.vue`) — a searchable menu over
  `/api/_pluto/shop/categories`, with inline "create new category" support (posts to
  `POST /api/_pluto/shop/categories`, gated on the separate `shop:manage_taxonomy` capability).

All six widgets are registered with `defineAsyncComponent`, so their code stays out of the entry
chunk. Core shows a skeleton for each field while its chunk loads.

The type sets `adminBar: true`, so the core admin bar shows "New Product" to a user with
`products:manage`, and "Edit Product" on a public page that calls
`usePlutoEditLink('product', product.id)`. `previewUrl` gives the form its "View Product" link,
`/product/<slug>`, the product page of the shop template.

`product-price`, `product-availability`, and `product-category` load their own options with a
plain `onMounted` fetch, instead of an `async` composable. A content field widget is resolved and mounted dynamically — an
`async` composable's top-level `await` can re-suspend an already-mounted page in that position,
so each widget fetches for itself instead.

### The is-custom/availability/stock rule

A custom (commissioned) product is always "commission" availability, with no stock quantity. A
non-custom product can be any availability, and only shows a stock quantity while its
availability is "in stock". This rule used to live in one `watch` inside `Post.vue`, keyed on
two literal ids (`2` for commission, `1` for in-stock). It now lives across three widgets,
sharing one piece of state:

- `app/composables/product-form-bridge.ts` exports `useProductFormBridge()`, a `useState` holding
  `{ isCustom, availabilitySlug }`. Each field widget is resolved and mounted separately, with
  no direct access to another field's props — this bridge is their one shared place to read and
  write the rule from.
- `PlutoProductIsCustomField.vue` mirrors its own value into `bridge.isCustom`.
- `PlutoProductAvailabilityField.vue` disables every option except "commission" while
  `bridge.isCustom` is true, and forces the field to "commission" the moment `isCustom` actually
  flips true. It resolves availability rows by `slug` (`'commission'`, `'in-stock'`), not by a
  literal id — the ids are environment-specific, seeded per database, but the slugs are stable.
  It also mirrors the selected row's own slug into `bridge.availabilitySlug`.
- `PlutoProductStockField.vue` renders only while `bridge.availabilitySlug === 'in-stock'`, and
  keeps the field at `null` while `is_custom` is true, `0` otherwise. It only ever writes a
  value when the field has none yet (a brand-new product, or the first time it becomes visible)
  or when `isCustom` actually changes — never on every mount — so opening an existing "in stock"
  product for edit never clobbers its real stock quantity with a default.
- The widgets load on demand, so they can mount in any order. The bridge is a `useState`, and it
  lives on after the form closes. `PlutoProductIsCustomField.vue` resets `isCustom` to false and
  `PlutoProductAvailabilityField.vue` resets `availabilitySlug` to null when they unmount. The
  next form then starts clean, and a stale flag never looks like a change to a widget that mounts
  before `product-is-custom`.

## The public API and the internal routes

### The public API (the storefront)

A storefront reads this layer through the public API of `@plutocms/core`
(https://pluto.vulmix.dev/docs/core/public-api). It needs no hand-written route:

- `GET /api/pluto/v1/content/product` and `GET /api/pluto/v1/content/product/<id or slug>`.
- `GET /api/pluto/v1/content/product-category` and `.../product-availability`.
- In a page, use `usePlutoPublicList('product')`, `usePlutoPublicItem('product', slug)`,
  `usePlutoPublicList('product-category')` and `usePlutoPublicList('product-availability')`.
  Types: `PublicProduct` (in `shared/types/product.ts`).

The `product` type sets `api: { public: true, fields: [...] }`. The list of fields is explicit:
`name`, `slug`, `description`, `price`, `is_custom`, `stock_quantity`, `category`,
`availability`. A column that someone adds later stays private until it is in this list. The
answer of a product also has `id` and `createdAt` (core adds them). Core gives `media` as a list
of media records (`{ id, url, name, mimeType, size, width, height, alt, createdAt }`).

`hooks.toPublic` (`productToPublic` in `server/utils/product-public.ts`, attached in
`server/plugins/content.ts`) changes the answer:

- `category` and `availability` change from an id to `{ id, label, slug }`, or `null`.
  A filter still uses the id: `?filter[category]=3`.
- The hook loads the related rows once for the whole answer: one query per relation, with
  `.in(...)`. A list of 20 products makes 2 queries. The rows stay on `event.context` under
  the key `shopProductRelations`.

`product-category` and `product-availability` are content types for the public API only
(`shared/utils/content-taxonomy.ts`). The server plugin registers them. The client does not, so
the admin has no nav entry, dashboard tile or command palette item for them. Both set
`status: false`, `timestamps: false` and `autoRoutes: false`. The category writes need
`shop:manage_taxonomy`. The availability writes need `shop:manage_availability`. No role has
that capability, so only an admin passes. A type with no write capability would fail open in core.

### The internal routes (the admin)

The routes of this layer are under `/api/_pluto/shop/`. Core blocks every cross-site request
that is not a GET on `/api/_pluto/**`.

| Route                                     | Use                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `GET /api/_pluto/shop/categories`         | Options of the `category` field.                                            |
| `POST /api/_pluto/shop/categories`        | Inline "create category". Needs `shop:manage_taxonomy`.                     |
| `GET /api/_pluto/shop/availability`       | Options of the `availability` field.                                        |

Errors use `createPlutoError` with `supabase-shop.errors.*` keys.

The files go through the core routes (`/api/_pluto/media`). The layer has no composable for a
storefront read: the old `useProduct` and `useProductCategory` are gone.

## Price in cents

`products.price` holds integer cents. `4990` means R$ 49,90. The column is `bigint`. The field
keeps `integer: true` and `min: 0`.

- `db/migrations/004_price_in_cents.sql` runs `update public.products set price = price * 100`.
  It is not safe to run twice. The migration ledger records it, so the admin UI applies it once.
  The user applies it from `/admin/migrations`. An older app that is not updated shows prices
  100 times too big until it divides by 100.
- `shared/utils/product-price.ts` is the one place for the conversion. Nuxt auto-imports it in
  `app/`, `server/` and `shared/`:
  - `centsToAmount(cents)` gives the amount in reais. A missing value gives 0.
  - `amountToCents(amount)` gives exact integer cents. It rounds, so `0.1 + 0.2` gives `30` and
    `1.005` gives `101`. A missing value gives `null`.
  - `formatProductPrice(cents, options?)` formats cents with `formatCurrency` from
    `shared/utils/currency.ts`. The currency is BRL by default.
- `PlutoProductPriceField.vue` shows `centsToAmount(modelValue)` and emits `amountToCents(input)`.
- No code in this layer reads the price today. A storefront must call `formatProductPrice`, not
  `formatCurrency(product.price)`, and must not write `/ 100` by hand.
- Tests: `test/product-price.test.ts`.

## Translation

The admin text of this layer uses the i18n system of `@plutocms/core` (see the `i18n` skill
in `pluto`). The shipped languages are `en` and `pt-BR`. The English text is the same, byte for
byte, as before.

- `i18n/locales/en.json` and `i18n/locales/pt-BR.json` hold all keys. The layer namespace is
  `supabase-shop`. Shared words use `pluto.common.*` (for example `pluto.common.refresh`).
- The `product` content type keeps its English literals in `shared/utils/content-product.ts`.
  The keys `content.product.label`, `content.product.labelPlural`, and
  `content.product.fields.<field>.label` translate it. Core finds them by convention. The
  generic list and form use them, and `PlutoContentField` hands each widget a translated copy of
  its field. The widgets show `field.label` and `field.description` as they get them.
- `app/plugins/pluto-extension.ts` holds keys, not text, for the nav labels, the page titles,
  and the capability labels. Pluto resolves them with `tx()`.
- The price widget keeps the `BRL` currency. Its text uses `formatProductPrice`, so it has the
  store format ("R$ 1.234,56") in every admin language.
- Category and availability names come from the database. They stay as stored.

### Server errors

Routes with a fixed message use `supabase-shop.errors.*` keys. The `statusMessage` stays English. A
raw database error message stays as the server sends it.

### Tests

`test/i18n-locale-files.test.ts` checks that every locale has the same keys, placeholders, and
plural form count as `en`, and no empty value. The top-level namespaces are only
`supabase-shop` and `content`, and `content` holds only `product`. It checks that the English
`content.product.*` labels equal the literals of the type. It also scans `app/`, `server/`, and
`shared/` for literal `supabase-shop.*` and `pluto.*` keys. Each key must exist, and each
`supabase-shop.*` key of `en.json` must be used. Keep a key that the code builds at run time as
a full literal. `test/fixtures/i18n-stub.ts` builds a translator over the English messages.

## Known gaps

- The product list view shows the name and the price. The price field uses `listFormat`
  (`@plutocms/core` 0.17 or later) with `formatProductPrice`, so the list shows R$ 49,90, not
  the raw cents. The list drops the category and created-at columns the old hand-written table
  had: a reference field has no `listFormat` that resolves its label yet.
- The edit page has no "Preview" link to the live product page anymore. The old `Post.vue` had
  one; the generic form has no equivalent slot for it yet.
- The price widget's hardcoded `currency: 'BRL'` is preserved as-is, not fixed, in this pass —
  the same known, separate issue `Post.vue` already had.

## Data API grants

`db/migrations/005_data_api_grants.sql` grants the shop tables for the Data API (anon `select` only, authenticated and service_role `select, insert, update, delete`). A new table in this layer needs a grant in the same migration file. See the `layer-migrations` skill in `@plutocms/supabase`.
