# Permissions storage

This feature adds a role-based capability system. A role holds a set of capabilities. A user
holds a set of roles. Any server route, or RLS policy, can ask one question: "does the calling
user hold this capability?" It adds:

- `db/migrations/004_roles_and_capabilities.sql` — the three new tables, the seed data for the
  built-in `admin` role, `public.has_capability()`, `public.my_capabilities()`, the
  `public.is_admin()` rewrite, and the `handle_new_user()` update.
- `server/utils/capability-guard.ts` — `requireCapability(event, capability, options?)`, gates a
  server route on a named capability.
- `server/utils/admin-guard.ts` — `requireAdmin(event)`. It reads the column `profiles.is_admin`
  directly. It does not call `public.is_admin()` and it does not use `requireCapability`. See "Why
  migrations stay admin-only" below for why.
- `server/api/permissions/me.get.ts` — the calling user's own capability list. Backs the client
  `usePlutoPermissions()` composable's `load()`. Returns an empty list, not a 500, when
  `public.my_capabilities()` does not exist yet (a site that has not applied this migration yet)
  — see "Why migrations stay admin-only" below.
- `app/plugins/pluto-extension.ts` — registers this layer's own capabilities
  (`settings:manage`, `users:read`) and its `permissionsDriver`.

## Why migrations stay admin-only

`server/api/migrations/status.get.ts` and `run.post.ts` call `requireAdmin(event)`, never a named
capability. This is deliberate, not an oversight.

`public.has_capability()` and `public.my_capabilities()` are defined by
`004_roles_and_capabilities.sql`. A site that has upgraded this package's version but has not yet
applied that migration has neither function in its database. If the migrations routes — the only
routes that can apply a pending migration — required a named capability
(`requireCapability(event, 'system:migrate')`, an approach this project tried and reverted), the
call to `has_capability()` would fail because the function does not exist, 403ing the admin out of
the one page that would let them fix it. No route in this system may ever depend on a migration
that route exists to apply.

`requireAdmin` avoids this because it reads the column `profiles.is_admin` directly. It does not
call `public.is_admin()` and it does not call `has_capability()`. The column is part of the
baseline schema, so the check needs no migration at all. It does NOT see the `admin` role: a user
who has the role only (and `profiles.is_admin = false`) fails `requireAdmin`. Migration 008 closes
this gap: `set_user_roles` and `add_user_roles` keep the column in step with the `admin` role (see
"The admin column sync"). A role granted by hand with SQL does not sync the column. In that case,
set `profiles.is_admin = true` too.

There is no `system:migrate` capability. Do not add one and re-gate the migrations routes on it —
this is the exact mistake this section documents undoing.

## The three tables

```
public.roles              -- key, label, description, is_builtin
public.role_capabilities  -- role_key, capability
public.user_roles         -- user_id, role_key
```

A capability key looks like `posts:publish` or `settings:manage`: a namespace, a colon, an
action. The literal `*` means every capability.

Both the role key and the capability string are free text, checked only by a format
constraint (`roles_key_format`, `role_capabilities_format`), never an `enum`. This is the same
reasoning `003_settings_generic_keys.sql` already used for `settings.setting_key`: an enum lives
in one shared migration file. A layer other than core (`supabase-blog`, `supabase-shop`, and so
on) could never add its own role or capability without altering that shared file. Free text lets
any layer add capabilities in its own migration file, with no cross-layer coordination.

Note: `settings.setting_key` uses dots (`blog.posts_per_page`). A capability key uses a colon
(`posts:publish`). These are two different, unrelated string formats. Do not mix them.

## `is_admin()` and `has_capability()`

`public.is_admin()` already existed before this feature, and keeps its exact name and signature
forever. Thirty RLS policies across four repos call it by name. Renaming or removing it would
break RLS on already-deployed sites this migration cannot reach.

Instead, `is_admin()` was reimplemented (`create or replace`, same signature) to also return
`true` for a user holding the built-in `admin` role, not only for a user whose
`profiles.is_admin` column is `true`. This means every existing admin passes every new
capability check with zero data migration: `004_roles_and_capabilities.sql` also grants the
`admin` role, once, to every profile row where `is_admin = true`.

