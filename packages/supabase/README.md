# Supabase Layer for Pluto

This layer makes Supabase the backend of Pluto: the database, the sign-in, the users, and the roles.

**Docs:** [Supabase](https://pluto.vulmix.dev/docs/supabase)

## Installation

> [!NOTE]
> Make sure you have a Supabase project set up. You need the URL and the publishable key of the project. You can find these in your [Supabase dashboard](https://supabase.com/dashboard).

1. Create a `.env` file in the root of your project and add the following environment variables:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-publishable-supabase-key
```

2. Install the layer. It brings `@nuxtjs/supabase` and `@plutocms/core`, so you do not add them:

```bash
npm i @plutocms/supabase
# or pnpm add @plutocms/supabase, or bun add @plutocms/supabase
```

3. Include the Pluto Supabase layer via `extends` option in your `nuxt.config.ts`. It is the only Pluto layer the app lists:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@plutocms/supabase'],
})
```

## What it adds

- **Content in Postgres:** a content adapter for the content types of every layer, with history, trash, scheduled publish, and a server copy of unsaved changes. See [Content adapter](https://pluto.vulmix.dev/docs/supabase/content-adapter).
- **Sign-in:** email and password with Supabase Auth, and the auth driver of the admin. See [Auth](https://pluto.vulmix.dev/docs/supabase/auth).
- **Users and roles:** invite users by email, and give roles that hold capabilities. See [Users and roles](https://pluto.vulmix.dev/docs/supabase/users-and-roles) and [Invites and email](https://pluto.vulmix.dev/docs/supabase/invites-and-email).
- **Media:** the media library of core stores its files in Supabase Storage.
- **Migrations:** each layer ships its database changes. An admin applies them from `/admin/migrations`. See [Migrations](https://pluto.vulmix.dev/docs/supabase/migrations).

The public site reads the content through the [public API](https://pluto.vulmix.dev/docs/build/public-api) of core. The routes under `/api/_pluto/supabase/` serve the admin. They are not a public API.

## Development

This package lives in the [`plutocms/supabase`](https://github.com/plutocms/supabase) monorepo, in `packages/supabase`. Run `bun install` at the root of the repo, then the scripts of the package (`bun run --cwd packages/supabase dev`). This package is the base of the other two. Its changes reach `supabase-shop` and `supabase-blog` through the workspace link. Each package reads its own `.env` file.
