# Supabase Layer for Pluto CMS

This layer integrates Supabase as a backend service for Pluto CMS, providing a robust and scalable solution for managing content and data.

## Installation

To install the Supabase layer, include it via `extends` option in your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  extends: ['github:plutocms/supabase'],
})
```

Create a `.env` file in the root of your project and add the following environment variables:

```env
SUPABASE_PROJECT_ID=your-project-id
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
```

Then, initialize the Supabase client in your application to generate the necessary database schema:

```bash
npx supabase init
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

- `SupabaseDatabase`: Type definitions for Supabase database interactions.
- `User`: Type definition for user objects.
