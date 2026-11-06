# Content adapter

This feature adds the first real `PlutoContentAdapter`, backed by Supabase/PostgREST. It plugs
into `@plutocms/core`'s generic content routes (`/api/_pluto/content/[type]`, see that repo's
content-model skill), so any content type a layer declares maps onto a hand-authored table
through one adapter, with no per-content-type server code. It also answers the public API of core
(`GET /api/pluto/v1/content/<type>`, see "Public reads" below). It adds:

- `server/utils/content-adapter.ts` — `createSupabaseContentAdapter()`, the adapter itself, plus
  three exported pure helpers used by its own tests: `resolveTimestampColumn`,
  `resolveStatusColumn`, `toContentError`.
- `server/plugins/content-adapter.ts` — registers the adapter at Nitro startup, through
  `registerContentAdapter` (from `@plutocms/core`).
- `test/content-adapter-helpers.test.ts` — unit tests for the three pure helpers.
- `test/content-adapter-reads.test.ts` — unit tests for filters, timestamps and the anonymous client,
  with a fake query builder.

No content type is declared in this package. `supabase` is the backend layer only — a layer that
owns a content type (`supabase-blog`'s `post`, `supabase-shop`'s `product`) declares it, in that
layer's own package, against a table this package's migrations already created by hand.

## What this adapter does not do

- **No schema generation.** A layer's SQL migration is hand-authored and already exists (see the
  layer-migrations skill). The adapter only maps a `PlutoContentType` onto a table that migration
  already created. It never creates, alters, or inspects a table's real schema.
- **No relation resolution beyond what `PlutoReferenceField` already externalizes.** A
  `reference` field's options come from `field.optionsUrl` (fetched client-side, by core's own
  `PlutoFieldReference` widget) or from `field.target` naming another content type (not resolved
  yet, in core). This adapter does not add a server-side join or a "populate" step of its own —
  a referenced value is stored and read back as a plain column value, exactly like any other
  field.
- **No `describe()`.** `PlutoContentAdapter.describe` is optional, for a dev-only conformance
  warning (comparing a declared content type's fields against its table's real columns) that is
  deliberately deferred, not part of this wave. This adapter has no `describe` property at all —
  not a stub, not a method that throws. Omitted entirely.

## Field/column mapping: delegated, not reimplemented

Every method uses `@plutocms/core`'s own `fieldColumn`, `mapFieldsToColumns`, and
`mapColumnsToFields` (from `shared/utils/content-map.ts`) for every translation between a
field-keyed payload and a column-keyed database row. This adapter never reimplements that
mapping. The one exception is a field named directly off a content type's own configuration
(`titleField`, `defaultSort.field`, `slug.field`) rather than found by iterating `type.fields` —
each of those is resolved by finding the matching field first, then calling `fieldColumn` on it,
falling back to the raw name (with a `console.warn`) only when the named field does not exist.
That fallback signals a misconfigured content type; it never throws, because a list or a get
should still work with a best-effort column guess rather than fail outright.

## The published-at preservation rule

`update()` stamps `type.status.publishedAtColumn` to the current time the first time a row is
set to `type.status.publishedValue`, and never overwrites an already-set value on a later edit.
This generalizes a rule already hand-written once, in `supabase-blog`'s
`server/api/post/edit/[id].post.ts`:

```ts
published_at:
  body.status === 'published'
    ? (existing.published_at ?? new Date().toISOString())
    : null,
```

The adapter's version reads the same way, in general form: check the _current_ row's
`publishedAtColumn` value first; only set it when that value is null/undefined. A status update
to anything other than `publishedValue` leaves `publishedAtColumn` alone — this adapter never
clears it back to null the way the blog precedent's ternary does for a non-published status. A
layer that wants "unpublishing clears published-at" implements that itself, for now.

The adapter reads the stored row whenever the payload has a `status`: this rule needs it, and so
does the revision action (see "Revisions").

## Revisions

The adapter implements core's optional `listRevisions` and `getRevision` (the content-model skill
of core, "Revisions"), so the edit form of every type shows History. The code is in
`server/utils/content-revisions.ts`. The table is `public.pluto_content_revisions` (migration 011).

- **One table for every type of every layer**, not a trigger per content table: `type`, `item_id`
  (the primary key as text), `action`, `data` (the item after the save, by field name, as
  `toItem` gives it), `author_id` (default `auth.uid()`), `author_name` (the profile name, else the
  email, at save time) and `capability` (the write capability of the type at save time).
- **Written after each create and update** (`recordRevision`), with the client of the signed-in
  user. The action is `create`. On update it is `publish` or `unpublish` when the status crosses the
  published value (`updateAction`, from the stored row), else `update`. A failed write only warns:
  the save already worked (for example before 011 is applied). No user: no row.
- **At most 100 per item** (`MAX_REVISIONS_PER_ITEM`): the older ones are deleted after an insert.
- **A delete** removes the revisions of the item (`deleteRevisions`, best effort).
- **Reads**: newest first by id, with a keyset cursor (the last id). `getRevision` returns the
  stored `data`, and refuses a revision id that is not a number.
- **RLS**: select, insert and delete need the stored capability (`public.has_capability`, which
  folds in admins), or any staff capability for a type with none. Insert also needs
  `author_id = auth.uid()`. No update. Grants: select, insert, delete to authenticated, and CRUD to
  service_role.
- An item saved before 011 has no revision until its next save, so History stays hidden until then.

Tests: `test/content-revisions.test.ts` (a fake client), `test/migrations-011.test.ts` and
`test/data-api-grants.test.ts`. The RLS rules were checked once in PGlite, with stub auth functions.

