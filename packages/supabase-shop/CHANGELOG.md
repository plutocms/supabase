# Changelog

## [0.17.1](https://github.com/plutocms/supabase-shop/compare/v0.17.0...v0.17.1) (2026-10-31)


### Bug Fixes

* no @plutocms/utils: formatCurrency is in this layer, category slugs use slugifyTitle ([#152](https://github.com/plutocms/supabase-shop/issues/152)) ([4796821](https://github.com/plutocms/supabase-shop/commit/479682104c0d8ef3530bc5e2d1590c19f1d44df7))

## [0.17.0](https://github.com/plutocms/supabase-shop/compare/v0.16.0...v0.17.0) (2026-10-30)


### ⚠ BREAKING CHANGES

* the layer needs @plutocms/supabase >=0.18.0, which extends @plutocms/core instead of @plutocms/pluto. PLUTO_PLUTO_PATH is now PLUTO_CORE_PATH.

### Features

* extend @plutocms/core ([#137](https://github.com/plutocms/supabase-shop/issues/137)) ([84ccbc7](https://github.com/plutocms/supabase-shop/commit/84ccbc7382ed21c882e030c3e42f1b352e978abe))

## [0.16.0](https://github.com/plutocms/supabase-shop/compare/v0.15.4...v0.16.0) (2026-10-30)


### ⚠ BREAKING CHANGES

* the layer no longer adds its own navbar actions. The core admin bar shows New Product, and Edit Product on a page that calls usePlutoEditLink('product', product.id).

### Features

* the core admin bar buttons and a View Product link ([#125](https://github.com/plutocms/supabase-shop/issues/125)) ([1b4cf3f](https://github.com/plutocms/supabase-shop/commit/1b4cf3f155069d4ce1182b347de7634b9d66fe72))

## [0.15.4](https://github.com/plutocms/supabase-shop/compare/v0.15.3...v0.15.4) (2026-10-29)


### Bug Fixes

* **deps:** accept every 0.x version of the [@plutocms](https://github.com/plutocms) packages; shared CI and the update workflow ([#114](https://github.com/plutocms/supabase-shop/issues/114)) ([225c1ac](https://github.com/plutocms/supabase-shop/commit/225c1aca19ab170e7a59c5b91a1dbfc5fd71914f))

## [0.15.3](https://github.com/plutocms/supabase-shop/compare/v0.15.2...v0.15.3) (2026-10-29)


### Bug Fixes

* **deps:** use @plutocms/supabase 0.15.4 (@plutocms/pluto 0.34) ([#112](https://github.com/plutocms/supabase-shop/issues/112)) ([9b24c00](https://github.com/plutocms/supabase-shop/commit/9b24c0004537edc46f643c0f4c4743de49601b80))

## [0.15.2](https://github.com/plutocms/supabase-shop/compare/v0.15.1...v0.15.2) (2026-10-29)


### Bug Fixes

* **deps:** use @plutocms/supabase 0.15.3 (@plutocms/pluto 0.33) ([#110](https://github.com/plutocms/supabase-shop/issues/110)) ([07b614d](https://github.com/plutocms/supabase-shop/commit/07b614da2cdbd4d04acdd06f04acb57147bf0521))

## [0.15.1](https://github.com/plutocms/supabase-shop/compare/v0.15.0...v0.15.1) (2026-10-29)


### Bug Fixes

* **deps:** use @plutocms/supabase 0.15.2 (@plutocms/pluto 0.32) ([#108](https://github.com/plutocms/supabase-shop/issues/108)) ([7b358f6](https://github.com/plutocms/supabase-shop/commit/7b358f62080294cc233784b646296f3a2e2b3e5b))

## [0.15.0](https://github.com/plutocms/supabase-shop/compare/v0.14.2...v0.15.0) (2026-10-28)


### ⚠ BREAKING CHANGES

* stop extending @plutocms/ui ([#100](https://github.com/plutocms/supabase-shop/issues/100))
* remove the public schema stub ([#99](https://github.com/plutocms/supabase-shop/issues/99))

### Features

* remove the public schema stub ([#99](https://github.com/plutocms/supabase-shop/issues/99)) ([282d0bb](https://github.com/plutocms/supabase-shop/commit/282d0bb36967905b2f0858dace3babfe10e0843f))
* stop extending @plutocms/ui ([#100](https://github.com/plutocms/supabase-shop/issues/100)) ([f5c3dc7](https://github.com/plutocms/supabase-shop/commit/f5c3dc71cf544b0653bc754043e462c002bb1d9c))


### Bug Fixes

* **deps:** use @plutocms/supabase 0.15 and @plutocms/utils 0.3 ([#102](https://github.com/plutocms/supabase-shop/issues/102)) ([afb6caa](https://github.com/plutocms/supabase-shop/commit/afb6caa27a1cac063fc2f956c6b34492d0d5f871))

## [0.14.2](https://github.com/plutocms/supabase-shop/compare/v0.14.1...v0.14.2) (2026-10-27)


### Bug Fixes

* import the product types by a relative path, so an app typechecks ([#97](https://github.com/plutocms/supabase-shop/issues/97)) ([27c7d10](https://github.com/plutocms/supabase-shop/commit/27c7d1092adf1093d1128cb0d44175ba57bceadd))

## [0.14.1](https://github.com/plutocms/supabase-shop/compare/v0.14.0...v0.14.1) (2026-10-27)


### Bug Fixes

* **deps:** use @plutocms/pluto 0.28 through supabase 0.14.1, and drop the copy of parseBody ([#95](https://github.com/plutocms/supabase-shop/issues/95)) ([d380344](https://github.com/plutocms/supabase-shop/commit/d380344ae046218df8c4c599587e63d94b75a71f))

## [0.14.0](https://github.com/plutocms/supabase-shop/compare/v0.13.0...v0.14.0) (2026-10-27)


### ⚠ BREAKING CHANGES

* `/api/product/**`, `/api/category/**` and `/api/product-media/**` are gone, and so are `useProduct` and `useProductCategory`. Read products from `/api/pluto/v1/content/product`.

### Features

* products and taxonomies on the public API, internal routes under /api/_pluto/shop ([#93](https://github.com/plutocms/supabase-shop/issues/93)) ([6aed578](https://github.com/plutocms/supabase-shop/commit/6aed578c0f0d3fb8415fcf9c05e32cc3ce1ebd19))

## [0.13.0](https://github.com/plutocms/supabase-shop/compare/v0.12.0...v0.13.0) (2026-10-25)


### Features

* **deps:** raise @plutocms/supabase to ^0.13.0 ([#90](https://github.com/plutocms/supabase-shop/issues/90)) ([ba1f091](https://github.com/plutocms/supabase-shop/commit/ba1f091f8ac844bbd9d8eeecdd1a0076f8e22dfd))

## [0.12.0](https://github.com/plutocms/supabase-shop/compare/v0.11.3...v0.12.0) (2026-10-25)


### Features

* **deps:** use @plutocms/supabase 0.12 ([#87](https://github.com/plutocms/supabase-shop/issues/87)) ([3ba7e64](https://github.com/plutocms/supabase-shop/commit/3ba7e64f87c40d32f236434541bb9a015e05e8cd))

## [0.11.3](https://github.com/plutocms/supabase-shop/compare/v0.11.2...v0.11.3) (2026-10-22)


### Bug Fixes

* **db:** grant Data API access to the shop tables explicitly ([#85](https://github.com/plutocms/supabase-shop/issues/85)) ([8387b98](https://github.com/plutocms/supabase-shop/commit/8387b989f5d175454c76ebb81b437186394d04ec))

## [0.11.2](https://github.com/plutocms/supabase-shop/compare/v0.11.1...v0.11.2) (2026-10-21)


### Bug Fixes

* **deps:** use @plutocms/supabase 0.11.1 again ([#83](https://github.com/plutocms/supabase-shop/issues/83)) ([e000673](https://github.com/plutocms/supabase-shop/commit/e000673ccff55df1d53363fa24cfa5a8d947e5e9))

## [0.11.1](https://github.com/plutocms/supabase-shop/compare/v0.11.0...v0.11.1) (2026-10-21)


### Bug Fixes

* **product:** show the price column in the admin list again ([#81](https://github.com/plutocms/supabase-shop/issues/81)) ([0472d62](https://github.com/plutocms/supabase-shop/commit/0472d62100ee4800a55181b0cee151416955118b))


### Performance Improvements

* **product:** load the product field widgets on demand ([#80](https://github.com/plutocms/supabase-shop/issues/80)) ([6265c8a](https://github.com/plutocms/supabase-shop/commit/6265c8a75f943cc16ab01942091096f6c8a9b63f))

## [0.11.0](https://github.com/plutocms/supabase-shop/compare/v0.10.2...v0.11.0) (2026-10-21)


### ⚠ BREAKING CHANGES

* **product:** products.price is now integer cents. Apply migration 004_price_in_cents.sql once, and divide by 100 where you show a price (or use formatProductPrice).

### Features

* **product:** store product prices as integer cents ([#73](https://github.com/plutocms/supabase-shop/issues/73)) ([e30f441](https://github.com/plutocms/supabase-shop/commit/e30f44140f824a90fc2deb36d64ed132f8792837))

## [0.10.2](https://github.com/plutocms/supabase-shop/compare/v0.10.1...v0.10.2) (2026-10-21)


### Bug Fixes

* **product:** keep the media of other products and fix the 3D model flow ([#71](https://github.com/plutocms/supabase-shop/issues/71)) ([b2e742b](https://github.com/plutocms/supabase-shop/commit/b2e742b9dc657a7915082638d38a730a3bd8bae5))

## [0.10.1](https://github.com/plutocms/supabase-shop/compare/v0.10.0...v0.10.1) (2026-10-20)


### Bug Fixes

* **admin:** add tab titles to the product pages ([#69](https://github.com/plutocms/supabase-shop/issues/69)) ([c8e1c36](https://github.com/plutocms/supabase-shop/commit/c8e1c36b94688f88ff26807028782787b5c33fd8))

## [0.10.0](https://github.com/plutocms/supabase-shop/compare/v0.9.0...v0.10.0) (2026-10-20)


### ⚠ BREAKING CHANGES

* **admin:** move to the pluto 0.16 admin shell ([#67](https://github.com/plutocms/supabase-shop/issues/67))

### Features

* **admin:** move to the pluto 0.16 admin shell ([#67](https://github.com/plutocms/supabase-shop/issues/67)) ([3503811](https://github.com/plutocms/supabase-shop/commit/3503811f152dda4c7c4eacf17f4453f45718ba3d))

## [0.9.0](https://github.com/plutocms/supabase-shop/compare/v0.8.0...v0.9.0) (2026-10-18)


### Features

* **i18n:** translate the shop admin ([#66](https://github.com/plutocms/supabase-shop/issues/66)) ([9974c28](https://github.com/plutocms/supabase-shop/commit/9974c28f7520a5d38face539472e8a6a74b5f30b))


### Bug Fixes

* **product-media:** never overwrite an existing file on upload ([#63](https://github.com/plutocms/supabase-shop/issues/63)) ([3af7091](https://github.com/plutocms/supabase-shop/commit/3af70912cd4b0b3f25b6a320417d42e65ee99177))

## [0.8.0](https://github.com/plutocms/supabase-shop/compare/v0.7.0...v0.8.0) (2026-10-18)


### Features

* **product-media:** check uploads and explain rejected files ([#60](https://github.com/plutocms/supabase-shop/issues/60)) ([61d9939](https://github.com/plutocms/supabase-shop/commit/61d9939c33bd9c91cbcf9b756bbd8b92d08c6e97))


### Bug Fixes

* **deps:** use @plutocms/supabase 0.9.1 ([#62](https://github.com/plutocms/supabase-shop/issues/62)) ([059bd55](https://github.com/plutocms/supabase-shop/commit/059bd5583268603d8d927f04a8a721d600f16ea0))

## [0.7.0](https://github.com/plutocms/supabase-shop/compare/v0.6.3...v0.7.0) (2026-10-17)


### ⚠ BREAKING CHANGES

* **css:** This layer no longer adds a Tailwind entry. The app's CSS entry must start with:

### Features

* **css:** stop registering a Tailwind CSS entry ([#58](https://github.com/plutocms/supabase-shop/issues/58)) ([c70fca1](https://github.com/plutocms/supabase-shop/commit/c70fca16d63eef1c1cd872ac727745aca47716be))

## [0.6.3](https://github.com/plutocms/supabase-shop/compare/v0.6.2...v0.6.3) (2026-10-16)


### Bug Fixes

* **deps:** upgrade dependencies ([#56](https://github.com/plutocms/supabase-shop/issues/56)) ([07581b2](https://github.com/plutocms/supabase-shop/commit/07581b25c2a68d22e9399e5cf83847e007b996a8))

## [0.6.2](https://github.com/plutocms/supabase-shop/compare/v0.6.1...v0.6.2) (2026-09-14)


### Bug Fixes

* **security:** validate category creation payload with zod ([#54](https://github.com/plutocms/supabase-shop/issues/54)) ([467bd9c](https://github.com/plutocms/supabase-shop/commit/467bd9c1be11648d1b788659644b29596dd0aadd))

## [0.6.1](https://github.com/plutocms/supabase-shop/compare/v0.6.0...v0.6.1) (2026-09-14)


### Bug Fixes

* **content:** move productType under shared/utils so cross-layer imports work ([#52](https://github.com/plutocms/supabase-shop/issues/52)) ([65857cc](https://github.com/plutocms/supabase-shop/commit/65857cc8b668d7cac60905c49633ddbd6fc79896))

## [0.6.0](https://github.com/plutocms/supabase-shop/compare/v0.5.0...v0.6.0) (2026-09-13)


### Features

* **products:** adopt the pluto content model ([#50](https://github.com/plutocms/supabase-shop/issues/50)) ([c4b07ce](https://github.com/plutocms/supabase-shop/commit/c4b07ceeefdc04e8ec1a1e4ec79fdb2d95d2112d))

## [0.5.0](https://github.com/plutocms/supabase-shop/compare/v0.4.0...v0.5.0) (2026-09-12)


### Features

* **permissions:** gate shop mutations on named capabilities ([#48](https://github.com/plutocms/supabase-shop/issues/48)) ([ff1d2ff](https://github.com/plutocms/supabase-shop/commit/ff1d2ff7761dadc750e45252aaac4747244ec3b1))

## [0.4.0](https://github.com/plutocms/supabase-shop/compare/v0.3.0...v0.4.0) (2026-09-12)


### Features

* **registry:** migrate to definePlutoExtension ([#46](https://github.com/plutocms/supabase-shop/issues/46)) ([81488f5](https://github.com/plutocms/supabase-shop/commit/81488f5bc60f1b8ef11c0d495351407fb15fb59c))

## [0.3.0](https://github.com/plutocms/supabase-shop/compare/v0.2.3...v0.3.0) (2026-09-12)


### Features

* **migrations:** move to versioned db/migrations layout ([#44](https://github.com/plutocms/supabase-shop/issues/44)) ([1bb72c7](https://github.com/plutocms/supabase-shop/commit/1bb72c73f3a089dec5d9b0a36fd882d02e463cdd))


### Bug Fixes

* **deps:** move @vueuse/integrations to dependencies ([#40](https://github.com/plutocms/supabase-shop/issues/40)) ([4c343af](https://github.com/plutocms/supabase-shop/commit/4c343af5f91ebef3a5ef23f014c306548c9a59d5))
* **deps:** require @plutocms/supabase 0.4.1 ([#45](https://github.com/plutocms/supabase-shop/issues/45)) ([93e95bc](https://github.com/plutocms/supabase-shop/commit/93e95bcc9961750d6bc5e5489b8ef1fbe6d5f8e5))
* **products:** require admin for product/category/media mutations ([#42](https://github.com/plutocms/supabase-shop/issues/42)) ([b2036a5](https://github.com/plutocms/supabase-shop/commit/b2036a57d30e3fd045adcb47fc7f89dc473b7dcf))
* **schema:** make shop schema creation fully idempotent ([#43](https://github.com/plutocms/supabase-shop/issues/43)) ([9cbfe9d](https://github.com/plutocms/supabase-shop/commit/9cbfe9d6465f45f60e192a9d12f0e5d156c809bb))

## [0.2.3](https://github.com/plutocms/supabase-shop/compare/v0.2.2...v0.2.3) (2026-09-10)


### Bug Fixes

* **deps:** require supabase 0.3.0 ([e376e86](https://github.com/plutocms/supabase-shop/commit/e376e8658eabb9e57e21b1e051f3e51246cc2221))

## [0.2.2](https://github.com/plutocms/supabase-shop/compare/v0.2.1...v0.2.2) (2026-09-10)


### Bug Fixes

* **deps:** require supabase 0.2.2 ([5203870](https://github.com/plutocms/supabase-shop/commit/5203870aa833622d4088a51d5c4b39c0ead262c6))

## [0.2.1](https://github.com/plutocms/supabase-shop/compare/v0.2.0...v0.2.1) (2026-09-09)


### Bug Fixes

* **admin:** align shop styles with layer theme ([#36](https://github.com/plutocms/supabase-shop/issues/36)) ([3089f90](https://github.com/plutocms/supabase-shop/commit/3089f904902eef11caf8e8497a8769c2515b4816))

## [0.2.0](https://github.com/plutocms/supabase-shop/compare/v0.1.3...v0.2.0) (2026-09-09)


### Features

* make shop admin views responsive ([#34](https://github.com/plutocms/supabase-shop/issues/34)) ([6aa87ed](https://github.com/plutocms/supabase-shop/commit/6aa87ed109dc45262d8095b573c16c965bbaea40))

## [0.1.3](https://github.com/plutocms/supabase-shop/compare/v0.1.2...v0.1.3) (2026-09-08)


### Bug Fixes

* use a factory function for the Post form defineModel default ([08f5b7f](https://github.com/plutocms/supabase-shop/commit/08f5b7ff46e66f9b3e4999fd548086c5d6d02272))

## [0.1.2](https://github.com/plutocms/supabase-shop/compare/v0.1.1...v0.1.2) (2026-09-03)


### Bug Fixes

* lint errors in the ProductMedia regression test ([44256c8](https://github.com/plutocms/supabase-shop/commit/44256c8f3793fa14c979a2980fac9f3ffc677056))

## [0.1.1](https://github.com/plutocms/supabase-shop/compare/v0.1.0...v0.1.1) (2026-09-03)


### Bug Fixes

* never ship the generated shared/types/supabase.ts placeholder ([673b245](https://github.com/plutocms/supabase-shop/commit/673b24571833e5e2b0431c80dc742b68cb33fe6b))

## [0.1.0](https://github.com/plutocms/supabase-shop/compare/v0.0.1-alpha.21...v0.1.0) (2026-09-03)


### ⚠ BREAKING CHANGES

* renamed `useMedia` to `useProductMedia` and removed `getMediaUrl` util
* removed slug field for now
* accept a slug in product composable
* extract response data in product fetches

### Features

* accept a slug in product composable ([011f595](https://github.com/plutocms/supabase-shop/commit/011f595069350cc258cc4097b69327664dbb00f6))
* add category management API and composable functions ([04b1940](https://github.com/plutocms/supabase-shop/commit/04b1940bd711a58c7dec8becc7accc8a440e4fad))
* add error handling for product not found in API response ([b782b6e](https://github.com/plutocms/supabase-shop/commit/b782b6e057df7a5f7ce0017731dbf46a84fdc70f))
* add sidebar actions for admin navigation ([f7d69ae](https://github.com/plutocms/supabase-shop/commit/f7d69aeb03523a2284a340b3edc38f3a48702cfd))
* added refresh product list button ([2f05669](https://github.com/plutocms/supabase-shop/commit/2f056696674c449d0bdbfc04243e290a41651bab))
* added supabase-storage layer ([335a59c](https://github.com/plutocms/supabase-shop/commit/335a59c83a426521babd68b3fd55493dbd3fdee4))
* allow overriding the ui, utils, and supabase layer paths via env vars ([fa16159](https://github.com/plutocms/supabase-shop/commit/fa1615999cb6f724b5d99ef34c376aaff0895d14))
* created supabase-shop schema ([39c49bb](https://github.com/plutocms/supabase-shop/commit/39c49bb975a961ed92c2c53081588cc09f0426c3))
* enhance product edit routing and add description handling ([7d149b5](https://github.com/plutocms/supabase-shop/commit/7d149b5cc2ec0c73d6884dd1abd705ac14205d25))
* extend supabase layer automatically ([8a50d1d](https://github.com/plutocms/supabase-shop/commit/8a50d1d345e23f30458ff7cb4d22ac6cfea9353d))
* extended utils layer ([b48dabc](https://github.com/plutocms/supabase-shop/commit/b48dabc8f8d1bad22d6ca53aafcbb9f17c831629))
* import NavbarAdminActionButtonProps type in NavbarAdminActions component ([e85accc](https://github.com/plutocms/supabase-shop/commit/e85acccdcbeb1981d57574708ce5f519f30c0d7c))
* moved PostTitleInput component to ui layer ([0107e0b](https://github.com/plutocms/supabase-shop/commit/0107e0b4693a6fb6b37b61d252566ccbd9ba69bd))
* refactor `useProduct` to use Nuxt's `useFetch` ([a39d265](https://github.com/plutocms/supabase-shop/commit/a39d265b922adca88bfb54090aede18b2e73368a))
* refactor Post.vue to improve layout and enhance media handling ([50e3865](https://github.com/plutocms/supabase-shop/commit/50e38658f08fbe245edcde665fc53d209574523e))
* refactor Post.vue to use PostTitleInput component and update layout styles ([c2956e3](https://github.com/plutocms/supabase-shop/commit/c2956e33d42d37e200190bcd05f974b40db2939f))
* refactor product-related types and API endpoints for media and categories ([a00108d](https://github.com/plutocms/supabase-shop/commit/a00108deba1772fbed758972382b2729d9601bba))
* restructure nuxt.config to separate development and production configurations ([508e362](https://github.com/plutocms/supabase-shop/commit/508e36297066cb2bc774909456a8be6fd55d60c8))
* return media url on product API response ([f2b26a4](https://github.com/plutocms/supabase-shop/commit/f2b26a47943ec4e023a297e82a45b6213c6d92fe))
* update CI and release workflows for improved tagging and verification processes ([504396c](https://github.com/plutocms/supabase-shop/commit/504396c719c9ad654d05d1834928566eca6d9a64))
* updated useProduct usage ([b44f057](https://github.com/plutocms/supabase-shop/commit/b44f057d3c5818037c344ab6f705ef550b206c7a))
* **useProductCategory:** created `getCategoryFromSlug` and `getCategoryLabelFromSlug` utilities ([57abf03](https://github.com/plutocms/supabase-shop/commit/57abf03a80ec5810e040f9dc3ae15e8dabd12335))
* **useProduct:** make it optionally awaitable ([7c45862](https://github.com/plutocms/supabase-shop/commit/7c45862205c7c131904657825eb03bb090178f2e))


### Bug Fixes

* add '@vueuse/integrations/useChangeCase' to Vite optimizeDeps ([35f73b3](https://github.com/plutocms/supabase-shop/commit/35f73b3c5294c1edf20bdfe99e5ff0078d1da8aa))
* add '@vueuse/integrations/useChangeCase' to Vite optimizeDeps ([7d9c445](https://github.com/plutocms/supabase-shop/commit/7d9c4453617277522f19103262092bf3ea360ebd))
* add @plutocms/supabase-storage dependency and update nuxt.config.ts reference ([2f08cb2](https://github.com/plutocms/supabase-shop/commit/2f08cb293d7a319564ed6523ebdcca6a45c690c6))
* add @vueuse/nuxt dependency to package.json and bun.lock ([a0b7c47](https://github.com/plutocms/supabase-shop/commit/a0b7c47269ad8c34a08c38aea17cdb990fd4ebd1))
* add fallback to `route.params.slug` in Edit product action button ([ae7a2ee](https://github.com/plutocms/supabase-shop/commit/ae7a2ee113d4c88a63c7e4b22ff304236e086182))
* Add fallback to `route.params.slug` in Edit product action button ([2b0c474](https://github.com/plutocms/supabase-shop/commit/2b0c474ec81b5fb06894acf08366f8d1a914710c))
* added @nuxtjs/supabase and @plutocms/utils ([26f3b19](https://github.com/plutocms/supabase-shop/commit/26f3b19982d295b2a70a2d644f8532a806ffced1))
* added light theme (temporary) ([6087d6f](https://github.com/plutocms/supabase-shop/commit/6087d6f293e66c43e655327fef8e7ca2909297a8))
* adjust padding ([94911ad](https://github.com/plutocms/supabase-shop/commit/94911ad64eb26c245ce2d84310ba5043b6b80379))
* adjustments in layout and styling ([3ebfc49](https://github.com/plutocms/supabase-shop/commit/3ebfc49b5dab8efadeb220331c2848f865be7659))
* auto-install plutocms/ui layer deps ([15dacd7](https://github.com/plutocms/supabase-shop/commit/15dacd7f8a01e955c3b11bbee70d0946d14ccfa9))
* auto-install ui layer dependencies ([bf627ed](https://github.com/plutocms/supabase-shop/commit/bf627ed2cb1691026d6488b79f017955bb1b890b))
* bump @plutocms/supabase and @plutocms/utils to their fixed patch releases ([3db8be4](https://github.com/plutocms/supabase-shop/commit/3db8be41d632e8a89b13186fc075f4df74dfd92c))
* bump stale @plutocms/ui and @plutocms/utils dependency ranges ([3b72e41](https://github.com/plutocms/supabase-shop/commit/3b72e411df7d2e018e0cbc4b9b4b5c685efd1ed8))
* bump version to 0.0.1-alpha.6 and update dependencies ([68e2230](https://github.com/plutocms/supabase-shop/commit/68e2230214b85e8af3e311cdc4c3720c3b0e87a0))
* correct slug URL formatting in Post.vue ([85d6996](https://github.com/plutocms/supabase-shop/commit/85d69961edfbc6d633c5cacc1c89d4026acc8eba))
* enable auto-install for supabase layer ([62bad35](https://github.com/plutocms/supabase-shop/commit/62bad357e444025225b2127d57189dbd6ddb58be))
* extract response data in product fetches ([a135a7b](https://github.com/plutocms/supabase-shop/commit/a135a7bdbbd505616e29d7f71a3974a9168a7590))
* install @nuxtjs/supabase and @plutocms/supabase as regular deps ([04cb4d5](https://github.com/plutocms/supabase-shop/commit/04cb4d55e6801d55863f371ca3d961085a8511c5))
* pre-bundle some deps ([2c813d8](https://github.com/plutocms/supabase-shop/commit/2c813d8bb17f3466d330be6546abf3a8e0b25aa7))
* prevent duplicate media uploads ([f254491](https://github.com/plutocms/supabase-shop/commit/f254491dab9a178490538a7928479767755068a7))
* prevent duplicate media uploads by handling existing and new media separately ([ec6e360](https://github.com/plutocms/supabase-shop/commit/ec6e3601142d1d0e19562b4e1db6a2ba89496221))
* remove @plutocms/supabase-storage from nuxt.config.js extends ([eb5ee53](https://github.com/plutocms/supabase-shop/commit/eb5ee5313b9e2d75d846f7baad13d2ee367aec22))
* remove layer auto-installs ([360ca8f](https://github.com/plutocms/supabase-shop/commit/360ca8fbb097185bc5501bb426e3c5fe2ce79ffc))
* removed environment based extends ([7c46e1e](https://github.com/plutocms/supabase-shop/commit/7c46e1e3a144377e0c0cfe4eea27dff8d592511a))
* removed layer dep auto-install ([d20846b](https://github.com/plutocms/supabase-shop/commit/d20846b5cc646ca846174c485c4243f45560289a))
* removed slug field for now ([2ff20b0](https://github.com/plutocms/supabase-shop/commit/2ff20b05b09fd5c9c32cd46b478de85cb946f9ef))
* rename refresh function variable for consistency in `useProduct` ([cd42616](https://github.com/plutocms/supabase-shop/commit/cd42616139eab6c97a5f4ddc629003b827480d1d))
* renamed `useAvailabilityStatus` composable to `useProductAvailability` and updated usage ([9ce7eb7](https://github.com/plutocms/supabase-shop/commit/9ce7eb7c264a96d61776b62481fc37ad73907416))
* renamed `useCategory` composable to `useProductCategory` ([b954228](https://github.com/plutocms/supabase-shop/commit/b954228e69798673ec295ad66f0c2419e70d93b1))
* reorganize dependencies and trustedDependencies in package.json ([e2eda31](https://github.com/plutocms/supabase-shop/commit/e2eda318e73c22b51c489d9952506762dcd390f9))
* reuse the shared ProductMedia type instead of a local duplicate ([0b4da39](https://github.com/plutocms/supabase-shop/commit/0b4da39ebe3d6a2bb9fcc8d248d7c495b702c23f))
* tailwind source detection ([444ad77](https://github.com/plutocms/supabase-shop/commit/444ad77f8d0108b5f287744be7f1e835892e26c5))
* **tailwind:** simplify source detection ([7a56236](https://github.com/plutocms/supabase-shop/commit/7a5623666cb8621e4217a6de1c5a7a08a5ece868))
* typo in API endpoint ([d853709](https://github.com/plutocms/supabase-shop/commit/d8537096c2118f7d49c033adee929294bcee8fd1))
* update @plutocms/supabase configuration to include install option ([adda20a](https://github.com/plutocms/supabase-shop/commit/adda20a431fbd02e977398d1bad1b83ee772f735))
* update @plutocms/supabase dependency to version 0.0.1-alpha.17 ([2f07b37](https://github.com/plutocms/supabase-shop/commit/2f07b3737145df3479a86e3be7383c504ea34cbb))
* update @plutocms/supabase dependency to version 0.0.1-alpha.17 ([6441332](https://github.com/plutocms/supabase-shop/commit/6441332854d1c55ab0f4e7a09daf9f09da23efcc))
* update @plutocms/supabase version to 0.0.1-alpha.11 and remove @plutocms/supabase-storage ([92c5c5c](https://github.com/plutocms/supabase-shop/commit/92c5c5c842c3da8ea6a42bcbf8e37d25f4d49770))
* update @plutocms/supabase version to 0.0.1-alpha.13 and increment package version to 0.0.1-alpha.18 ([2b3b72e](https://github.com/plutocms/supabase-shop/commit/2b3b72e9acb4f52992800257841c853c30de88f8)), closes [#14](https://github.com/plutocms/supabase-shop/issues/14)
* update @plutocms/ui dependency to version 0.0.1-alpha.2 ([0377fe8](https://github.com/plutocms/supabase-shop/commit/0377fe804cef5a0c7457a37eefbf05bad3d026ff))
* update @plutocms/ui dependency to version 0.0.1-alpha.3 ([7b9f9df](https://github.com/plutocms/supabase-shop/commit/7b9f9df13759ae10f690d0dffa2ff9a68c39ff77))
* update dependencies and correct package references ([cdc08a4](https://github.com/plutocms/supabase-shop/commit/cdc08a42196003cca01d039b895470419dd6d9d1))
* update extends syntax in nuxt.config.ts for consistency ([82c3fcb](https://github.com/plutocms/supabase-shop/commit/82c3fcb5591a61f97a909ac047292809de2ec01b))
* update package name to @plutocms/supabase-shop and set main entry point ([e7cdaf9](https://github.com/plutocms/supabase-shop/commit/e7cdaf9a689822d081e2fbeb16d0fe169f647bb2))
* update package reference to use NPM ([318deae](https://github.com/plutocms/supabase-shop/commit/318deaebb5ecb8c6f52c846ab6bac29390ecc5f8))
* update package version to 0.0.1-alpha.10 and dependencies to alpha.6 ([bdc1b4a](https://github.com/plutocms/supabase-shop/commit/bdc1b4afd12e32465c797c39a67a185168b15734))
* update package version to 0.0.1-alpha.11 and dependencies to alpha.7 ([8d7817f](https://github.com/plutocms/supabase-shop/commit/8d7817f7e9ae6f02adaf9285e7faa2fa9a08fa74))
* update package version to 0.0.1-alpha.12 and dependencies to alpha.8 ([f2ff988](https://github.com/plutocms/supabase-shop/commit/f2ff988e56c79cd814d56fa93596fb46444da9c6))
* update package version to 0.0.1-alpha.13 and dependencies to alpha.9 ([2be8cfc](https://github.com/plutocms/supabase-shop/commit/2be8cfc91e845ddaa5adb9f081af21f0817f7076))
* update package version to 0.0.1-alpha.14 ([2995076](https://github.com/plutocms/supabase-shop/commit/2995076188815fda8805ed9335e6da53ce398bd6))
* update package version to 0.0.1-alpha.16 ([67bc506](https://github.com/plutocms/supabase-shop/commit/67bc506b59be2cdf3f891b3ca9187c9abf63ab54))
* update package version to 0.0.1-alpha.17 ([d482f41](https://github.com/plutocms/supabase-shop/commit/d482f419e0f6969c876b3f00870c51435572789a))
* update package version to 0.0.1-alpha.5 and add @plutocms/supabase-storage as a dependency ([16783f1](https://github.com/plutocms/supabase-shop/commit/16783f123a016d4697ab3551e17ab3f2e02cf93c))
* update package version to 0.0.1-alpha.9 and dependencies to alpha.5 ([43f7d37](https://github.com/plutocms/supabase-shop/commit/43f7d37e8057c3316193030ff3258e2857e92d0b))
* update package.json and nuxt.config.ts to include @plutocms/ui as a dependency ([25bdc33](https://github.com/plutocms/supabase-shop/commit/25bdc33f08d9188aa49109085fd767cbb9027cc8))
* update references from product_categories to product_category ([c211874](https://github.com/plutocms/supabase-shop/commit/c2118744fd5264ce03b6cc1dc91adac8fe77543a))
* update version to 0.0.1-alpha.2 in package.json ([68cf3d5](https://github.com/plutocms/supabase-shop/commit/68cf3d561986070c12fb4963643981750699c2e3))
* updated product New Product endpoint ([485a77b](https://github.com/plutocms/supabase-shop/commit/485a77bdb071bba1e52e6aadf59dac1ee0ad8915))
* updated product path to remove id ([dcfad1e](https://github.com/plutocms/supabase-shop/commit/dcfad1ea63d9c60de727d1419961975a6d8a6f19))
* updated ProductItem types ([26a7ca3](https://github.com/plutocms/supabase-shop/commit/26a7ca3a585ddd73c5abd1954a567f11af4e58f5))
* use utils layer from github ([3b84b7f](https://github.com/plutocms/supabase-shop/commit/3b84b7f713cee92f7dc5e5d7c6f0e1316eef15d7))


### Miscellaneous Chores

* **ci:** add CI and release-please automated release pipeline ([c3e51a0](https://github.com/plutocms/supabase-shop/commit/c3e51a091a72d4806111206d8ae479f14b0fdf29))


### Code Refactoring

* renamed `useMedia` to `useProductMedia` and removed `getMediaUrl` util ([3d8d74c](https://github.com/plutocms/supabase-shop/commit/3d8d74c2c883f4bd18bb0ff0b15b7ee79d80c803))
