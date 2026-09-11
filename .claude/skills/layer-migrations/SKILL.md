# Layer migrations

This feature lets an admin apply pending, versioned, per-file database migrations from the
admin UI, after initial setup. Each layer keeps its own ordered list of migration files
(`db/migrations/001_baseline.sql`, `002_admin_hardening.sql`, and so on), tracked one row per
file in `public.pluto_migrations`. It adds:

- `server/utils/sql.ts` — `splitStatements(sql)`, splits a SQL string into individual
  statements, correctly handling dollar-quoted strings (bare and named), single- and
  double-quoted text, and line/block comments.
- `server/utils/ledger.ts` — `ensureLedger(sql)`, brings `public.pluto_migrations` to the
  current versioned, per-migration shape, from either an empty database or the old
  one-row-per-layer shape.
- `server/utils/migrations.ts` — `runPendingMigrations(opts)`, applies every not-yet-applied
  migration file across the given layers; `resolveConnectionString(bodyConnectionString)`,
  the connection-string precedence rule (see below).
- `modules/pluto-migrations.ts` — a Nuxt module that discovers each layer's migration files at
  build time and writes them to `runtimeConfig.plutoLayerMigrations`.
- `shared/types/migrations.d.ts` — the `PlutoMigrationFile` type shared by the build-time module
  and the runtime engine.
- `server/utils/admin-guard.ts` — `requireAdmin(event)`, gates a server route on
  `public.profiles.is_admin`.
- `server/utils/pending-migrations.ts` — `getMigrationStatus(event)`, computes discovered,
  applied, and pending migration files, per layer and overall.
- `server/utils/env-file.ts` — `persistDatabaseUrl(connectionString)`, writes `DATABASE_URL`
  to `.env`.
- `server/utils/scrub-connection-string.ts` — `scrubConnectionString(message, connStr)`,
  removes a connection string and its password from an error message.
- `server/api/migrations/status.get.ts` — reports pending and applied migration files.
- `server/api/migrations/run.post.ts` — applies pending migrations.
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
(see `server/utils/ledger.ts`). An anonymous caller does not get an error — the query just
returns zero rows. A route that reads this table without an admin gate would treat every
discovered migration as pending, and would leak the list of installed layer and migration
names to an anonymous visitor. This is why `getMigrationStatus` must only ever be called from
a route already gated by `requireAdmin`.

## Per-file transactions, checksums, and `-- pluto:no-transaction`

`runPendingMigrations` (in `server/utils/migrations.ts`) applies each migration file on its
own: normally, every statement in the file runs inside one transaction, together with the
ledger row that records it (`insert into public.pluto_migrations (layer_name, migration_name,
checksum) ...`). If any statement in the file fails, that whole file rolls back — nothing from
it is applied, and no row is written for it. A retry only re-attempts files not yet recorded in
the ledger; already-applied files in the same layer are left alone.

A failure in one file stops the *rest of that layer's* files (a later file often depends on an
earlier one), reported as `status: 'failed'` with `error: 'Skipped: an earlier migration in
this layer failed.'`. It never blocks another layer's migrations — each layer runs
independently.

**Checksums.** Each migration file's checksum (the first 16 hex characters of a SHA-256 digest
of its content, computed at build time in `modules/pluto-migrations.ts`) is recorded alongside
its ledger row. On a later boot, if a file already in the ledger now has a different checksum
than what's recorded, `runPendingMigrations` logs a `console.warn` naming the layer and file —
it does not fail or re-run anything. This is a signal that an already-shipped migration file
was edited after it was applied somewhere. See "How to write a migration" below for the rule
this is meant to catch.

**`-- pluto:no-transaction`.** A statement that cannot run inside a transaction (for example
`create index concurrently`) needs an escape hatch: make `-- pluto:no-transaction` (optionally
with more text after it) the file's first non-blank line. `runPendingMigrations` then runs that
file's statements one at a time, with no surrounding transaction, and records the ledger row in
a separate statement afterward. A failure partway through such a file can leave it partially
applied — write its statements with `if not exists` / `on conflict` guards so a retry is safe,
the same way every migration file already should be (see below). Use this only when a real
statement needs it; every other file should run in its default transaction.

## How to write a migration

To change the database schema for a layer, add a new file to that layer's `db/migrations/`
directory:

- Name it `NNN_slug.sql`, with `NNN` the next zero-padded number after the highest one already
  in that directory (`003_slug.sql` after `001_baseline.sql` and `002_admin_hardening.sql`).
- Never edit a file that has already shipped (released, or already applied to any database).
  `runPendingMigrations` checksums each file and warns on a mismatch — see above — precisely
  because editing a shipped file is a mistake to catch, not a way to fix one. Write a new file
  with the fix instead.
- Never renumber an existing file. The number is part of its identity in the ledger
  (`layer_name`, `migration_name`).
- `001_baseline.sql` is a fixed, reserved name: the pre-existing schema snapshot every already-
  converted layer starts from. Do not reuse it for a new change.
- Write the file so it is safe to run on its own against a database that already has every
  earlier-numbered file applied — it does not need to (and should not try to) be a no-op
  against a fresh database, only against one that's current up to the previous file.
- Use `if not exists` / `on conflict` / `drop ... if exists` guards where they make sense, the
  same way `db/migrations/001_baseline.sql` and `002_admin_hardening.sql` already do — this
  keeps a partially-applied file (see the no-transaction case above) safe to retry.

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
  `db/migrations/002_admin_hardening.sql`) writes `is_admin` to `public.profiles`, but never writes it back to
  `auth.users.raw_user_meta_data`. Any code that checks `user.user_metadata.is_admin` —
  including the same `auth.ts` login flow above — never sees it set, even for the first admin.
  This is why every new endpoint in this feature checks `public.profiles.is_admin`, never
  `user_metadata`. Do not read `user_metadata.is_admin` in new code.
