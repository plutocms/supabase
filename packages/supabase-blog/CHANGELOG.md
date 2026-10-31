# Changelog

## [0.17.0](https://github.com/plutocms/supabase-blog/compare/v0.16.0...v0.17.0) (2026-10-30)


### ⚠ BREAKING CHANGES

* the layer needs @plutocms/supabase >=0.18.0, which extends @plutocms/core instead of @plutocms/pluto. PLUTO_PLUTO_PATH is now PLUTO_CORE_PATH.

### Features

* extend @plutocms/core ([#98](https://github.com/plutocms/supabase-blog/issues/98)) ([03a21aa](https://github.com/plutocms/supabase-blog/commit/03a21aa6744de17b5350a853d052223f6793f9ca))

## [0.16.0](https://github.com/plutocms/supabase-blog/compare/v0.15.3...v0.16.0) (2026-10-30)


### Features

* New Post and Edit Post in the admin bar ([#89](https://github.com/plutocms/supabase-blog/issues/89)) ([097372c](https://github.com/plutocms/supabase-blog/commit/097372ca2430966ec993b9a9ba61db974af80223))

## [0.15.3](https://github.com/plutocms/supabase-blog/compare/v0.15.2...v0.15.3) (2026-10-29)


### Bug Fixes

* **deps:** accept every 0.x version of the [@plutocms](https://github.com/plutocms) packages; shared CI and the update workflow ([#77](https://github.com/plutocms/supabase-blog/issues/77)) ([f650239](https://github.com/plutocms/supabase-blog/commit/f65023920c07f18ab961fde5cf3adc95f6a26514))

## [0.15.2](https://github.com/plutocms/supabase-blog/compare/v0.15.1...v0.15.2) (2026-10-29)


### Bug Fixes

* **deps:** use @plutocms/supabase 0.15.4 and @plutocms/supabase-storage 0.13.4 (@plutocms/pluto 0.34) ([#75](https://github.com/plutocms/supabase-blog/issues/75)) ([5c5973a](https://github.com/plutocms/supabase-blog/commit/5c5973afe09aab168ba492d6baa1b64e6de84cf6))

## [0.15.1](https://github.com/plutocms/supabase-blog/compare/v0.15.0...v0.15.1) (2026-10-29)


### Bug Fixes

* **deps:** use @plutocms/supabase 0.15.3 and @plutocms/supabase-storage 0.13.3 (@plutocms/pluto 0.33) ([#72](https://github.com/plutocms/supabase-blog/issues/72)) ([941d72d](https://github.com/plutocms/supabase-blog/commit/941d72d3b21fb49929510ff3c46d0b01e2327d78))

## [0.15.0](https://github.com/plutocms/supabase-blog/compare/v0.14.0...v0.15.0) (2026-10-29)


### ⚠ BREAKING CHANGES

* **post:** edit posts in the core post editor; the public post path is /posts/<slug> ([#69](https://github.com/plutocms/supabase-blog/issues/69))

### Features

* **post:** edit posts in the core post editor; the public post path is /posts/&lt;slug&gt; ([#69](https://github.com/plutocms/supabase-blog/issues/69)) ([e2c0623](https://github.com/plutocms/supabase-blog/commit/e2c062347d72d0529d98cb0187b52e393ab88694))

## [0.14.0](https://github.com/plutocms/supabase-blog/compare/v0.13.1...v0.14.0) (2026-10-28)


### ⚠ BREAKING CHANGES

* stop extending @plutocms/ui ([#63](https://github.com/plutocms/supabase-blog/issues/63))
* remove the deprecated editor items and the schema stub ([#62](https://github.com/plutocms/supabase-blog/issues/62))

### Features

* remove the deprecated editor items and the schema stub ([#62](https://github.com/plutocms/supabase-blog/issues/62)) ([1d5758e](https://github.com/plutocms/supabase-blog/commit/1d5758ec99c0391beb3276f9172e3dd079fd8dc7))
* stop extending @plutocms/ui ([#63](https://github.com/plutocms/supabase-blog/issues/63)) ([3d36980](https://github.com/plutocms/supabase-blog/commit/3d36980fd6a62d92e11c6ce5460674ec66a341ce))


### Bug Fixes

* **deps:** use @plutocms/supabase 0.15 and @plutocms/supabase-storage 0.13 ([#65](https://github.com/plutocms/supabase-blog/issues/65)) ([cfe5bc3](https://github.com/plutocms/supabase-blog/commit/cfe5bc37d95d40e8655771dee5910112a4bef58d))

## [0.13.1](https://github.com/plutocms/supabase-blog/compare/v0.13.0...v0.13.1) (2026-10-27)


### Bug Fixes

* **deps:** use @plutocms/pluto 0.28 through supabase 0.14.1 and storage 0.12.1 ([#60](https://github.com/plutocms/supabase-blog/issues/60)) ([647ae87](https://github.com/plutocms/supabase-blog/commit/647ae872f15155c400b401c5bdfd609d1c73a6fb))

## [0.13.0](https://github.com/plutocms/supabase-blog/compare/v0.12.0...v0.13.0) (2026-10-27)


### ⚠ BREAKING CHANGES

* `/api/post/list`, `/api/post/get/:id` and `usePost` are gone.

### Features

* posts on the public API of Pluto, with an excerpt and sanitized html ([#58](https://github.com/plutocms/supabase-blog/issues/58)) ([4625a57](https://github.com/plutocms/supabase-blog/commit/4625a570bb0f90db67b084e5946b99867ef3b75e))

## [0.12.0](https://github.com/plutocms/supabase-blog/compare/v0.11.0...v0.12.0) (2026-10-25)


### Features

* **deps:** raise @plutocms/supabase to ^0.13.0 and @plutocms/supabase-storage to ^0.11.0 ([#55](https://github.com/plutocms/supabase-blog/issues/55)) ([b5190da](https://github.com/plutocms/supabase-blog/commit/b5190daf0e7efb74f0fd2f00ece6ee9bad65d3d6))

## [0.11.0](https://github.com/plutocms/supabase-blog/compare/v0.10.3...v0.11.0) (2026-10-25)


### Features

* **deps:** use @plutocms/supabase 0.12 and @plutocms/supabase-storage 0.10 ([#52](https://github.com/plutocms/supabase-blog/issues/52)) ([96713b0](https://github.com/plutocms/supabase-blog/commit/96713b0068e169e99ee361131b49f1bd1ec1a2d9))

## [0.10.3](https://github.com/plutocms/supabase-blog/compare/v0.10.2...v0.10.3) (2026-10-22)


### Bug Fixes

* **db:** grant Data API access to the posts table explicitly ([#50](https://github.com/plutocms/supabase-blog/issues/50)) ([b7c3973](https://github.com/plutocms/supabase-blog/commit/b7c3973aa8a389f50e9a30724be25e89dd4efd9a))

## [0.10.2](https://github.com/plutocms/supabase-blog/compare/v0.10.1...v0.10.2) (2026-10-21)


### Performance Improvements

* **post:** load the rich text editor on demand ([#48](https://github.com/plutocms/supabase-blog/issues/48)) ([3f7d6b3](https://github.com/plutocms/supabase-blog/commit/3f7d6b30d62df11c8102560a46c914a2dff293cb))

## [0.10.1](https://github.com/plutocms/supabase-blog/compare/v0.10.0...v0.10.1) (2026-10-20)


### Bug Fixes

* **admin:** add tab titles to the post pages ([#42](https://github.com/plutocms/supabase-blog/issues/42)) ([9adcd80](https://github.com/plutocms/supabase-blog/commit/9adcd80dd9dfc11403a4240087788ff4d8e96178))

## [0.10.0](https://github.com/plutocms/supabase-blog/compare/v0.9.0...v0.10.0) (2026-10-20)


### ⚠ BREAKING CHANGES

* **admin:** move to the pluto 0.16 admin shell ([#40](https://github.com/plutocms/supabase-blog/issues/40))

### Features

* **admin:** move to the pluto 0.16 admin shell ([#40](https://github.com/plutocms/supabase-blog/issues/40)) ([58da9ed](https://github.com/plutocms/supabase-blog/commit/58da9ed3cb1078fbac9788ae421e5fb7e879eeee))

## [0.9.0](https://github.com/plutocms/supabase-blog/compare/v0.8.1...v0.9.0) (2026-10-19)


### Features

* **i18n:** translate the blog admin and editor ([#38](https://github.com/plutocms/supabase-blog/issues/38)) ([470fc77](https://github.com/plutocms/supabase-blog/commit/470fc77895f52a13621658df4bf580ec16fb8b78))

## [0.8.1](https://github.com/plutocms/supabase-blog/compare/v0.8.0...v0.8.1) (2026-10-18)


### Bug Fixes

* **deps:** use @plutocms/supabase-storage 0.7 and @plutocms/supabase 0.9.1 ([#35](https://github.com/plutocms/supabase-blog/issues/35)) ([52ced90](https://github.com/plutocms/supabase-blog/commit/52ced90b47838fe08df921fb47c38dee0a187b39))

## [0.8.0](https://github.com/plutocms/supabase-blog/compare/v0.7.0...v0.8.0) (2026-10-17)


### ⚠ BREAKING CHANGES

* **css:** This layer no longer adds a Tailwind entry. The app's CSS entry must start with:

### Features

* **css:** stop registering a Tailwind CSS entry ([#33](https://github.com/plutocms/supabase-blog/issues/33)) ([92a5784](https://github.com/plutocms/supabase-blog/commit/92a5784a9c66489bf47c3afdebbfac02e1e241e5))

## [0.7.0](https://github.com/plutocms/supabase-blog/compare/v0.6.0...v0.7.0) (2026-10-17)


### Features

* **post:** use the focus layout for the post editor ([#31](https://github.com/plutocms/supabase-blog/issues/31)) ([b89e842](https://github.com/plutocms/supabase-blog/commit/b89e84237cea9273411c008fb804d2c9776e2400))

## [0.6.0](https://github.com/plutocms/supabase-blog/compare/v0.5.2...v0.6.0) (2026-09-14)


### Features

* **prose:** add `PlutoProse` for rendering stored richtext ([#29](https://github.com/plutocms/supabase-blog/issues/29)) ([fad9049](https://github.com/plutocms/supabase-blog/commit/fad904930ea5db7f792c0e9b30d8c6463be8d000))

## [0.5.2](https://github.com/plutocms/supabase-blog/compare/v0.5.1...v0.5.2) (2026-09-14)


### Bug Fixes

* **editor:** rebuild post editor on tiptap directly, fix freezes ([173f08a](https://github.com/plutocms/supabase-blog/commit/173f08a4bc32ddb37fd316a33dcce155bb92603e))

## [0.5.1](https://github.com/plutocms/supabase-blog/compare/v0.5.0...v0.5.1) (2026-09-14)


### Bug Fixes

* **content:** move postType under shared/utils so cross-layer imports work ([#26](https://github.com/plutocms/supabase-blog/issues/26)) ([d467193](https://github.com/plutocms/supabase-blog/commit/d46719312ac62b0c856010256059591062b4c7b9))

## [0.5.0](https://github.com/plutocms/supabase-blog/compare/v0.4.0...v0.5.0) (2026-09-13)


### Features

* **posts:** adopt the pluto content model ([#24](https://github.com/plutocms/supabase-blog/issues/24)) ([22052fb](https://github.com/plutocms/supabase-blog/commit/22052fbe288a1c07a5031f80db35d394449e9b48))

## [0.4.0](https://github.com/plutocms/supabase-blog/compare/v0.3.0...v0.4.0) (2026-09-12)


### Features

* **permissions:** gate posts on named capabilities ([#22](https://github.com/plutocms/supabase-blog/issues/22)) ([94afa03](https://github.com/plutocms/supabase-blog/commit/94afa03936f2882cf4a1c76bdbed10336305e315))

## [0.3.0](https://github.com/plutocms/supabase-blog/compare/v0.2.0...v0.3.0) (2026-09-12)


### Features

* **registry:** migrate to definePlutoExtension ([#20](https://github.com/plutocms/supabase-blog/issues/20)) ([1cbdccb](https://github.com/plutocms/supabase-blog/commit/1cbdccb18ebf78f2ac89975722b7d3d06f8a8091))

## [0.2.0](https://github.com/plutocms/supabase-blog/compare/v0.1.3...v0.2.0) (2026-09-12)


### Features

* **migrations:** move to versioned db/migrations layout ([#18](https://github.com/plutocms/supabase-blog/issues/18)) ([3eac117](https://github.com/plutocms/supabase-blog/commit/3eac1177d5188370dc2a9e0e38e67d6c69a7b613))


### Bug Fixes

* **deps:** require @plutocms/supabase 0.4.1 and @plutocms/supabase-storage 0.2.0 ([#19](https://github.com/plutocms/supabase-blog/issues/19)) ([186c7e1](https://github.com/plutocms/supabase-blog/commit/186c7e11953ba4e3abd89403459c34202665527d))
* **posts:** require admin for post mutations and draft reads ([#15](https://github.com/plutocms/supabase-blog/issues/15)) ([440ad2e](https://github.com/plutocms/supabase-blog/commit/440ad2e433d8f1b11fc0fdf9ed71b0b117263860))
* **schema:** make posts table/index creation idempotent ([#17](https://github.com/plutocms/supabase-blog/issues/17)) ([3892457](https://github.com/plutocms/supabase-blog/commit/38924572c53aac6966ac66e9230c98716e2a6592))

## [0.1.3](https://github.com/plutocms/supabase-blog/compare/v0.1.2...v0.1.3) (2026-09-10)


### Bug Fixes

* **deps:** require supabase 0.3.0 and supabase-storage 0.1.4 ([6ff5d1d](https://github.com/plutocms/supabase-blog/commit/6ff5d1d67925a1138f2a3b762de99f1ab483c2c6))

## [0.1.2](https://github.com/plutocms/supabase-blog/compare/v0.1.1...v0.1.2) (2026-09-10)


### Bug Fixes

* **deps:** require supabase 0.2.2 and supabase-storage 0.1.3 ([732d635](https://github.com/plutocms/supabase-blog/commit/732d635c9a23700b91d9dd2b5a51cbc6c3b0fc17))

## [0.1.1](https://github.com/plutocms/supabase-blog/compare/v0.1.0...v0.1.1) (2026-09-09)


### Bug Fixes

* **deps:** align released Pluto layers ([#11](https://github.com/plutocms/supabase-blog/issues/11)) ([637bcf0](https://github.com/plutocms/supabase-blog/commit/637bcf0bda56004c1420579ee45b686fa6a21f49))

## 0.1.0 (2026-09-03)


### Features

* depend on supabase, supabase-storage, and ui layers directly ([a04f65f](https://github.com/plutocms/supabase-blog/commit/a04f65f6116961e8242693098d5c0d78cc4e0ce6))


### Bug Fixes

* bump @plutocms/supabase-storage to ^0.1.1 ([4486b33](https://github.com/plutocms/supabase-blog/commit/4486b332b260c1c41e7f5d67164091e2656efc66))
* bump supabase, supabase-storage, and ui to their fixed releases ([97c6fdd](https://github.com/plutocms/supabase-blog/commit/97c6fdd912410defd35149678b8417191bc4c5b1))
* never ship the generated shared/types/supabase.ts placeholder ([ffb8e02](https://github.com/plutocms/supabase-blog/commit/ffb8e028601dd95500d49008a5a1b8085c657ed6))


### Miscellaneous Chores

* **ci:** promote to publishable package and add release-please pipeline ([2b838f1](https://github.com/plutocms/supabase-blog/commit/2b838f15e02515501ae43dd9a956a1a17664b736))