## Timestamps: always stamped, never client-controlled

`resolveTimestampColumn(type, 'created' | 'updated')` resolves the storage column, or
`undefined` when disabled (`type.timestamps === false`, or `type.timestamps[key] === false`).
When a column resolves, `create()` and `update()` always overwrite it with the current time,
regardless of what the caller's payload contained. A client never controls its own creation or
update timestamp.

## Status default: only when the caller did not set one

Unlike a timestamp, a new row's status default (`type.status.default`) is applied only when the
payload does not already set that column (`!Object.hasOwn(row, statusColumn)`). A caller
creating a row with an explicit status is respected; a caller that omits status gets the
declared default.

## Filters

`query.filters` is a map of field name to text. `list()` resolves each field with
`resolveFieldColumn` and applies `.eq(column, value)`. The value is text, so a stored number or
boolean matches by its text (`'3'`, `'true'`). Core checks that each name is a public field before it
calls the adapter.

A filter on a `reference` field with `multiple: true` (a list column, such as `posts.tag_ids`
`bigint[]`) applies `.contains(column, [value])`: the row matches when its list holds the value. A
GIN index on the column serves it. `isListField()` decides.

`query.ids` applies `.in(pkColumn, ids)`. An empty list makes no query and gives an empty result with a
total of 0. Core uses it to expand references with one read per target.

## Timestamps on items

`mapColumnsToFields` drops every column that no field declares, and a timestamp is not a field.
`toItem()` maps the row, then copies the created column, the updated column and
`type.status.publishedAtColumn` (when set) onto the item under their **column names**. A field with
the same name keeps its own value. `timestampKeys(type)` returns those column names as
`{ created?, updated?, published? }`. Core uses it to sort and to show the dates. A sort field that
is a timestamp column resolves directly, with no "no field named" warning.

## Public reads

When `isPublicRead(ctx.event)` is true, `getClient()` returns an anonymous client and not the session
client. The client comes from `createClient(url, key, { auth: { persistSession: false,
autoRefreshToken: false, detectSessionInUrl: false } })`. The url and the key are the
`public.supabase` runtime config of `@nuxtjs/supabase`. The client reads no cookie, so Row Level
Security applies as for an anonymous visitor. The answer is the same for everyone, so a CDN can cache
it. One client serves the process, and it is built again only if the url or the key changes. The
adapter never uses the service role key. A table that the public must read needs an RLS policy for
the `anon` role.

## Error mapping

`toContentError(error)` inspects `error.code` — the Postgres SQLSTATE PostgREST forwards — and
maps it to an `H3`/Nuxt error safe to send to a client. The raw error is always logged
(`console.error`) first, in every branch, so the real message never disappears from server logs
even when the client only sees a generic one.

| Postgres code | Meaning                 | HTTP status | Client message                                  |
| ------------- | ----------------------- | ----------- | ----------------------------------------------- |
| `23505`       | `unique_violation`      | 409         | "A record with this value already exists."      |
| `23503`       | `foreign_key_violation` | 400         | "This references a record that does not exist." |
| anything else | —                       | 500         | The raw `error.message`                         |

## The type-safety trade-off: an untyped client, on purpose

`ctx.type.source` (a content type's table name) is a plain runtime string — it is not known
until a layer declares a content type, in a different package, at that package's build time. This
package's own `serverSupabaseClient<Database>(event)` pattern (used everywhere else in this package,
see `server/utils/admin-guard.ts`) only accepts one of this package's own known table names as a
`.from()` argument, because `Database` (`shared/types/supabase.ts`) is a fixed, hand-maintained
union of this package's own tables. A dynamic content type's table can never be one of those
literals at compile time.

`server/utils/content-adapter.ts` calls `serverSupabaseClient(event)` with no generic parameter,
then casts the result to the bare `SupabaseClient` type (imported from `@supabase/supabase-js`,
whose own generic defaults to `any`):

```ts
async function getClient(event: H3Event): Promise<SupabaseClient> {
  return (await serverSupabaseClient(event)) as SupabaseClient
}
```

This is the one, deliberate place this file loses compile-time table/column safety. It is
correct and unavoidable, not a bug to fix later — `Database` can never know about a table a
different package declares. Every other file in this package keeps the strongly-typed
`serverSupabaseClient<Database>(event)` pattern; this trade-off is scoped to this one file.

One related, narrower issue: `update()`'s published-at check selects the whole row
(`select('*')`) rather than only the one dynamic column name. `@supabase/postgrest-js` parses a
`select()` argument at the type level to build its result type, and a non-literal (runtime)
string resolves to that library's own `GenericStringError` type instead of a usable row shape.
Selecting `'*'` (a literal) and reading the one property off the full row afterward avoids that,
with no cast needed.

## What is not tested here (and why)

`test/content-adapter-helpers.test.ts` covers the three pure functions (`resolveTimestampColumn`,
`resolveStatusColumn`, `toContentError`). `test/content-adapter-reads.test.ts` checks the read path
(filters, timestamps, sort, which client is used) against a small fake builder that records the
calls. It checks that the adapter makes the right calls. It does not check the SQL.
`create`, `update` and `remove` are verified against a live database, outside this package's
automated test suite.

The helper test file mocks the module-level `#supabase/server` import (a virtual module Nitro
only resolves inside a real Nuxt build) with `vi.mock`, purely so `content-adapter.ts` can load
under plain `vitest run`. The stub is never called — the three functions under test do not touch
the Supabase client.
