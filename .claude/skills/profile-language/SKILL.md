---
name: profile-language
description: Profile language
---

# Profile language

This feature stores the admin language of each user in the database. It plugs into the i18n
system of `@plutocms/pluto` (see the `i18n` skill in `pluto`) through a locale driver. It adds:

- `db/migrations/005_profile_locale.sql` — the `profiles.locale` column, its format check, and
  the `public.set_my_locale(text)` function.
- `server/api/profile/locale.get.ts` — returns `{ locale: string | null }` for the calling user.
- `server/api/profile/locale.post.ts` — stores the language of the calling user.
- `app/plugins/pluto-extension.ts` — registers the `localeDriver` (`load` and `save`).
- `app/plugins/pluto-locale-sync.client.ts` — loads the stored language when a session appears.
- `i18n/locales/en.json`, `i18n/locales/pt-BR.json` — the text of this layer, in the `supabase`
  namespace. Only the keys that this feature uses are there so far.
- `test/locale-route.test.ts`, `test/migrations-005.test.ts`, `test/i18n-locale-files.test.ts`.

## The data

`profiles.locale` is text and can be null. Null means "Automatic": the user has not chosen a
language, so the admin uses the browser language. The check `profiles_locale_format` accepts
any code that looks like `en` or `pt-BR`. It does not list the allowed languages, so a new
language needs no migration. The route checks the code against the languages that the app
offers (`runtimeConfig.public.plutoI18n.adminLocales`).

## Why a function writes the column

`public.profiles` has no UPDATE policy, on purpose. A policy that lets a user update their own
row would also let them write `is_admin`. So `public.set_my_locale(new_locale text)` is the only
writer. It is `security definer`, with an empty `search_path`. It updates the row where
`id = auth.uid()` and sets only `locale` and `updated_at`. The migration revokes `execute` from
`public` and `anon`, and grants it to `authenticated`. It adds no RLS policy. A user reads their
own row through the existing select policy.

## The routes

`GET /api/profile/locale` reads `locale` with `.eq('id', user.sub)`. It uses `user.sub`, not
`user.id`, because the claims object has no `id` (see `server/utils/admin-guard.ts`). A signed-out
caller gets `{ locale: null }`. If the read fails because the column does not exist yet, the route
logs the error and returns `{ locale: null }`. This is the same way `permissions/me.get.ts` degrades.

`POST /api/profile/locale` takes `{ locale: string | null }`.

- Signed out: 401.
- A body that does not match: 400, through `parseBody`.
- A locale that is not in `adminLocales`: 400.
- The function `set_my_locale` does not exist (PostgREST `PGRST202`, Postgres `42883`, or a
  "could not find the function" message): 409, through `createPlutoError` with the key
  `supabase.profile.migrationPending`. The admin shows the translated text.
- Any other error: 500 with the message.
- Success: `{ locale }`.

## The client

The `localeDriver` in `pluto-extension.ts` calls the two routes. A failed `save` throws an
`Error` whose message comes from `usePlutoErrorText()`. The Settings language card shows that
message in a toast. The switch stays on the device, because pluto keeps it in a cookie.

`pluto-locale-sync.client.ts` watches `useSupabaseSession()`. When a session appears, it calls
`usePlutoI18n().syncUserLocale()`. The plugin is client-only. A server `$fetch` does not forward
the user cookies, so a server run would read no locale and clear the cookie.

## A site that did not apply 005

The language card still works. The switch is kept in the cookie. The save returns 409, and the
toast tells the admin to apply the pending migrations. Applying them is done on
`/admin/migrations`.
