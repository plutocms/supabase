# Content adapter

This feature adds the first real `PlutoContentAdapter`, backed by Supabase/PostgREST. It plugs
into `@plutocms/pluto`'s generic content routes (`/api/_pluto/content/[type]`, see that repo's
content-model skill), so any content type a layer declares maps onto a hand-authored table
through one adapter, with no per-content-type server code. It adds:

- `server/utils/content-adapter.ts` — `createSupabaseContentAdapter()`, the adapter itself, plus
  three exported pure helpers used by its own tests: `resolveTimestampColumn`,
  `resolveStatusColumn`, `toContentError`.
- `server/plugins/content-adapter.ts` — registers the adapter at Nitro startup, through
  `registerContentAdapter` (from `@plutocms/pluto`).
- `test/content-adapter-helpers.test.ts` — unit tests for the three pure helpers.

No content type is declared in this repo. `supabase` is the backend layer only — a layer that
owns a content type (`supabase-blog`'s `post`, `supabase-shop`'s `product`) declares it, in that
layer's own repo, against a table this repo's migrations already created by hand.

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

Every method uses `@plutocms/pluto`'s own `fieldColumn`, `mapFieldsToColumns`, and
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

The adapter's version reads the same way, in general form: check the *current* row's
`publishedAtColumn` value first; only set it when that value is null/undefined. A status update
to anything other than `publishedValue` leaves `publishedAtColumn` alone — this adapter never
clears it back to null the way the blog precedent's ternary does for a non-published status. A
layer that wants "unpublishing clears published-at" implements that itself, for now.

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

## Error mapping

`toContentError(error)` inspects `error.code` — the Postgres SQLSTATE PostgREST forwards — and
maps it to an `H3`/Nuxt error safe to send to a client. The raw error is always logged
(`console.error`) first, in every branch, so the real message never disappears from server logs
even when the client only sees a generic one.

| Postgres code | Meaning | HTTP status | Client message |
|---|---|---|---|
| `23505` | `unique_violation` | 409 | "A record with this value already exists." |
| `23503` | `foreign_key_violation` | 400 | "This references a record that does not exist." |
| anything else | — | 500 | The raw `error.message` |

## The type-safety trade-off: an untyped client, on purpose

`ctx.type.source` (a content type's table name) is a plain runtime string — it is not known
until a layer declares a content type, in a different repo, at that repo's build time. This
repo's own `serverSupabaseClient<Database>(event)` pattern (used everywhere else in this repo,
see `server/utils/admin-guard.ts`) only accepts one of this repo's own known table names as a
`.from()` argument, because `Database` (`shared/types/supabase.ts`) is a fixed, hand-maintained
union of this repo's own tables. A dynamic content type's table can never be one of those
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
different repo declares. Every other file in this repo keeps the strongly-typed
`serverSupabaseClient<Database>(event)` pattern; this trade-off is scoped to this one file.

One related, narrower issue: `update()`'s published-at check selects the whole row
(`select('*')`) rather than only the one dynamic column name. `@supabase/postgrest-js` parses a
`select()` argument at the type level to build its result type, and a non-literal (runtime)
string resolves to that library's own `GenericStringError` type instead of a usable row shape.
Selecting `'*'` (a literal) and reading the one property off the full row afterward avoids that,
with no cast needed.

## What is not tested here (and why)

`test/content-adapter-helpers.test.ts` covers only the three pure functions
(`resolveTimestampColumn`, `resolveStatusColumn`, `toContentError`) — no I/O, no Supabase client,
real branches. `list`/`get`/`create`/`update`/`remove` are not unit-tested by mocking the
supabase-js query-builder chain (`.from().select().eq().order().range()...`): a mock deep enough
to stand in for that chain would test the mock, not the code, and this repo has no precedent for
it (see `test/ledger.test.ts`, `test/sql.test.ts` for the existing pure-logic bar). Those five
methods are verified against a live database separately, outside this repo's automated test
suite.

The helper test file mocks the module-level `#supabase/server` import (a virtual module Nitro
only resolves inside a real Nuxt build) with `vi.mock`, purely so `content-adapter.ts` can load
under plain `vitest run`. The stub is never called — the three functions under test do not touch
the Supabase client.
