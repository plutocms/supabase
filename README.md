# Supabase Layer for Pluto CMS

This layer integrates Supabase as a backend service for Pluto CMS, providing a robust and scalable solution for managing content and data.

## Installation

> [!NOTE]
> Make sure you have a Supabase project set up. You will need the project ID, URL, and API key. You can find these in your [Supabase dashboard](https://supabase.com/dashboard).

1. Create a `.env` file in the root of your project and add the following environment variables:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-publishable-supabase-key
```

2. Add the `@nuxtjs/supabase` and `supabase` dependencies to your project:

```bash
## NPM
npm i @nuxtjs/supabase supabase

## Yarn
yarn add @nuxtjs/supabase supabase

## PNPM
pnpm add @nuxtjs/supabase supabase

## Bun
bun add @nuxtjs/supabase supabase
```

3. Include the Pluto Supabase layer via `extends` option in your `nuxt.config.ts`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [['github:plutocms/supabase', { install: true }]],
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

### API Routes

The layer includes API routes for interacting with Supabase services, such as authentication and media management.

- GET `/api/settings`
- POST `/api/settings/update`
- POST `/api/auth/signup`

### Types

- `Database`: Auto-imported type definitions for Supabase database interactions.