`profiles.is_admin` (the column) stays. It is not dropped, and new code must keep writing it
(`handle_new_user()` still sets it). Having two sources of truth for "is this user an admin" —
the column, and the role grant — is an accepted, bounded cost for this feature. Folding these
into one source of truth is later cleanup, not part of this feature.

`public.has_capability(cap)` is the new, general check: `is_admin()`, or a role grant naming
`cap` or `*`. Prefer `has_capability()` over `is_admin()` in new code, unless the check really is
"admin, full stop" — `requireAdmin()` still exists for that case.

## The `admin` role's wildcard

The built-in `admin` role holds one row in `role_capabilities`: `('admin', '*')`.
`has_capability()` and `my_capabilities()` both treat `*` as "matches every capability". This is
the only wildcard or hierarchy in this feature. There is no capability tree, no "grants
implies" relationship between capabilities, and no per-row ownership (an "edit only your own
posts" capability). Per-row ownership is named here as follow-up work, not built in this
feature.

## Granting a role by hand

The access API (see "The access API" below) is the normal way to grant a role. An operator can
also grant a role with a SQL snippet, run directly against the database. A manual grant of the
`admin` role must also set `profiles.is_admin = true`:

```sql
insert into public.roles (key, label) values ('editor', 'Editor')
on conflict (key) do nothing;

insert into public.role_capabilities (role_key, capability) values
  ('editor', 'posts:publish'), ('editor', 'posts:read_drafts')
on conflict do nothing;

insert into public.user_roles (user_id, role_key)
select id, 'editor' from public.profiles where email = 'someone@example.com'
on conflict do nothing;
```

`editor` and `posts:publish`/`posts:read_drafts` above are only an example. No layer defines
those capabilities as of this feature — a blog layer defining its own `posts:*` capabilities is
`supabase-blog`'s own future work, not part of this repo.

## Guarding a server route

```ts
import { requireCapability } from '../../utils/capability-guard'

export default defineEventHandler(async (event) => {
  await requireCapability(event, 'settings:manage')
  // ...
})
```

`requireCapability` throws a 401 if the caller is not logged in, or a 403 if the caller is
logged in but lacks the capability. The check itself runs in the database, through
`public.has_capability()`, a `SECURITY DEFINER` function reading `auth.uid()` from the caller's
own session — the server never passes a user id into it.

`requireAdmin(event)` still works, unchanged, for a route that needs "admin, full stop" rather
than one named capability. It does NOT call `requireCapability`: it reads `profiles.is_admin`
directly. For an access route, use `requireAdminRole(event)`: it calls the rpc `is_admin()`, so it
also accepts an admin who has the role only. See "Why migrations stay admin-only" above.

## Client-side: `usePlutoPermissions()`

`usePlutoPermissions()` (from `@plutocms/pluto`) reads whichever layer registered a
`permissionsDriver` — this layer registers one, backed by `/api/permissions/me`. `can(capability)`
tells a component whether to show or hide UI. This is never a security boundary by itself: the
real enforcement is always the server-side `requireCapability` call, backed by RLS. Hiding a
button does not stop a direct API call; only the guard does.

Core's `pluto-auth-sync.client.ts` calls `load()` when the user logs in, and `clear()` when they
log out. It watches `loggedIn` of the auth driver, on every page. This layer has no sync plugin.
See the [auth-driver](../auth-driver/SKILL.md) skill.

## Why `profiles` has no UPDATE policy

`public.profiles` has a select policy and no UPDATE policy, on purpose. A user who could update
their own row could also set `is_admin` to `true`. When a user must change one column of their
own row, add a `security definer` function that writes only that column for `auth.uid()`. Do
not add an UPDATE policy.

`005_profile_locale.sql` follows this rule. It adds the column `profiles.locale` and the
function `public.set_my_locale(new_locale text)`. The function has an empty `search_path`.
`execute` is revoked from `public` and `anon` and granted to `authenticated`. A user reads
their own `locale` through the existing select policy. See the `profile-language` skill.

