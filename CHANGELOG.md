# Changelog

## [0.17.0](https://github.com/plutocms/supabase/compare/v0.16.0...v0.17.0) (2026-10-30)


### Features

* media previews, sort and rename in the Supabase driver ([#139](https://github.com/plutocms/supabase/issues/139)) ([8cdf071](https://github.com/plutocms/supabase/commit/8cdf0715c5a11db8e99423751708d2ab0feea455))

## [0.16.0](https://github.com/plutocms/supabase/compare/v0.15.5...v0.16.0) (2026-10-30)


### Features

* the Supabase driver of the core media library ([#135](https://github.com/plutocms/supabase/issues/135)) ([94aa31a](https://github.com/plutocms/supabase/commit/94aa31a5b13ed3866e17a9e074876aa79f2bdba8))

## [0.15.5](https://github.com/plutocms/supabase/compare/v0.15.4...v0.15.5) (2026-10-29)


### Bug Fixes

* **deps:** accept every 0.x version of the [@plutocms](https://github.com/plutocms) packages; shared CI and the update workflow ([#123](https://github.com/plutocms/supabase/issues/123)) ([7dd582e](https://github.com/plutocms/supabase/commit/7dd582e6ed325ddf0eda62fcf2eed07619e0510a))

## [0.15.4](https://github.com/plutocms/supabase/compare/v0.15.3...v0.15.4) (2026-10-29)


### Bug Fixes

* **deps:** use @plutocms/pluto 0.34 ([#121](https://github.com/plutocms/supabase/issues/121)) ([b9d58b7](https://github.com/plutocms/supabase/commit/b9d58b7aaea26ec785cd459ed6cb17977b591ce0))

## [0.15.3](https://github.com/plutocms/supabase/compare/v0.15.2...v0.15.3) (2026-10-29)


### Bug Fixes

* **deps:** use @plutocms/pluto 0.33 ([#119](https://github.com/plutocms/supabase/issues/119)) ([e3c68e2](https://github.com/plutocms/supabase/commit/e3c68e29c0152f8cc260c150a183d230bd414075))

## [0.15.2](https://github.com/plutocms/supabase/compare/v0.15.1...v0.15.2) (2026-10-29)


### Bug Fixes

* **deps:** use @plutocms/pluto 0.32 ([#117](https://github.com/plutocms/supabase/issues/117)) ([51e841d](https://github.com/plutocms/supabase/commit/51e841dc33cd887b22e14d05335eaa75a953ed09))

## [0.15.1](https://github.com/plutocms/supabase/compare/v0.15.0...v0.15.1) (2026-10-28)


### Bug Fixes

* **deps:** use @plutocms/pluto 0.30; Prettier formatting and canonical Tailwind classes ([#111](https://github.com/plutocms/supabase/issues/111)) ([925c138](https://github.com/plutocms/supabase/commit/925c1386ad2c4380e2e3217766c0ae342d96cae8))

## [0.15.0](https://github.com/plutocms/supabase/compare/v0.14.1...v0.15.0) (2026-10-28)


### ⚠ BREAKING CHANGES

* read migrations only from db/migrations ([#108](https://github.com/plutocms/supabase/issues/108))

### Features

* read migrations only from db/migrations ([#108](https://github.com/plutocms/supabase/issues/108)) ([a6c8683](https://github.com/plutocms/supabase/commit/a6c8683ba2f7da04976e87188d6ff6be3ed01503))


### Bug Fixes

* **deps:** use @plutocms/pluto 0.29 and @plutocms/utils 0.3 ([#110](https://github.com/plutocms/supabase/issues/110)) ([21a4549](https://github.com/plutocms/supabase/commit/21a4549ccff024131bc4cf00eedbd9ae07ba4a1d))

## [0.14.1](https://github.com/plutocms/supabase/compare/v0.14.0...v0.14.1) (2026-10-27)


### Bug Fixes

* **deps:** use @plutocms/pluto 0.28 ([#106](https://github.com/plutocms/supabase/issues/106)) ([a2cb3f2](https://github.com/plutocms/supabase/commit/a2cb3f284dc7cfd5585a76d1c6bfa7616c4fd994))

## [0.14.0](https://github.com/plutocms/supabase/compare/v0.13.0...v0.14.0) (2026-10-27)


### ⚠ BREAKING CHANGES

* the routes `/api/access/**`, `/api/auth/signup`, `/api/migrations/**`, `/api/permissions/me`, `/api/profile/locale`, `/api/settings/**`, `/api/setup/create` and `/api/users/**` moved under `/api/_pluto/supabase/` (see the README), and failures are HTTP errors.

### Features

* move the internal routes under /api/_pluto/supabase, and support the public API ([#104](https://github.com/plutocms/supabase/issues/104)) ([e7bf91c](https://github.com/plutocms/supabase/commit/e7bf91cd5a802247b4ec3b6938389b94a06ce3e3))

## [0.13.0](https://github.com/plutocms/supabase/compare/v0.12.0...v0.13.0) (2026-10-25)


### Features

* **deps:** raise @plutocms/pluto to ^0.20.0 ([#101](https://github.com/plutocms/supabase/issues/101)) ([ef39fb7](https://github.com/plutocms/supabase/commit/ef39fb717114f4302dd01a0877a8b2a68cf53613))

## [0.12.0](https://github.com/plutocms/supabase/compare/v0.11.3...v0.12.0) (2026-10-25)


### Features

* **access:** manage users and roles, with invites through Pluto mail ([#98](https://github.com/plutocms/supabase/issues/98)) ([0d2ffbf](https://github.com/plutocms/supabase/commit/0d2ffbf0b3f7ad14e1ceeac6e396e01a6bb63279))

## [0.11.3](https://github.com/plutocms/supabase/compare/v0.11.2...v0.11.3) (2026-10-22)


### Bug Fixes

* **permissions:** treat a profile admin as admin when my_capabilities() is missing ([#96](https://github.com/plutocms/supabase/issues/96)) ([f0e4980](https://github.com/plutocms/supabase/commit/f0e49808d0a7ceb9ffec45947e9ba5a1a033b9aa))

## [0.11.2](https://github.com/plutocms/supabase/compare/v0.11.1...v0.11.2) (2026-10-22)


### Bug Fixes

* **db:** grant Data API access explicitly and restrict staff reads ([#93](https://github.com/plutocms/supabase/issues/93)) ([0ed2d56](https://github.com/plutocms/supabase/commit/0ed2d56c593ed6550312692e125ba75525f5fd69))
* **typegen:** keep the PostgREST version block and match the app's lint output ([#94](https://github.com/plutocms/supabase/issues/94)) ([38ec3ea](https://github.com/plutocms/supabase/commit/38ec3ea5e49ef559cfc8142bbbfff401f934cd22))

## [0.11.1](https://github.com/plutocms/supabase/compare/v0.11.0...v0.11.1) (2026-10-21)


### Bug Fixes

* **deps:** use @plutocms/pluto 0.17 ([#91](https://github.com/plutocms/supabase/issues/91)) ([7deeac5](https://github.com/plutocms/supabase/commit/7deeac5379ddaac0317fa457897190c0850e8ffc))
* **typegen:** keep the PostgREST version block and the app's format ([#90](https://github.com/plutocms/supabase/issues/90)) ([2518c33](https://github.com/plutocms/supabase/commit/2518c33f69fe188e69d93695819d7d3ca19932d7))


### Performance Improvements

* **admin:** load the admin components on demand and start the setup check early ([#89](https://github.com/plutocms/supabase/issues/89)) ([f0d36bc](https://github.com/plutocms/supabase/commit/f0d36bc7d46f911522990653cd93ebb523c5a774))

## [0.11.0](https://github.com/plutocms/supabase/compare/v0.10.0...v0.11.0) (2026-10-20)


### ⚠ BREAKING CHANGES

* **admin:** move the admin shell to the pluto auth driver ([#83](https://github.com/plutocms/supabase/issues/83))

### Features

* **admin:** move the admin shell to the pluto auth driver ([#83](https://github.com/plutocms/supabase/issues/83)) ([52ba78f](https://github.com/plutocms/supabase/commit/52ba78f934255e70a7b5188982bdb83f9fa5f86a))

## [0.10.0](https://github.com/plutocms/supabase/compare/v0.9.1...v0.10.0) (2026-10-18)


### Features

* **i18n:** store each user's admin language ([#79](https://github.com/plutocms/supabase/issues/79)) ([2ca171a](https://github.com/plutocms/supabase/commit/2ca171a97acbc2de4537b82b6718acbcc2c1fbd5))
* **i18n:** translate the supabase admin pages ([#82](https://github.com/plutocms/supabase/issues/82)) ([bae1372](https://github.com/plutocms/supabase/commit/bae1372fdb89414fcb20ec74c428812f25077f6b))

## [0.9.1](https://github.com/plutocms/supabase/compare/v0.9.0...v0.9.1) (2026-10-18)


### Bug Fixes

* **deps:** use @plutocms/pluto 0.13 ([#77](https://github.com/plutocms/supabase/issues/77)) ([d0ca79b](https://github.com/plutocms/supabase/commit/d0ca79b58faebcb263caaa0c29a5d5cd72023f37))

## [0.9.0](https://github.com/plutocms/supabase/compare/v0.8.6...v0.9.0) (2026-10-17)


### ⚠ BREAKING CHANGES

* **content:** This layer no longer adds a Tailwind entry. The app's CSS entry must start with:

### Features

* **content:** count created items, use the admin theme, and drop the Tailwind entry ([#75](https://github.com/plutocms/supabase/issues/75)) ([ae4665a](https://github.com/plutocms/supabase/commit/ae4665aa050564ad6fa36362add604e52828097c))

## [0.8.6](https://github.com/plutocms/supabase/compare/v0.8.5...v0.8.6) (2026-10-17)


### Bug Fixes

* **deps:** drop the typescript devDependency that conflicts with overrides ([#73](https://github.com/plutocms/supabase/issues/73)) ([7521b09](https://github.com/plutocms/supabase/commit/7521b096485d085999bce553da937ff22d5dc98e))

## [0.8.5](https://github.com/plutocms/supabase/compare/v0.8.4...v0.8.5) (2026-10-16)


### Bug Fixes

* **deps:** upgrade dependencies ([#71](https://github.com/plutocms/supabase/issues/71)) ([95845ea](https://github.com/plutocms/supabase/commit/95845ea1a50b38103c8bd491858958f27c20cb02))

## [0.8.4](https://github.com/plutocms/supabase/compare/v0.8.3...v0.8.4) (2026-09-14)


### Bug Fixes

* **security:** validate request bodies with zod ([#69](https://github.com/plutocms/supabase/issues/69)) ([94f179b](https://github.com/plutocms/supabase/commit/94f179bbfdd67a55c18764a5bf6fde0cc6635936))

## [0.8.3](https://github.com/plutocms/supabase/compare/v0.8.2...v0.8.3) (2026-09-13)


### Bug Fixes

* **deps:** ensure @plutocms/pluto ^0.10.0 range is published ([#67](https://github.com/plutocms/supabase/issues/67)) ([ed45ad3](https://github.com/plutocms/supabase/commit/ed45ad3a5b1ed4c4990a2272c48571c5e8eb5a92))

## [0.8.2](https://github.com/plutocms/supabase/compare/v0.8.1...v0.8.2) (2026-09-13)


### Bug Fixes

* **deps:** bump pluto to ^0.9.0, pin typescript to ^5.9.3 ([#64](https://github.com/plutocms/supabase/issues/64)) ([b5483d4](https://github.com/plutocms/supabase/commit/b5483d4df9b27214d67d915ae57cbe1cef016969))

## [0.8.1](https://github.com/plutocms/supabase/compare/v0.8.0...v0.8.1) (2026-09-13)


### Bug Fixes

* **content:** widen the adapter's client cast through unknown ([#62](https://github.com/plutocms/supabase/issues/62)) ([f539958](https://github.com/plutocms/supabase/commit/f539958ac062ebd3d295731e419801d5ade6861c))

## [0.8.0](https://github.com/plutocms/supabase/compare/v0.7.2...v0.8.0) (2026-09-13)


### Features

* **content:** add Supabase-backed PlutoContentAdapter (wave 4) ([#60](https://github.com/plutocms/supabase/issues/60)) ([834136d](https://github.com/plutocms/supabase/commit/834136d39f2297ad771cf00de5bc33f0e811a4b9))

## [0.7.2](https://github.com/plutocms/supabase/compare/v0.7.1...v0.7.2) (2026-09-13)


### Bug Fixes

* **permissions:** make requireAdmin safe on a zero-migration database ([#58](https://github.com/plutocms/supabase/issues/58)) ([a83f6d0](https://github.com/plutocms/supabase/commit/a83f6d0bfa3ae150df5b90a06fcd29fe437ad9b7))

## [0.7.1](https://github.com/plutocms/supabase/compare/v0.7.0...v0.7.1) (2026-09-13)


### Bug Fixes

* **permissions:** break the migrations-page bootstrap deadlock ([#55](https://github.com/plutocms/supabase/issues/55)) ([19f4338](https://github.com/plutocms/supabase/commit/19f43388827ba1f4699a2347726e56084c06f8ef))

## [0.7.0](https://github.com/plutocms/supabase/compare/v0.6.0...v0.7.0) (2026-09-12)


### Features

* **permissions:** add role-based capabilities, replacing single-bit admin ([#53](https://github.com/plutocms/supabase/issues/53)) ([72f2eb0](https://github.com/plutocms/supabase/commit/72f2eb051efe15e261d3c7fcef95bdf867e11f5a))

## [0.6.0](https://github.com/plutocms/supabase/compare/v0.5.0...v0.6.0) (2026-09-12)


### Features

* **settings:** generic, namespaced setting keys ([#51](https://github.com/plutocms/supabase/issues/51)) ([2410552](https://github.com/plutocms/supabase/commit/2410552ce6c880ecec1fac6f0b84852ef8612bea))

## [0.5.0](https://github.com/plutocms/supabase/compare/v0.4.1...v0.5.0) (2026-09-12)


### Features

* **registry:** migrate to definePlutoExtension ([#49](https://github.com/plutocms/supabase/issues/49)) ([9a4848c](https://github.com/plutocms/supabase/commit/9a4848c2906876bb521fe8ed9dbce433d7110c30))

## [0.4.1](https://github.com/plutocms/supabase/compare/v0.4.0...v0.4.1) (2026-09-12)


### Bug Fixes

* **migrations:** import useFetch and computed explicitly in useMigrations ([#47](https://github.com/plutocms/supabase/issues/47)) ([58739cd](https://github.com/plutocms/supabase/commit/58739cd5df99bae43352a719d348f49ba2b2bf32))

## [0.4.0](https://github.com/plutocms/supabase/compare/v0.3.0...v0.4.0) (2026-09-11)


### Features

* **migrations:** harden SQL splitter and add a versioned ledger shape ([#45](https://github.com/plutocms/supabase/issues/45)) ([f6e54a6](https://github.com/plutocms/supabase/commit/f6e54a6d87ae12c197e467c6d271793ce0ae4b7f))
* **migrations:** versioned per-file migration engine ([#46](https://github.com/plutocms/supabase/issues/46)) ([2e39d12](https://github.com/plutocms/supabase/commit/2e39d1255ada616ae55894bc2d363eb710d1a8dd))


### Bug Fixes

* close setup-wizard RCE, signup privilege escalation, and unguarded admin routes ([#43](https://github.com/plutocms/supabase/issues/43)) ([81c3c7e](https://github.com/plutocms/supabase/commit/81c3c7eb7c2dfa80b426d91d0330176298316be4))
* **deps:** move @nuxt/eslint to dependencies ([#42](https://github.com/plutocms/supabase/issues/42)) ([11e5b1e](https://github.com/plutocms/supabase/commit/11e5b1eac80436af85a70252d25e22bda8bc3be2))
* **navbar:** hide admin navbar on public auth pages ([f9b2a9e](https://github.com/plutocms/supabase/commit/f9b2a9e8db7c83f89c842565e359f794fb700143))
* **types:** drop media.product_id from the committed type snapshot ([#44](https://github.com/plutocms/supabase/issues/44)) ([6b21506](https://github.com/plutocms/supabase/commit/6b215064c4f8538af097b71b4b5f1567de1d585e))

## [0.3.0](https://github.com/plutocms/supabase/compare/v0.2.2...v0.3.0) (2026-09-10)


### Features

* **migrations:** detect and apply pending layer schemas ([b7f0785](https://github.com/plutocms/supabase/commit/b7f0785838f65dcbf9cb22fb3d21307c0819f70b))


### Bug Fixes

* **setup:** apply layer schemas when the wizard completes ([f29b2aa](https://github.com/plutocms/supabase/commit/f29b2aae4f8b6c5211f157ad349e0566df57c5cc))

## [0.2.2](https://github.com/plutocms/supabase/compare/v0.2.1...v0.2.2) (2026-09-10)


### Bug Fixes

* **deps:** require pluto 0.3.2 ([6a6382a](https://github.com/plutocms/supabase/commit/6a6382aed8103a58f8b586df82e8e36e6e7c1f02))

## [0.2.1](https://github.com/plutocms/supabase/compare/v0.2.0...v0.2.1) (2026-09-09)


### Bug Fixes

* **admin:** register navbar and isolate layer styles ([#37](https://github.com/plutocms/supabase/issues/37)) ([38853b9](https://github.com/plutocms/supabase/commit/38853b93d2664b583cc2b1c993c937cc8e895354))

## [0.2.0](https://github.com/plutocms/supabase/compare/v0.1.2...v0.2.0) (2026-09-09)


### Features

* make admin account views responsive ([#35](https://github.com/plutocms/supabase/issues/35)) ([cfa5bf0](https://github.com/plutocms/supabase/commit/cfa5bf0b902e0180272eb40d0d170589442ea179))

## [0.1.2](https://github.com/plutocms/supabase/compare/v0.1.1...v0.1.2) (2026-09-08)


### Bug Fixes

* type layerSchemas runtime config as Record&lt;string, string&gt; ([0ad5a8a](https://github.com/plutocms/supabase/commit/0ad5a8a42751e33c87e0c733df8344616e3706e0))

## [0.1.1](https://github.com/plutocms/supabase/compare/v0.1.0...v0.1.1) (2026-09-03)


### Bug Fixes

* regenerate Database types to include the media table ([b0e6203](https://github.com/plutocms/supabase/commit/b0e6203706eaec9eed3db3c3b235a2ef05b80605))

## [0.1.0](https://github.com/plutocms/supabase/compare/v0.0.1-alpha.17...v0.1.0) (2026-09-03)


### Features

* add @plutocms/pluto ([1a324df](https://github.com/plutocms/supabase/commit/1a324dfa810f80f1628f30cbd68099b57f5c8edc))
* add account verification page with success message and navigation to dashboard ([e2ad283](https://github.com/plutocms/supabase/commit/e2ad283b1f909c3726b9a35b370239394611a405))
* add authentication pages for login and signup ([19dc7ee](https://github.com/plutocms/supabase/commit/19dc7ee8593615d10853bea8eeeb2fa653e621d5))
* add cookie alias in nuxt configuration and remove overrides from package.json ([6d825b9](https://github.com/plutocms/supabase/commit/6d825b98b6b4b8c26a34904c13b851115578b81c))
* add default formatter and format on save settings for Vue and Tailwind CSS ([4227a8c](https://github.com/plutocms/supabase/commit/4227a8c66522377fcc3ee087a2a53d471aefd410))
* add generateSupabaseTypes function and integrate it into nuxt config hooks ([566a249](https://github.com/plutocms/supabase/commit/566a2490646cc736b74c160a78a11e73f435c1a6))
* add GitHub Actions workflow for release automation ([ad44026](https://github.com/plutocms/supabase/commit/ad44026ede875ae4987637a9086817867618b436))
* add NavbarAdmin component with user settings and navigation links ([6f41c20](https://github.com/plutocms/supabase/commit/6f41c201aa925946a94153765d452b1fa0adcee2))
* add nitro externals configuration for supabase-js ([cc48bc1](https://github.com/plutocms/supabase/commit/cc48bc1cf44d1d8d22e407624965ff0cc26de2c2))
* add read access policy for profiles table ([f1dec29](https://github.com/plutocms/supabase/commit/f1dec291280e89963ee7a10b53ab09b87aa49d8d))
* add setup wizard for supabase DB configuration ([432ac3a](https://github.com/plutocms/supabase/commit/432ac3a07dccf80bb1e71a0b423862a4f2435e8e))
* add supabase types for database schema and operations ([7641086](https://github.com/plutocms/supabase/commit/764108666b0f80c49432f792c56f5e79ef88fc41))
* add user API endpoints for fetching profiles ([53bfbe8](https://github.com/plutocms/supabase/commit/53bfbe87f51311eec2a95bc644d6cae58e20dd7f))
* added `plutocms/utils` layer ([2e37ec7](https://github.com/plutocms/supabase/commit/2e37ec7513b9e72be4b5b776dac88482531a95d7))
* added auth middleware moved from core layer ([d8a1260](https://github.com/plutocms/supabase/commit/d8a12606c4ce667284691dd33e919ee7a81833e9))
* added base setup layout ([7a4a95d](https://github.com/plutocms/supabase/commit/7a4a95da1cc27bcdf3966752c00e81beffc27463))
* added settings and media pages ([b7e079e](https://github.com/plutocms/supabase/commit/b7e079eb1325e56ef10b1998d4e5f15805d4db51))
* added sidebar actions ([e156c95](https://github.com/plutocms/supabase/commit/e156c95ef792928ce0c0a7ab9a0d8b7789643963))
* **agent:** added `supabase-postgres-best-practices` skill ([7dcf5e7](https://github.com/plutocms/supabase/commit/7dcf5e71094618aaa32fbb77ab3f3114b0ea8492))
* **agent:** added antfu/nuxt and nuxt/ui skills ([a7d7d41](https://github.com/plutocms/supabase/commit/a7d7d4124e181b61a1fd17fefe46d7088759dc8b))
* allow access to /admin/confirm route for unauthenticated users ([5420f3a](https://github.com/plutocms/supabase/commit/5420f3a33154f6a47133373cfe7fc1b4ee48d75a))
* allow overriding the pluto and utils layer paths via env vars ([f1bc3bf](https://github.com/plutocms/supabase/commit/f1bc3bfee5a73fdc79a0c97d7076d0a8eaf223c7))
* **auth:** added signup API endpoint to /api/auth ([7a70396](https://github.com/plutocms/supabase/commit/7a70396ef3723a6750a950ee4fd89fadfb2fa824))
* **auth:** forgot password ([5a0dea9](https://github.com/plutocms/supabase/commit/5a0dea9a5bb8892bb564bae4243a47ee8d7af4b4))
* **auth:** implement password reset flow with PKCE code exchange ([26efcff](https://github.com/plutocms/supabase/commit/26efcffbbc40a7c96b072447111563a82b99484f))
* **config:** remove TypeScript error suppression for Supabase module in development mode ([8388dfa](https://github.com/plutocms/supabase/commit/8388dfa51ccf57a66083510226924bbcc62e6e45))
* created `supabase-storage` layer ([0cb46f6](https://github.com/plutocms/supabase/commit/0cb46f63bbbd0c3f826c22373c22cc6b16e28c5c))
* **database:** add healthcheck type and update settings enums ([5db65c5](https://github.com/plutocms/supabase/commit/5db65c54090058e7138ceaa58932462d3de92be0))
* **database:** update healthcheck structure with config_name and config_value ([9b8258e](https://github.com/plutocms/supabase/commit/9b8258ef7e41314932d8a42270088dc01fd5aaf4))
* **deps:** added `postgres` ([047ed55](https://github.com/plutocms/supabase/commit/047ed556312b8853e6a54ebb5088f62f555e80f4))
* enhance CI and release workflows with improved checks and configurations ([09c32a1](https://github.com/plutocms/supabase/commit/09c32a1e507a3b531cdc09b8185f6f978f3ab689))
* enhance settings and profiles schema with enum type and additional policies ([c2cd441](https://github.com/plutocms/supabase/commit/c2cd441dff521e32e7a90b419e73a4f9cd964c0b))
* enhance signup and auth flows with user feedback toasts for success and error messages ([3c66b5e](https://github.com/plutocms/supabase/commit/3c66b5e5dba8c8938971588b5791d1bef2b72e83))
* enhance signup flow with email verification message and user guidance ([de762bf](https://github.com/plutocms/supabase/commit/de762bf1b7e3d9c933ad7f6d0e9a2adb577b7124))
* **eslint:** update ESLint rules for Vue component formatting ([cf056de](https://github.com/plutocms/supabase/commit/cf056de70462ee20ac37fcc048bf8dbfe6183e47))
* extend nuxt configuration with plutocms/utils ([c00445d](https://github.com/plutocms/supabase/commit/c00445d497a171c0a7805fa652bfeb1b17e36f5c))
* get route middleware conditions from a single source ([4046518](https://github.com/plutocms/supabase/commit/4046518128486e96a125080aba96f6141c630a7d))
* implement admin account creation in setup wizard and update signup process ([220e864](https://github.com/plutocms/supabase/commit/220e86493728df98ddff93b32985680fa883726d))
* implement pluto migrations module with schema tracking and migration execution ([a778055](https://github.com/plutocms/supabase/commit/a778055b5de12e73dc69ab9fe4a99f267f83f886))
* import domainFromUrl in NavbarAdmin component ([772490a](https://github.com/plutocms/supabase/commit/772490a4c6f4522d6932e5121bd105ab7f48ef00))
* improved typecheck ([54f333b](https://github.com/plutocms/supabase/commit/54f333bd99e34f04b308ea4340a03b187a605091))
* improved typecheck ([69c2ef9](https://github.com/plutocms/supabase/commit/69c2ef914221dd70508708eb7fd38855a89745ff))
* make email, username, display name, password, and confirm password fields required in signup form ([8e63080](https://github.com/plutocms/supabase/commit/8e6308058724bf0a8a93c5381c6cfccd979bc517))
* pass route to `useAuth` for improved navigation ([e6a911a](https://github.com/plutocms/supabase/commit/e6a911a2a0c258c4b9271c019ee706952d1cef1d))
* restructure nuxt configuration for development and production environments ([0831553](https://github.com/plutocms/supabase/commit/08315533b991adbc3c806866177320eb71c90424))
* **schema:** refactor healthcheck logic by creating a dedicated table and enum type ([c6b9758](https://github.com/plutocms/supabase/commit/c6b975889628b48c3558adf1f5b7877f7de77aae))
* **schema:** refactor settings and create dedicated healthcheck table ([1adf585](https://github.com/plutocms/supabase/commit/1adf5855ae69204afe14905cc814e2cffbf67c12))
* **setup:** add connection string input to setup wizard and update API payload ([0696957](https://github.com/plutocms/supabase/commit/0696957d3e4741cb42248b6ec47c04959ffda084))
* **setup:** implement first-time-setup-check ([8963510](https://github.com/plutocms/supabase/commit/8963510b6ea81bc2485140d941779b469fda043b))
* Supabase DB Setup Wizard ([b452aa7](https://github.com/plutocms/supabase/commit/b452aa783d742e639bba48de8ef3cfdce21d47bd))
* update database schema with new healthcheck and pluto_migrations tables, and adjust enums ([0a69684](https://github.com/plutocms/supabase/commit/0a696845a049af6422a148195728ef58efda398e))
* update ESLint configuration to ignore markdown files and additional directories ([9fb56c2](https://github.com/plutocms/supabase/commit/9fb56c26be93c0cb319f5f0138592fda88249694))
* update nuxt configuration for improved environment handling and module management ([8a61ebc](https://github.com/plutocms/supabase/commit/8a61ebcc4b2e73ca9185856bd2a0972cf7235969))
* update signup process to use username and display name, and improve admin account handling ([af07ade](https://github.com/plutocms/supabase/commit/af07ade3416554c5870a2bef5caf82b4a263a807))


### Bug Fixes

* add update policy for authenticated users on healthcheck and update profiles table structure ([12e2b35](https://github.com/plutocms/supabase/commit/12e2b353951fdde92b44ce5d207dcd2bc0f2414f))
* added condition to auth middleware ([5d8ca9c](https://github.com/plutocms/supabase/commit/5d8ca9caac2d4f85b8eb496ae3f99d95df7b220b))
* auto-install pluto layer dependencies ([7aa4afe](https://github.com/plutocms/supabase/commit/7aa4afe1c873b423a8924e410cb00ef4bd09268e))
* better Signup flow ([b1253bb](https://github.com/plutocms/supabase/commit/b1253bb122f6bd068895323aa2fca6cd934bede6))
* call password reset on the client-side ([86afa79](https://github.com/plutocms/supabase/commit/86afa792fe8a0f153ff2bca8ece243c849ed15b0))
* change log level from success to info when generating Supabase types ([e664c00](https://github.com/plutocms/supabase/commit/e664c0076bacd644e1cd2233505ae9a20b3e82ca))
* enhance SQL statement splitting and execution ([19434d5](https://github.com/plutocms/supabase/commit/19434d599306d36d82be2a231087044611efec09))
* ensure enum types and policies are created only if they do not exist in schema.sql ([15c9ed8](https://github.com/plutocms/supabase/commit/15c9ed80571fd039463f8997ae607ce37eec6786))
* ensure success property is typed as const in healthcheck response ([dc54a8e](https://github.com/plutocms/supabase/commit/dc54a8e2d3620c831001148ca64d2182d95c8b97))
* extend pluto core layer ([2344a49](https://github.com/plutocms/supabase/commit/2344a4903ec7d5a8f51afc130bf2c78539f2937e))
* handle error response for healthcheck settings retrieval ([4c2eb37](https://github.com/plutocms/supabase/commit/4c2eb37af2b104626696e2ea8ff08aaa4901e9d7))
* handle sign-up errors and return user data on successful registration ([8f22de1](https://github.com/plutocms/supabase/commit/8f22de1d90affff5b72febf6bc5f240c35c7357a))
* improve conditional checks in setup-check middleware ([a54d9cf](https://github.com/plutocms/supabase/commit/a54d9cfe59ba9001b1d9160ca0b16a7dd08cd596))
* improve type definition for route in auth middleware ([c34632b](https://github.com/plutocms/supabase/commit/c34632b680e1e883f496e59201c6cec70412c510))
* prevent logout for users on the admin setup page ([2cc4f71](https://github.com/plutocms/supabase/commit/2cc4f71608f90c4c8fdb335ebb868e0caf4e0062))
* redirect to Wizard if fetch fails ([5c679e3](https://github.com/plutocms/supabase/commit/5c679e31ed5e66704af3560c8c58213cb2222284))
* refactor user and session handling in `useAuth` ([a3b4ac0](https://github.com/plutocms/supabase/commit/a3b4ac0f5df4b5d39a01bcad8e6481288144b9b4))
* reorder import statements in typegen.ts for consistency ([1097e64](https://github.com/plutocms/supabase/commit/1097e64bfa47ee4b4624d813424b6f3a189edea2))
* return the logout function on auth route middleware ([cbf138e](https://github.com/plutocms/supabase/commit/cbf138e404cdef54fa3ca14369ed057b4be35fba))
* scan pluto layer components for tailwind class generation ([67c40d4](https://github.com/plutocms/supabase/commit/67c40d473b35e670714850a22a08dd684d423d71))
* show display name and username, and enhance GitHub link label ([578a290](https://github.com/plutocms/supabase/commit/578a29058d2bf9d4d168c465287b10d9da59d452))
* simplify enum type creation for settings and healthcheck in schema.sql ([fa7849b](https://github.com/plutocms/supabase/commit/fa7849bee6fd7cc87519e4f3e3c80c460f615a92))
* streamline database setup logic and correct SQL update statement ([7b1e692](https://github.com/plutocms/supabase/commit/7b1e6929ba3fd43782f1d95108c4f25be56d0cfd))
* update @plutocms/pluto and @plutocms/utils to latest alpha versions ([634d940](https://github.com/plutocms/supabase/commit/634d9403b5d7f670e20aa5a56cd7c71facd12d06))
* update @plutocms/pluto to version 0.0.1-alpha.4 in package.json and bun.lock ([5b0c1d7](https://github.com/plutocms/supabase/commit/5b0c1d769ff619ead8513cf00a216b85172dc232))
* update module extensions to use correct package format ([ec62068](https://github.com/plutocms/supabase/commit/ec620685728c7d0f8113c488d3fbc0e9b1299f5b))
* update package name to include scope [@plutocms](https://github.com/plutocms) ([0e2ffc5](https://github.com/plutocms/supabase/commit/0e2ffc5b8eef3c6b52994cf2d391aca04283724d))
* updated string utils path ([abcfbf3](https://github.com/plutocms/supabase/commit/abcfbf3143ef623984fc656dad988e2e23830ce1))


### Miscellaneous Chores

* **ci:** migrate to release-please for automated releases ([8c3b7e9](https://github.com/plutocms/supabase/commit/8c3b7e933a167cdafae5d24eab7c13a881d1eee7))
