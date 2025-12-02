# Supabase Layer for Pluto CMS

This layer integrates Supabase as a backend service for Pluto CMS, providing a robust and scalable solution for managing content and data.

## Installation

> [!NOTE]
> Make sure you have a Supabase project set up. You will need the project ID, URL, and API key. You can find these in your [Supabase dashboard](https://supabase.com/dashboard).

Create a `.env` file in the root of your project and add the following environment variables:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
```

Install the Supabase layer and include it via `extends` option in your `nuxt.config.ts`, it should come after the `@plutocms/pluto` layer:

```bash
# npm
npm install @plutocms/supabase

# yarn
yarn add @plutocms/supabase

# pnpm
pnpm add @plutocms/supabase

# bun
bun add @plutocms/supabase
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@plutocms/pluto',

    // Make sure to add the Supabase layer after the Pluto layer
    '@plutocms/supabase',
  ],
})
```

## Features

### Composables

This layer provides the following composables:

- `useAuth`: Manage user authentication with Supabase.
- `useMedia`: Handle media uploads and retrievals using Supabase Storage.

### API Routes

The layer includes API routes for interacting with Supabase services, such as authentication and media management.

- GET `/api/category/list`
- POST `/api/category/new`
- GET `/api/media/list`
- POST `/api/media/new`
- GET `/api/settings`
- POST `/api/settings/update`
- POST `/api/signup`

### Types

- `Database`: Auto-imported type definitions for Supabase database interactions.
