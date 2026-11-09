# E-commerce layer for Pluto with Supabase

This layer adds a shop to Pluto. It stores the products in Supabase, with [`@plutocms/supabase`](https://github.com/plutocms/supabase).

**Docs:** [Supabase shop](https://pluto.vulmix.dev/docs/layers/supabase-shop)

## Installation

Install the `supabase-shop` layer. Your app extends only this layer. It brings `@plutocms/supabase` (and with it `@plutocms/core`) and the [shop add-on](https://pluto.vulmix.dev/docs/layers/shop) `@plutocms/shop`.

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
  extends: ['@plutocms/supabase-shop'],
})
```

The `package.json` of the app lists only `@plutocms/supabase-shop`, besides `nuxt`, `vue` and `vue-router`.

## What it adds

- **Product admin** at `/admin/products`: price, stock, made-to-order items, categories, and availability, with drafts, review, scheduled publish, and a trash. The photos and the 3D model of a product are files of the media library of `@plutocms/core`.
- **Public data**: the storefront reads the [public API](https://pluto.vulmix.dev/docs/build/public-api) of core (`product`, `product-category`, `product-availability`), with `usePlutoPublicList` and `usePlutoPublicItem`. The type of one product is `PublicProduct`.
- **Cart and prices**: `useCart()` and `formatProductPrice()` of [`@plutocms/shop`](https://pluto.vulmix.dev/docs/layers/shop).

`products.price` holds integer cents: `4990` means R$ 49,90. Do not divide by 100 in your app. Use `formatProductPrice(cents)`.

## Development

This package lives in the [`plutocms/supabase`](https://github.com/plutocms/supabase) monorepo, in `packages/supabase-shop`. Run `bun install` at the root of the repo, then the scripts of the package (`bun run --cwd packages/supabase-shop dev`). Bun links `@plutocms/supabase` from the workspace, so you do not need `PLUTO_SUPABASE_PATH`. Each package reads its own `.env` file.