## Data API grants and restricted reads

`006_data_api_grants.sql` grants `execute` on `is_admin()`, `has_capability(text)` and
`my_capabilities()` to `authenticated` and `service_role`, and on `set_my_locale(text)` to
`authenticated`. It does not revoke the default `public` execute, because policies that apply to
`anon` still call these functions. `007_restrict_staff_reads.sql` closes the open-sign-up read
hole: `settings` is readable by staff (a user with at least one capability, through
`my_capabilities()`), and `pluto_migrations`, `roles` and `role_capabilities` are readable by
`is_admin()` only. A plain signed-up user reads none of them. `dashboard_user` keeps its read
access on `settings` and `pluto_migrations`. See the `layer-migrations` skill.

## Known follow-up, not built in this feature

- **Per-row ownership.** There is no way to grant "edit only your own posts" as a capability. A
  capability is all-or-nothing for every row a table holds.
- **The Users and Roles pages.** The access API exists. The settings pages that call it come later.
- **A single source of truth for "is this user an admin".** `profiles.is_admin` and the
  `user_roles` `admin` grant can drift apart when someone writes `user_roles` by hand. The 008
  functions keep them in step. Folding these into one source of truth is later cleanup.

## The access API (migration 008)

`008_users_and_roles_admin.sql` adds eight `security definer` functions with an empty
`search_path`. The routes under `server/api/access/**` call them with the session of the caller,
so `auth.uid()` is the caller. Rules for v1:

- **Admins only.** Every write (invite, set roles, revoke, create, edit and delete a role) needs
  `public.is_admin()`. There is no `users:manage` capability and no coverage rule.
  `users:read` may list staff (`list_staff_users`) and roles (`list_roles`). The Users list shows
  staff only: a user with a role, or with `profiles.is_admin`.
- **Errors.** A rule error is `P0001` with the message `pluto:<code>`. A missing right is `42501`
  with `pluto:forbidden`. `server/utils/access-errors.ts` (`mapAccessError`) maps them: `last_admin`
  and `role_exists` to 409, `forbidden` to 403, `builtin_role`, `wildcard`, `empty_role`,
  `unknown_role` and the format codes to 400, the `*_not_found` codes to 404. Each has a key
  `supabase.access.errors.*`.
- **Roles.** A new role has no `*` and at least one capability. `admin` cannot be edited or
  deleted. A built-in role cannot be deleted. The policies of `roles` and `role_capabilities` say
  the same for a direct Data API write.
- **Guard.** `requireAdminRole` (`server/utils/admin-role-guard.ts`) calls the rpc `is_admin()`
  with the user client. Use it for the access routes. Keep `requireAdmin` for the migrations
  routes.

### The admin column sync

`set_user_roles(target, role_keys)` replaces the roles of a user (an empty array is a revoke). It
sets `profiles.is_admin = ('admin' = any(role_keys))` in the same transaction. `add_user_roles`
sets the column to true when it adds `admin`. So a revoke now removes the first admin too (before,
the column stayed true), and a user who got `admin` through the API passes `requireAdmin`.

The last-admin rule: if the target is an admin (role or column), the new set has no `admin`, and no
other admin exists (role or column), the function raises `pluto:last_admin`. Every role writer
takes `pg_advisory_xact_lock(hashtext('pluto.user_roles'))`, so two admins cannot remove each
other at the same time.

### Routes

| Route | Guard |
|---|---|
| `GET /api/access/users`, `GET /api/access/roles` | `users:read` |
| `POST /api/access/users/invite` | admin, rate limit (10 per 10 minutes per caller) |
| `POST /api/access/users/invite-link` | admin, same rate limit; needs the service role key (503 `serviceKeyRequired`) |
| `GET /api/access/capabilities` | admin; `{ serviceKey, mail: { configured } }` |
| `POST /api/access/users/[id]/resend` | admin, rate limit; only while `email_confirmed_at` is empty |
| `PUT` and `DELETE /api/access/users/[id]/roles` | admin (DELETE sets an empty list) |
| `POST /api/access/roles`, `PUT` and `DELETE /api/access/roles/[key]` | admin |

