---
name: admin-translation
description: Admin translation
---

# Admin translation

This feature translates the admin text of this layer. It uses the i18n system of
`@plutocms/pluto` (see the `i18n` skill in `pluto`). The shipped languages are `en` and `pt-BR`.
The English text is the text that the UI showed before. It is the same, byte for byte.

## Files

- `i18n/locales/en.json`, `i18n/locales/pt-BR.json` — all keys, in the `supabase` namespace.
- `app/utils/auth-error.ts` — `resolveAuthErrorText()` and the `AUTH_ERROR_KEYS` map.
- `app/components/SupabaseMessageParts.vue` — a sentence with links in the middle.
- `test/i18n-locale-files.test.ts`, `test/auth-error.test.ts`, `test/guards.test.ts`,
  `test/fixtures/i18n-stub.ts`.

## Key groups

| Group                         | Used by                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `supabase.auth.*`             | The sign-in form, and the signup, forgot, update, and confirm pages. The auth toasts.                            |
| `supabase.auth.errors.*`      | Supabase auth error codes.                                                                                       |
| `supabase.setup.*`            | The setup wizard.                                                                                                |
| `supabase.migrations.*`       | The migrations page and the banner.                                                                              |
| `supabase.connection.*`       | Text that the setup wizard and the migrations page share.                                                        |
| `supabase.envWarning.*`       | `EnvPersistWarning.vue`.                                                                                         |
| `supabase.settings.general.*` | The General settings panel. Its title is a key in `pluto-extension.ts`.                                          |
| `supabase.capabilities.*`     | The capability labels in `pluto-extension.ts`, and `group`, the label of this layer's group in the Roles editor. |
| `supabase.access.*`           | The Users and Roles pages and their modals, the toasts, and the access API errors (`supabase.access.errors.*`).  |
| `supabase.mail.authEmails.*`  | The "Supabase sign-in emails" panel of the Email tab.                                                            |
| `supabase.errors.*`           | Server errors.                                                                                                   |
| `supabase.profile.*`          | The language save error.                                                                                         |

Shared words use `pluto.common.*` (for example `pluto.common.settings`).

## Rules

- The setup wizard and the auth pages have no signed-in user. They use the detected admin
  language (cookie, then browser). Call `usePlutoI18n()` and nothing else.
- The navbar is in core now. Its text is in `pluto.navbar.*`, and this layer has no navbar text.
- A registration holds a key, not text: `title: 'supabase.settings.general.title'`. Pluto
  resolves it with `tx()`.
- A sentence with a link or markup in the middle is one message with `{name}` slots. Render it
  with `SupabaseMessageParts` and one `#name` slot for each part. Do not cut a sentence in pieces.
- A count uses plural forms: `t('supabase.migrations.banner', count)`.
- Read `useAuth()` text with the `t` that it takes at setup. The functions inside it run after an
  `await`, when the Nuxt context is gone.
- A database value stays as stored: role names, layer names, migration file names, setting values.
- A raw database or Postgres error message stays as the server sends it.

## Auth errors

`resolveAuthErrorText(error, { t, te })` returns, in this order:

1. The translated text of a known `error.code` (`AUTH_ERROR_KEYS`).
2. The raw `error.message`.
3. The translated `supabase.auth.errors.unknown`.

A new code needs a line in `AUTH_ERROR_KEYS`, a key in both locale files, and a test case. The
map keeps full key literals, so the usage scan can see them.

## Server errors

A route throws `createPlutoError({ statusCode, message, key, params })`. The `statusMessage` stays
English. The key is `supabase.errors.*`, or `pluto.errors.validationFailed` for `parseBody`. The
UI shows the text with `usePlutoErrorText()`. The signup page does this.

## Tests

`test/i18n-locale-files.test.ts` checks parity between the locales. It also scans `app/`,
`server/`, and `shared/` for literal `supabase.*` and `pluto.*` keys. Each key must exist
(`pluto.*` keys in the `en.json` of `@plutocms/pluto`). Each `en.json` key must be used. A key that
the code builds at run time is invisible to the scan: keep it as a full literal in a map.

In a test, stub `createPlutoError` with `createPlutoErrorStub`. Build a translator with
`createI18nStub()`. It has the real English messages of pluto and of this layer.

## Not translated

- The success body of `server/api/_pluto/supabase/auth/signup.post.ts`, `{ success, message }`. The signup page
  does not read it. A Supabase Auth failure is an HTTP error (key `supabase.errors.signupFailed`, the
  auth code in `data.code`). The page shows the translated text of a known code, as the sign-in page
  does. A route-level zod message (for example the "Username must be at least 3 characters." rule) is
  English, because the UI does not trigger those rules.
- The placeholders `victor@example.com`, `postgresql://`, `••••`, and `• • • • •`.
- Log lines and thrown `Error`s on the server.
