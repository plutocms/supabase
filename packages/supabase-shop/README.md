# E-commerce layer for Pluto with Supabase

This layer provides e-commerce functionalities upon [`@plutocms/supabase`](https://github.com/plutocms/supabase) layer.

## Installation

Install the `supabase-shop` layer. Your app extends only this layer. It brings `@plutocms/supabase` (and with it `@plutocms/core`).

```bash
# npm
npm i @plutocms/supabase-shop

# pnpm
pnpm add @plutocms/supabase-shop

# bun
bun add @plutocms/supabase-shop
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [['@plutocms/supabase-shop', { install: true }]],
})
```

The `package.json` of the app lists only `@plutocms/supabase-shop`, besides `nuxt`, `vue` and `vue-router`.

## Features

### Dashboard views

This layer provides the following dashboard views for managing products:

- `/admin/products`: view a list of products.
- `/admin/product/new`: create a new product.
- `/admin/product/edit/:id`: edit an existing product.

The photos and the 3D model (`.glb`) of a product are files of the media library of `@plutocms/core`
(the Media page, `/admin/media`). `@plutocms/supabase` stores them in Supabase Storage.

### Composables

The layer has no composable for a storefront read. A storefront uses the composables of
`@plutocms/core`: `usePlutoPublicList('product')`, `usePlutoPublicItem('product', slug)`,
`usePlutoPublicList('product-category')` and `usePlutoPublicList('product-availability')`.

### API Routes

#### The public API

The storefront reads the public API of `@plutocms/core` (see https://pluto.vulmix.dev/docs/core/public-api):

- GET `/api/pluto/v1/content/product` and GET `/api/pluto/v1/content/product/<id or slug>`
- GET `/api/pluto/v1/content/product-category`
- GET `/api/pluto/v1/content/product-availability`

A product has `id`, `name`, `slug`, `description`, `price` (cents), `is_custom`, `stock_quantity`,
`createdAt`, `category` and `availability` (each `{ id, label, slug }` or `null`), and `media` (a list of
media records: `{ id, url, name, mimeType, size, width, height, alt, createdAt }`). Filter a list with `?filter[category]=<id>`.

#### Internal routes

The admin creates, edits and deletes products through the generic content routes of
`@plutocms/core`: `/api/_pluto/content/product/*`. The layer adds these routes for the admin forms:

- GET `/api/_pluto/shop/categories`, POST `/api/_pluto/shop/categories`
- GET `/api/_pluto/shop/availability`

### Types

- `PublicProduct`: Auto-imported type of one product in the public API answer.
- `PublicProductTaxonomy`: the category or the availability of a `PublicProduct`. A file of `media` is a `PlutoPublicMedia` of `@plutocms/core`.

### Product prices are integer cents

`products.price` holds integer cents. `4990` means R$ 49,90. The price field in the admin takes
an amount with 2 decimals and stores cents.

Do not divide by 100 in your app. Use the auto-imported helpers instead:

- `formatProductPrice(cents, options?)`: formats cents as a currency string. The currency is BRL by default. It takes the same options as `formatCurrency`.
- `centsToAmount(cents)`: converts cents to an amount (`4990` to `49.9`).
- `amountToCents(amount)`: converts an amount to cents, with rounding (`49.9` to `4990`).

#### Migrate from a version before cents

1. Update `@plutocms/supabase-shop`.
2. Open `/admin/migrations` and apply migration `004_price_in_cents.sql`. It multiplies every
   stored price by 100. Apply it once only. The migration ledger prevents a second run.
3. In your storefront, replace `formatCurrency(product.price)` with
   `formatProductPrice(product.price)`. Replace any price sum or sort so it works on cents.
4. Clear old carts that your app stored in the browser. They hold prices in reais.
