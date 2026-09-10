# Layer migrations

This feature lets an admin apply pending layer database migrations from the admin UI,
after initial setup. It adds:

- `server/utils/admin-guard.ts` — `requireAdmin(event)`, gates a server route on
  `public.profiles.is_admin`.
- `server/utils/pending-migrations.ts` — `getMigrationStatus(event)`, computes discovered,
  applied, and pending layer names.
- `server/utils/env-file.ts` — `persistDatabaseUrl(connectionString)`, writes `DATABASE_URL`
  to `.env`.
- `server/utils/scrub-connection-string.ts` — `scrubConnectionString(message, connStr)`,
  removes a connection string and its password from an error message.
- `server/api/migrations/status.get.ts` — reports pending and applied layers.
- `server/api/migrations/run.post.ts` — applies pending layers.
- `app/composables/migrations.ts` — `useMigrations()`, the client-side entry point.
- `app/pages/admin/migrations.vue` — the admin page.
- `app/components/migrations/MigrationsBanner.vue` — the admin-shell banner, mounted from
  `app/pages/admin.vue`.
- `app/components/EnvPersistWarning.vue` — shown on `/admin/migrations` and on the setup wizard
  (`app/pages/admin/setup.vue`) when `persisted` comes back `false`. See "`.env` persistence
  caveat" below for what it shows and why that's still safe.

## Connection string precedence

`server/api/migrations/run.post.ts` resolves the connection string in this order, and no
other order:

1. `process.env.DATABASE_URL`, if set. A body-supplied string is ignored completely in this
   case.
2. Otherwise, the body-supplied `connectionString`.
3. Otherwise, the endpoint returns `{ success: false, needsConnectionString: true }`. It does
   not throw.

Rule 1 is the whole security model for this endpoint. Without it, any admin could point the
server at an arbitrary database host by passing a `connectionString` in the request body, even
after the server already has its own `DATABASE_URL`. Do not change this precedence.

## Why `pluto_migrations` reads need auth

The `pluto_migrations` table's RLS policy allows `select` only for the `authenticated` role
(see `public/schema.sql`). An anonymous caller does not get an error — the query just returns
zero rows. A route that reads this table without an admin gate would treat every discovered
layer as pending, and would leak the list of installed layer names to an anonymous visitor.
This is why `getMigrationStatus` must only ever be called from a route already gated by
`requireAdmin`.

## No-transaction limitation

`runLayerMigration` (in `server/utils/migrations.ts`) runs a layer's schema SQL one statement
at a time, with no surrounding transaction. If a statement partway through a layer's schema
fails, the earlier statements in that layer stay applied, and no row is written to
`pluto_migrations` for that layer. A retry re-runs the whole schema, including the
already-applied statements — schema SQL should use `if not exists` / `on conflict` guards to
tolerate this, the same way `public/schema.sql` already does. This is pre-existing behavior,
not something this feature changed.

## `.env` persistence caveat

`persistDatabaseUrl` writes to `resolve(process.cwd(), '.env')`. `process.cwd()` may not be
the project root in every deployment — a production build can start from a different working
directory. When the write fails, or targets the wrong file, migrations still succeed and stay
durably recorded in `pluto_migrations` (a database row, not a file). The response reports
`persisted: false`, instead of failing the request.

Both `app/pages/admin/migrations.vue` and `app/pages/admin/setup.vue` show
`EnvPersistWarning.vue` when this happens. It gives the admin a step-by-step manual fix and the
exact `DATABASE_URL="..."` line to paste, with a copy button.

This is the one place this feature shows a connection string back to a browser. It is safe
because the value never comes from the server's response — it is the value the same page's own
form already sent, held only in that page's local component state. The server-side rule ("never
return the connection string, never log it") is about what an endpoint sends back over the
network. Reminding a browser of a value it already typed, and never transmitting, does not
violate that rule. Do not change `EnvPersistWarning.vue` to take its value from an API
response.

## The dev-server restart on first save

Writing to `.env` (`persistDatabaseUrl`, called from both `server/api/migrations/run.post.ts`
and `server/api/setup/create.post.ts`) happens as the last step, after the database work already
succeeded. In development, Nuxt restarts the whole dev server whenever `.env` changes, so the
HTTP response for that request can be cut off mid-flight even though the migration or setup
itself already committed.

Both `app/pages/admin/migrations.vue` and `app/pages/admin/setup.vue`:

- Show a `UAlert` in the form, dev-only (`import.meta.dev`), warning this will happen before
  the admin clicks submit.
- In the `catch` block, tell a dropped connection apart from a real error by checking whether
  the caught error has a `statusCode` — a real HTTP error response has one, a connection dropped
  mid-request does not. Only in dev, and only in that no-`statusCode` case, treat it as "the
  server is restarting" instead of a failure: show a "reconnecting" toast, poll a lightweight
  endpoint (`/api/migrations/status` via `refresh()`, or `/api/settings/first_setup`) every two
  seconds for up to thirty seconds, and report back once it responds again.

This assumption — "a dropped connection after this specific write means success, not failure" —
only holds because the `.env` write is the last thing each handler does. If either handler's
order changes so something meaningful happens after the `.env` write, this recovery logic would
need to move with it, or it will report false successes.

## Known, unaddressed issues

These are pre-existing bugs, found while building this feature. They are out of scope for
this feature and are not fixed here.

- **A second `first_setup` writer.** `app/composables/auth.ts` (the `login` function) also
  flips the `first_setup` healthcheck flag to `'false'` on login, when
  `user.user_metadata.is_admin` is true. This does not coordinate with the setup wizard's own
  write to the same flag. Two independent code paths write the same value.
- **`user_metadata.is_admin` is never set.** The `handle_new_user` trigger (in
  `public/schema.sql`) writes `is_admin` to `public.profiles`, but never writes it back to
  `auth.users.raw_user_meta_data`. Any code that checks `user.user_metadata.is_admin` —
  including the same `auth.ts` login flow above — never sees it set, even for the first admin.
  This is why every new endpoint in this feature checks `public.profiles.is_admin`, never
  `user_metadata`. Do not read `user_metadata.is_admin` in new code.
