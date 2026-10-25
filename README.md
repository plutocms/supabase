# Supabase Layer for Pluto

This layer integrates Supabase as a backend service for Pluto, providing a robust and scalable solution for managing content and data.

## Installation

> [!NOTE]
> Make sure you have a Supabase project set up. You will need the project ID, URL, and API key. You can find these in your [Supabase dashboard](https://supabase.com/dashboard).

1. Create a `.env` file in the root of your project and add the following environment variables:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-publishable-supabase-key
```

2. Install the layer. It brings `@nuxtjs/supabase`, `@plutocms/pluto` and `@plutocms/utils`, so you do not add them:

```bash
npm i @plutocms/supabase
# or pnpm add @plutocms/supabase, or bun add @plutocms/supabase
```

3. Include the Pluto Supabase layer via `extends` option in your `nuxt.config.ts`. It is the only Pluto layer the app lists:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [['@plutocms/supabase', { install: true }]],
})
```

## Features

### Composables

This layer provides the following composables:

- `useAuth`: Sign in, request a password reset, and update the password, with Supabase.

### Admin shell

Pluto core owns the admin shell: the `/admin` route, the sign-in page, the route guard and the
top navbar. This layer registers an auth driver, and core renders the shell from it. See
`.claude/skills/auth-driver/SKILL.md`.

An app that overrode `NavbarAdmin` or `pages/admin.vue` of an older version must move to registry
entries. See "Migrating an app" in that skill.

### Invite users (access API)

An admin invites a user by email and gives the user one or more roles. The routes are under
`/api/access/**`. Every write needs an admin. This needs the migration
`008_users_and_roles_admin.sql`, which the admin applies from `/admin/migrations`.

Invites need no setup. Check one thing: in the Supabase dashboard (Authentication, then URL
Configuration), the **Site URL** is the URL of your site. Supabase accepts every link back to that
host, so `/admin/accept-invite` needs no entry in the Redirect URLs. Add a Redirect URL only for
another host (for example a preview deploy, or `www.` next to the bare domain).

How the invite email goes out:

- **Without the service role key** (the default): the server sends a passwordless sign-in link
  with the public key. Supabase creates the account and uses its sign-up or magic link email
  template. Public sign-up must be on (the Supabase default). Supabase sends one email per
  address every 60 seconds.
- **With the service role key** (optional): set `NUXT_SUPABASE_SECRET_KEY` (the Supabase secret
  key) in the environment of the **running server**. Never put it in the build environment. The
  server then uses Supabase's invite API and the "Invite user" email template. This also works
  when public sign-up is off.

Optional: a custom invite email template (Authentication, then Email Templates, then Invite
user) makes the link work in every browser, because the page then reads a `token_hash` and not
tokens in the URL hash:

```
{{ .SiteURL }}/admin/accept-invite?token_hash={{ .TokenHash }}&type=invite
```

The built-in Supabase mailer sends very few emails, and only to members of your Supabase
organization. To invite any other address, set up custom SMTP (Project Settings, then
Authentication, then SMTP). A production site needs it anyway, for every auth email. Without it,
an invite to another address answers 400 with the hint `emailNotAuthorized`.

The invited user opens the link, sets a password on `/admin/accept-invite`, and goes to the
admin. An invite to an email that already has an account adds the roles and sends no email.

#### Invites through Pluto mail (optional)

With the service role key **and** a working Pluto mail driver, an invite does not use Supabase's
mailer. The server makes a one-time link with `auth.admin.generateLink`, and Pluto mail sends the
email. This lifts the team-only address rule and the Supabase email rate limit for invites. Set
the mail variables in the environment of the **running server** (Resend is the first driver):

```
NUXT_PLUTO_MAIL_RESEND_API_KEY=re_...
NUXT_PLUTO_MAIL_FROM="Your Site <hello@your-domain.com>"
```

`Settings > Email` in the admin guides the setup (account, key, domain, test email). The
`mail` skill of `@plutocms/pluto` lists every `NUXT_PLUTO_MAIL_*` variable. If the send fails,
the user and the roles stay, and the admin gets the invite link to send by hand.

With the key, an admin can also copy the invite link (Users, then the row menu, or the invite
form). The link works once and expires. Sign-up, password reset and magic link emails still
come from Supabase. The Email tab has a guide to send them through Resend too.

### API Routes

The layer includes API routes for interacting with Supabase services, such as authentication and media management.

- GET `/api/settings`
- POST `/api/settings/update`
- POST `/api/auth/signup`
- GET `/api/users`, GET `/api/users/:id`
- GET `/api/migrations/status`, POST `/api/migrations/run` (admin)
- GET `/api/permissions/me`
- GET and POST `/api/profile/locale`
- GET `/api/settings/first_setup`, POST `/api/setup/create`
- GET `/api/access/users`, GET `/api/access/roles` (permission `users:read`)
- POST `/api/access/users/invite`, POST `/api/access/users/:id/resend` (admin; `locale` is the
  optional language of the email)
- POST `/api/access/users/invite-link` (admin; needs the service role key; returns a one-time link
  and sends no email)
- GET `/api/access/capabilities` (admin; says whether the service key and Pluto mail are set)
- PUT and DELETE `/api/access/users/:id/roles` (admin; DELETE revokes the access)
- POST `/api/access/roles`, PUT and DELETE `/api/access/roles/:key` (admin)

### Types

- `Database`: Auto-imported type definitions for Supabase database interactions.