The invite route first looks the email up (`find_user_id_by_email`). An email that has an
account (confirmed or not) gets the roles added, with no email (`{ status: 'granted' }`), and the
account is never deleted. For a new email:

- With the service role key and Pluto mail configured (`getPlutoMailStatus().configured`): see
  "Invites through Pluto mail" below.
- With the service role key and no Pluto mail (`optionalServiceClient`, `NUXT_SUPABASE_SECRET_KEY`
  at run time): `auth.admin.inviteUserByEmail`, then `set_user_roles`. If the roles fail, it deletes the new
  user. An `email_exists` race adds the roles instead.
- Without the key: `sendSignInLink` (`server/utils/sign-in-link.ts`) sends `signInWithOtp` with
  the anon key, a new client with no session storage and the implicit flow, so the admin's own
  session is not touched and the link brings the tokens in the hash. GoTrue creates the account
  (public sign-up must be on: else 503 `signupDisabled`). Then it finds the id and adds the roles.
  If the roles fail, the account stays with no role, the same as a sign-up.

The resend route works the same way: with the key and no Pluto mail, `getUserById` and `inviteUserByEmail`;
without it, the user's email from `list_staff_users` and a sign-in link with
`shouldCreateUser: false`. Supabase sends one email per address every 60 seconds (429).
Supabase accepts every redirect to the host of the project's Site URL, so `/admin/accept-invite`
needs no Redirect URLs entry. The rate limiter (`server/utils/rate-limit.ts`) lives in the memory of one server
process. The invite email goes to `/admin/accept-invite`. See the `auth-driver` skill.

### Invites through Pluto mail

`server/utils/access-mail.ts` holds the shared parts. With the service role key, `provisionAccess`
does the role work without sending an email:

- An email that has an account: `add_user_roles`, then a `magiclink` link
  (`auth.admin.generateLink`). The account is never deleted.
- A new email: an `invite` link (`generateLink` creates the user), then `set_user_roles`. If the
  roles fail, `deleteUser`. An `email_exists` race adds the roles instead.

The link is `<origin>/admin/accept-invite?token_hash=<hashed_token>&type=<type>`. The type is the
`verification_type` that GoTrue reports (`invite`, `magiclink` or `signup`), else the asked
type. `parseInviteLink` accepts these three types, and the accept page calls `verifyOtp` with the
type of the link.

- `POST invite-link` returns `{ status, link }` and sends nothing. The Users page shows the link in
  a copy field. It expires and works once.
- `POST invite` with the key AND `getPlutoMailStatus().configured`: `provisionAccess` (no link for
  an existing account: the roles are added and the answer is `granted`), then `sendPlutoMail` with
  `renderPlutoEmail('invite', { url, inviterName, roles }, { locale, siteName })`. The idempotency
  key is `invite/<userId>/<uuid>`. The site name is the `website_title` setting, else
  `runtimeConfig.public.websiteName`. The roles are the labels. The answer is
  `{ status: 'invited', emailSent: true }`. If the send fails, the user and the roles stay, and the
  answer is `{ status: 'invited', emailSent: false, link }`. The log has the mail error code only.
- `POST [id]/resend` does the same for a pending user (a fresh `invite` link, no role change).
- The optional body field `locale` (invite and resend) must be one of the admin locales
  (`public.plutoI18n.adminLocales`), else 400 `supabase.errors.localeUnsupported`.
- Without the key, or with the key and no Pluto mail, the paths above stay as they were.

## Translation

`requireAdmin` and `requireCapability` throw `createPlutoError` with the keys
`supabase.errors.notLoggedIn`, `notAdmin`, and `missingPermission` (it has the `{capability}`
parameter). The `statusMessage` stays English. `requireCapability` takes an optional `messageKey`
next to `message`. A custom `message` with no `messageKey` keeps a plain English error. The
capability labels in `pluto-extension.ts` are keys (`supabase.capabilities.*`). Role names from the
database stay as stored. See the `admin-translation` skill.
