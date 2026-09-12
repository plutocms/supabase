# Permissions storage

This feature adds a role-based capability system. A role holds a set of capabilities. A user
holds a set of roles. Any server route, or RLS policy, can ask one question: "does the calling
user hold this capability?" It adds:

- `db/migrations/004_roles_and_capabilities.sql` — the three new tables, the seed data for the
  built-in `admin` role, `public.has_capability()`, `public.my_capabilities()`, the
  `public.is_admin()` rewrite, and the `handle_new_user()` update.
- `server/utils/capability-guard.ts` — `requireCapability(event, capability, options?)`, gates a
  server route on a named capability.
- `server/utils/admin-guard.ts` — `requireAdmin(event)`, now a thin alias over
  `requireCapability` for the wildcard capability. Same name, same 401/403 behavior as before.
- `server/api/permissions/me.get.ts` — the calling user's own capability list. Backs the client
  `usePlutoPermissions()` composable's `load()`.
- `app/plugins/pluto-extension.ts` — registers this layer's own capabilities
  (`settings:manage`, `users:read`, `system:migrate`) and its `permissionsDriver`.

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

There is no admin UI for roles in this feature, the same way `pluto_migrations` and `profiles`
need no UI. An operator grants a role with a SQL snippet, run directly against the database:

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
than one named capability. It is `requireCapability(event, '*')` under the hood.

## Client-side: `usePlutoPermissions()`

`usePlutoPermissions()` (from `@plutocms/pluto`) reads whichever layer registered a
`permissionsDriver` — this layer registers one, backed by `/api/permissions/me`. `can(capability)`
tells a component whether to show or hide UI. This is never a security boundary by itself: the
real enforcement is always the server-side `requireCapability` call, backed by RLS. Hiding a
button does not stop a direct API call; only the guard does.

`app/pages/admin.vue` calls `load()` when the user logs in, and `clear()` when they log out,
watching `isLoggedIn` the same way it already watches `visibility` for other purposes.

## Known follow-up, not built in this feature

- **Per-row ownership.** There is no way to grant "edit only your own posts" as a capability. A
  capability is all-or-nothing for every row a table holds.
- **A roles admin UI.** Granting a role is a SQL snippet, run by an operator, not a page in the
  admin UI.
- **A single source of truth for "is this user an admin".** `profiles.is_admin` and the
  `user_roles` `admin` grant can, in principle, drift apart (for example, a role revoked by hand
  without also flipping the column). Folding these into one source of truth is later cleanup.
