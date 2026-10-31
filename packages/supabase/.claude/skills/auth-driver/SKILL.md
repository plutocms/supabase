---
name: auth-driver
description: Auth driver
---

# Auth driver

This layer plugs Supabase sign-in into the admin shell of `@plutocms/core` (0.16 and later). Core
owns the `/admin` parent route, the sign-in page, the route guard and the navbar. This layer
registers an `authDriver` and a few other registry entries. See the `admin-shell` skill in `pluto`.

## Files

- `app/plugins/pluto-extension.ts` — registers `authDriver` (with the setup `guard`), `site` and
  `adminBanners`.
- `app/utils/invite-link.ts` — `parseInviteLink()`, the pure reader of an invite link.
- `app/utils/auth-driver.ts` — the pure parts: `mapSupabaseUser()`, `SUPABASE_PUBLIC_PATHS`,
  `setupStateFromResponse()`, `setupRedirect()`.
- `app/components/auth/AuthSignIn.vue` — the email and password form. It has no frame.
- `app/composables/auth.ts` — `useAuth()`: `login`, `requestPasswordReset`, `updatePassword`.
- `test/auth-driver.test.ts`.

## The driver

| Field         | Value                                                                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user()`      | `mapSupabaseUser(useSupabaseUser())`. The user is the JWT claims, so the id is `sub`. The name is `display_name`, then `full_name`, then `name`, from `user_metadata`. |
| `loggedIn()`  | `Boolean(useSupabaseSession().value)`. The session cookie gives the same answer on the server and in the first client render, so there is no hydration mismatch.       |
| `ready()`     | Resolves at once. The module plugin of `@nuxtjs/supabase` reads the session before this plugin runs.                                                                   |
| `refresh()`   | Reads the session and the claims again.                                                                                                                                |
| `signOut()`   | `supabase.auth.signOut()`, then clears the session and claims state. Core shows the toast and goes to `/admin/login`.                                                  |
| `signIn`      | `AuthSignIn` (registered with `defineAsyncComponent`). It keeps the old keys, the old error text and the `first_setup` write. It opens `redirect`, else `/admin/home`. |
| `guard(to)`   | The setup guard. See "The setup guard".                                                                                                                                |
| `links`       | Sign up (always shown, as the old page did) and forgot password.                                                                                                       |
| `publicPaths` | See below.                                                                                                                                                             |

## Public paths

| Path                     | A signed-in user       | Why                                                          |
| ------------------------ | ---------------------- | ------------------------------------------------------------ |
| `/admin/signup`          | goes to the admin home | The old guard did the same.                                  |
| `/admin/forgot-password` | goes to the admin home | The old guard did the same.                                  |
| `/admin/confirm`         | stays on the page      | A confirm link signs the user in.                            |
| `/admin/update-password` | stays on the page      | A recovery link signs the user in.                           |
| `/admin/accept-invite`   | stays on the page      | An invite link signs the user in. See "Accepting an invite". |
| `/admin/setup`           | stays on the page      | The setup guard decides.                                     |

## Accepting an invite

`app/pages/admin/(auth)/accept-invite.vue` is the page behind the invite email. The browser client
uses PKCE, but the default invite email gives implicit-flow tokens in the URL hash, which the PKCE
client does not read. So the page reads the link itself, with the pure helper
`parseInviteLink(query, hash)` in `app/utils/invite-link.ts`:

| Link                                                                                                               | What the page does                             |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `?token_hash=...&type=invite` (the recommended email template, or an invite link from Pluto mail)                  | `verifyOtp({ type: 'invite', token_hash })`    |
| `?token_hash=...&type=magiclink` (a copied link for an account that exists; `signup` also works)                   | `verifyOtp({ type: 'magiclink', token_hash })` |
| `#access_token=...&refresh_token=...` (the default invite email, or the sign-in link sent without the service key) | `setSession({ access_token, refresh_token })`  |
| `#error_code=otp_expired` (or any `error_code`)                                                                    | "Link expired, ask for a new invite"           |
| no token, but a session                                                                                            | goes on to the password form                   |
| nothing                                                                                                            | "Invalid link"                                 |

The page clears the URL with `history.replaceState`, then shows a password and confirm form. It
calls `updateUser({ password })` through `useAuth().updatePassword`, then the driver `refresh()`,
then goes to `/admin/home`. The invite API is in the `permissions-storage` skill. The Users and Roles
pages are in the `users-and-roles` skill.

## Site info

`site.name()` is the `website_title` setting. `site.url()` is the `website_url` setting. In
development, `url()` is empty, so "View site" opens `/`, which is the dev server. The settings load
in the browser after sign-in, and again after the Settings page saves.

## Banner

`MigrationsBanner` is in `adminBanners`. Core's admin layout renders it. It hides on
`/admin/migrations`. See the `layer-migrations` skill.

## The setup guard

The driver `guard(to)` is the setup guard. Core runs it on `/admin/**`, after `ready()` and before
the sign-in rule, so a new install goes to `/admin/setup` and not to the sign-in page. It reads
`/api/_pluto/supabase/setup` and calls `setupRedirect(path, state)`:

- Setup not done, or the state cannot be read: every admin path but `/admin/setup` goes to
  `/admin/setup`.
- Setup done: `/admin/setup` goes to `/admin/login`. Keep this block. The setup page asks an
  anonymous visitor for a database connection string, and it is safe only because it is
  unreachable after the setup. See the comment on `setupRedirect()`.

A done setup is cached in the state `supabase-setup-done`, so the guard does not fetch on every
navigation. A result that is not "done" is read again each time. On a cold load of an `/admin`
path, the plugin starts the first request at setup, in the browser. The guard awaits that same
promise once, so a cold load makes one request. The guard never rejects. Core
ignores a returned path that equals the current path.

## Permissions and language

This layer has no sync plugin. Core's `pluto-auth-sync.client.ts` watches `loggedIn`. It loads the
capabilities and the stored language after sign-in, and clears the capabilities after sign-out.
The `permissionsDriver` and `localeDriver` stay in `pluto-extension.ts`.

## The other auth pages

The sign-up, forgot-password, update-password and confirm pages use core's `PlutoAdminAuthCard`
with its default slot and the `title` and `description` props. They keep the `auth` layout, so
every auth page has the same frame as the sign-in page.

## Migrating an app

Before 0.11, this layer had its own navbar, its own `pages/admin.vue`, its own login page and its
own `auth` middleware. They are gone.

- An app that overrode `NavbarAdmin` or `NavbarAdminProvider`: delete the override. Add a link
  action to `navbarActions`, an item to `accountMenu`, or a banner to `adminBanners`.
- An app that overrode `pages/admin.vue`: delete the override. Core's parent route sets the admin
  layout. Move extra work to a banner or a plugin.
- An app that overrode `pages/admin/(auth)/login.vue`: delete it. Register another `signIn`
  component in an `authDriver`, or accept the core page.
- An app that used the `auth` route middleware by name: remove the name. Core's global guard runs
  on every `/admin/**` path.
- `useAuth()` no longer returns `isLoggedIn`, `user`, `logout` or `allowedUnauthenticatedPaths`.
  Use `usePlutoAuth()` from core.
- The `supabase.navbar.*` keys are removed. Core has `pluto.navbar.*`.
- The layer needs `@plutocms/core` 0.16 or later.

## Lost on purpose

The old `admin.vue` showed a "not logged in" toast when the browser tab became visible with no
session. Core's guard runs on navigation only, so this toast is gone.
