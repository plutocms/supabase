---
name: users-and-roles
description: Users and Roles settings pages
---

# Users and Roles

This feature adds two tabs to Settings: **Users** and **Roles**. An admin invites users, changes
their roles, revokes access, and edits the roles. It also adds a guide for the Supabase sign-in
emails on the Email tab. It needs `@plutocms/pluto` 0.18 or later (the `settingsPages` and
`mailPanels` registry buckets, `usePlutoCapabilities().groups`) and the migration
`008_users_and_roles_admin.sql`. The server side is in the `permissions-storage` skill.

## Files

- `app/plugins/pluto-extension.ts` — registers the `users` and `roles` `settingsPages`, the
  `auth-emails` `mailPanel`, and the group label of this layer's capabilities.
- `app/pages/admin/settings/users.vue` — the Users tab. Route `/admin/settings/users`, order 10,
  capability `users:read`.
- `app/pages/admin/settings/roles.vue` — the Roles tab. Route `/admin/settings/roles`, order 20,
  capability `'*'` (admin only).
- `app/components/access/` — `InviteModal`, `EditRolesSlideover`, `RevokeModal`, `LinkModal`,
  `LinkField`, `CopyButton`, `RoleSlideover`, `DeleteRoleModal`.
- `app/components/mail/AuthEmailsPanel.vue` — the Supabase sign-in emails guide.
- `app/utils/access-ui.ts` — pure helpers: `slugifyRoleKey`, `isValidRoleKey`, `userStatus`,
  `isAdminUser`, `userDisplayName`, `roleLabelOf`, `sameKeys`, `errorKeyOf`, `isInviteMailError`,
  `languageName`, `ADMIN_ROLE_KEY`.
- `app/utils/supabase-project.ts` — `supabaseProjectRef`, `supabaseDashboardLinks`, `RESEND_SMTP`.
- `shared/types/access.d.ts` — `AccessUser`, `AccessRole`, `AccessCapabilities`,
  `AccessInviteResult`.
- Tests: `test/access-ui.test.ts`, `test/access-routes.test.ts`, `test/invite-link.test.ts`.

## The Users tab

- Data: `GET /api/_pluto/supabase/access/users` and `GET /api/_pluto/supabase/access/roles`. Both need `users:read`. The page shows
  `USkeleton` rows while it loads, a `UAlert` with "Try again" on an error, and a `UEmpty` with an
  invite button when the list is empty.
- Columns: name and email (a "You" badge on your own row), role badges (an admin shows
  "Administrator"), status (Active, or Invited with the date), last sign-in.
- Only an admin sees "Invite user" and the row menu (`usePlutoPermissions().isAdmin`). The server
  checks again with `requireAdminRole`.
- The row menu: **Edit roles**, **Resend invite** and **Copy invite link** (pending users only; the
  copy needs the service key), **Revoke access**.
- On load, an admin reads `GET /api/_pluto/supabase/access/capabilities` to know if the service key is set.
- Every modal and slideover loads on demand (`defineAsyncComponent` in the page). The invite form
  and the slideovers mount on their first open. Revoke and Link open with `useOverlay`.

### Invite

`InviteModal` has email, optional name, roles (`UCheckboxGroup`) and the email language (default:
the admin's language). It posts to `/api/_pluto/supabase/access/users/invite` with `locale`.

- `granted`: the account existed. The roles are added. A toast says so.
- `emailSent: false` with a `link`: the user exists but the Pluto mail send failed. The modal shows
  the link in a copy field.
- An error with `emailNotAuthorized`, `emailRateLimited` or `emailInvalid` (the keys are in
  `INVITE_MAIL_ERROR_KEYS`): an inline `UAlert` shows the cause, with **Copy invite link** (only when
  the server has the service key) and **Set up email** (`/admin/settings/email?reason=invite`).
  Without the key, a hint says to set `NUXT_SUPABASE_SECRET_KEY`.
- Other errors show a toast with the translated text (`usePlutoErrorText`).

### Edit roles and revoke

- Edit roles replaces the roles (`PUT /api/_pluto/supabase/access/users/:id/roles`). It needs at least one role.
  If you remove your own `admin` role, a warning shows. After a change to your own roles, the page
  calls `usePlutoPermissions().load()`, so the menu and tabs follow.
- Revoke removes all roles (`DELETE /api/_pluto/supabase/access/users/:id/roles`). The account stays. The text says
  so. The last admin cannot be revoked: the server answers 409 `lastAdmin`.

## The Roles tab

A `UTable` with the role (label, key in mono, a "Built-in" badge), the number of permissions (or
"Full access" for `*`), the number of users, and a row menu. `RoleSlideover` creates and edits a
role: name, key (create only, made from the name until you edit it, `^[a-z0-9_]+$`), description,
and the permissions as one `UCheckboxGroup` for each group of
`usePlutoCapabilities().groupsFor(role.capabilities)`, with an "Other" group for a string that no
layer declares. At least one permission is needed. The `admin` role opens read-only with the text
"Full access". `DeleteRoleModal` says how many users lose the role. A built-in role has no delete
action.

## Supabase sign-in emails (the mail panel)

`AuthEmailsPanel` is a lazy `mailPanels` entry. It shows in the Email tab (admin only). It says
that Supabase sends the sign-up, password reset and magic link emails, only to your Supabase team
and only a few each hour without custom SMTP. It has a link to the Resend integration for
Supabase, the manual SMTP values with copy buttons (`smtp.resend.com`, port `465`, user `resend`,
the Resend API key as the password), best-effort links to the Supabase dashboard (the project ref
comes from the Supabase URL; with no ref the panel says so), and a hint to raise the email rate
limit after custom SMTP is set. The panel never shows or stores a key.

## Rules

- Keep every key a full literal (`t('supabase.access.users.title')`). The locale test scans the
  code for them and fails on a key that no code uses.
- The `pluto.*` keys used here must exist in the published `@plutocms/pluto` of the dev
  dependency. Use `pluto.common.*` for shared words.
- A page file must exist for each `settingsPages` entry. Core renders the tabs and the no-permission
  alert. The page does not repeat the title.
- The UI hides what a user cannot do. The routes check again.
