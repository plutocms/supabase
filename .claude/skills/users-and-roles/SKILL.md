---
name: users-and-roles
description: The Users and Roles pages of the admin
---

# Users and Roles

This feature adds a **Users** item to the admin menu, with two children: **Users** and **Roles**.
A click on the item opens the users. An admin invites users, changes their roles, revokes access,
and edits the roles. It also adds a guide for the Supabase sign-in emails on the Email tab. It needs
`@plutocms/core` 0.40 or later (`enabled` on a nav child, the `mailPanels` registry bucket,
`usePlutoCapabilities().groups`) and the migration
`008_users_and_roles_admin.sql`. The server side is in the `permissions-storage` skill.

## Files

- `app/plugins/pluto-extension.ts` — registers the `users` nav item (order 950, between Media
  and Settings; `match: ['/admin/roles']`; shown for `users:read`; the Roles child has
  `enabled` for admins only, so a non-admin gets a plain link to the users), the
  `auth-emails` `mailPanel`, and the group label of this layer's capabilities.
- `app/pages/admin/users.vue` — the Users page. Route `/admin/users`, capability `users:read`.
- `app/pages/admin/roles.vue` — the Roles page. Route `/admin/roles`, admin only.
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

## The Users page

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

## The Roles page

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
- The `pluto.*` keys used here must exist in the published `@plutocms/core` of the dev
  dependency. Use `pluto.common.*` for shared words.
- Each page draws the section like core Settings: an `h1` (Users), the section tabs of core
  (`<PlutoAdminNavTabs />`: Users and Roles, from the children of the menu item), then its own
  `h2`, description and action. Without
  access, it shows the no-permission alert of core (`pluto.settings.noPermission.*`) and loads
  nothing: it loads only when `allowed` turns true.
- The UI hides what a user cannot do. The routes check again.
