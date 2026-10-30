import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { serverSupabaseClient } from '#supabase/server'
import { requireCapability } from './capability-guard'

/**
 * A Supabase client for one request, deliberately untyped.
 *
 * A content type's table name (`type.source`) is a plain runtime string —
 * it is not known until a layer declares a content type, in a different
 * repo, at that repo's build time. `serverSupabaseClient` defaults to
 * this app's own `Database` type (see `shared/types/supabase.ts`), whose
 * `.from()` only accepts this repo's own table names as literals. Casting
 * to the bare `SupabaseClient` type (whose own generic defaults to `any`)
 * is the one, deliberate place this file loses compile-time table/column
 * safety. See `.claude/skills/content-adapter/SKILL.md` for the full
 * write-up.
 *
 * Goes through `unknown` first: `serverSupabaseClient`'s inferred
 * `Database` type is whichever layer's own generated types are in scope
 * at the *call site* — this repo's own `shared/types/supabase.ts` when
 * typechecked standalone, but a different consumer's own generated types
 * when this file is typechecked as part of a deeper extends chain (a
 * layer that extends this one, extending it in turn). A direct `as
 * SupabaseClient` cast is only valid when the two concrete
 * instantiations "sufficiently overlap"; a client typed against some
 * other, unrelated `Database` shape does not, and TypeScript correctly
 * refuses the direct assertion in that case. Routing through `unknown`
 * is the standard, correct way to widen past that check on purpose —
 * this cast has always been meant to discard the specific `Database`
 * type, not to assert against one.
 */
async function getClient(event: H3Event): Promise<SupabaseClient> {
  if (isPublicRead(event)) {
    return getAnonymousClient(event)
  }

  return (await serverSupabaseClient(event)) as unknown as SupabaseClient
}

/**
 * The client of a request: the anonymous client for a public read (no
 * cookie, the same answer for everyone), else the client of the signed-in user.
 * The media driver uses it too.
 */
export const supabaseRequestClient = getClient

/** The anonymous client and the url/key pair it was built from. */
let anonymousClient:
  { url: string; key: string; client: SupabaseClient } | undefined

/**
 * A Supabase client with no user session, for public reads of the public
 * API. It uses the anon key from the runtime config of `@nuxtjs/supabase`,
 * reads no cookies and keeps no session. Row Level Security then applies as
 * for an anonymous visitor, so the answer is the same for everyone and a CDN
 * can cache it. It never uses the service role key. One client serves the
 * whole process.
 */
function getAnonymousClient(event: H3Event): SupabaseClient {
  const { url, key } = useRuntimeConfig(event).public.supabase as {
    url: string
    key: string
  }

  if (
    !anonymousClient ||
    anonymousClient.url !== url ||
    anonymousClient.key !== key
  ) {
    anonymousClient = {
      url,
      key,
      client: createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }),
    }
  }

  return anonymousClient.client
}

/**
 * Resolves the storage column for a content type's created/updated
 * timestamp. Returns `undefined` when timestamps are disabled entirely
 * (`type.timestamps === false`) or when this one timestamp is disabled
 * (`type.timestamps[key] === false`).
 */
export function resolveTimestampColumn(
  type: PlutoContentType,
  key: 'created' | 'updated'
): string | undefined {
  if (type.timestamps === false) {
    return undefined
  }

  const configured = type.timestamps?.[key]

  if (configured === false) {
    return undefined
  }

  return configured ?? (key === 'created' ? 'created_at' : 'updated_at')
}

/**
 * Resolves the storage column for a content type's status field. Returns
 * `undefined` when status is disabled entirely (`type.status === false`
 * or unset).
 */
export function resolveStatusColumn(
  type: PlutoContentType
): string | undefined {
  if (!type.status) {
    return undefined
  }

  return type.status.column ?? 'status'
}

/**
 * Resolves a sort field to its column. A timestamp column (the created, the
 * updated or the published-at column) sorts directly, because it is not a
 * declared field. Any other name must be a declared field.
 */
function resolveSortColumn(type: PlutoContentType, fieldName: string): string {
  if (timestampColumns(type).includes(fieldName)) {
    return fieldName
  }

  return resolveFieldColumn(type, fieldName, 'sort')
}

/** The columns of the created, updated and published-at timestamps that this type has. */
function timestampColumns(type: PlutoContentType): string[] {
  const { created, updated, published } = timestampKeys(type)

  return [created, updated, published].filter(
    (column): column is string => column !== undefined
  )
}

/**
 * The item keys of the timestamps of a type. They are the column names,
 * because a timestamp is not a declared field. A key is missing when its
 * timestamp is off. Core uses this to sort and to show the public dates.
 */
function timestampKeys(type: PlutoContentType): {
  created?: string
  updated?: string
  published?: string
} {
  const keys: { created?: string; updated?: string; published?: string } = {}

  const created = resolveTimestampColumn(type, 'created')
  if (created) {
    keys.created = created
  }

  const updated = resolveTimestampColumn(type, 'updated')
  if (updated) {
    keys.updated = updated
  }

  const published = type.status ? type.status.publishedAtColumn : undefined
  if (published) {
    keys.published = published
  }

  return keys
}

/**
 * Maps a row to an item, then copies the timestamp columns onto it under
 * their column names. `mapColumnsToFields` drops every column that no field
 * declares, and a timestamp is not a field. A field with the same name as a
 * timestamp column keeps its own value.
 */
function toItem(
  type: PlutoContentType,
  row: Record<string, unknown>
): PlutoContentItem {
  const item = mapColumnsToFields(type, row)

  for (const column of timestampColumns(type)) {
    if (!Object.hasOwn(item, column) && Object.hasOwn(row, column)) {
      item[column] = row[column]
    }
  }

  return item
}

/**
 * Maps a raw PostgREST error to an H3/Nuxt error safe to send to a
 * client. Logs the raw error first, so the real message always reaches
 * server logs even when the client-facing message is generic. No return
 * type annotation: `createError`'s own return type (`NuxtError`) is left
 * to flow through, rather than restated here.
 */
export function toContentError(error: PostgrestError) {
  console.error('[content-adapter] Postgres error:', error)

  // 23505: unique_violation.
  if (error.code === '23505') {
    return createPlutoError({
      statusCode: 409,
      message: 'A record with this value already exists.',
      key: 'supabase.errors.duplicateRecord',
    })
  }

  // 23503: foreign_key_violation.
  if (error.code === '23503') {
    return createPlutoError({
      statusCode: 400,
      message: 'This references a record that does not exist.',
      key: 'supabase.errors.missingReference',
    })
  }

  return createError({ statusCode: 500, statusMessage: error.message })
}

/** Resolves a field's storage column by name, warning and falling back to the raw name when the field is missing. This signals a misconfigured content type. */
function resolveFieldColumn(
  type: PlutoContentType,
  fieldName: string,
  context: string
): string {
  const field = type.fields.find((candidate) => candidate.name === fieldName)

  if (field) {
    return fieldColumn(field)
  }

  console.warn(
    `[content-adapter] Content type "${type.name}" has no field named "${fieldName}" (${context}). Falling back to the raw name as the column.`
  )

  return fieldName
}

async function list(
  ctx: PlutoContentContext,
  query: PlutoContentQuery
): Promise<PlutoContentListResult> {
  const client = await getClient(ctx.event)
  const pkColumn = ctx.type.primaryKey ?? 'id'

  let builder = client.from(ctx.type.source).select('*', { count: 'exact' })

  const statusColumn = resolveStatusColumn(ctx.type)
  if (statusColumn && query.includeUnpublished !== true) {
    const publishedValue =
      (ctx.type.status && ctx.type.status.publishedValue) || 'published'
    builder = builder.eq(statusColumn, publishedValue)
  }

  for (const [field, value] of Object.entries(query.filters ?? {})) {
    builder = builder.eq(resolveFieldColumn(ctx.type, field, 'filter'), value)
  }

  if (query.search) {
    const titleColumn = resolveFieldColumn(
      ctx.type,
      ctx.type.titleField,
      'titleField'
    )
    builder = builder.ilike(titleColumn, `%${query.search}%`)
  }

  const sort = query.sort ?? ctx.type.defaultSort
  if (sort) {
    const sortColumn = resolveSortColumn(ctx.type, sort.field)
    builder = builder.order(sortColumn, {
      ascending: sort.direction !== 'desc',
    })
  } else {
    const createdColumn = resolveTimestampColumn(ctx.type, 'created')
    builder = builder.order(createdColumn ?? pkColumn, { ascending: false })
  }

  if (query.offset !== undefined) {
    const limit = query.limit ?? 50
    builder = builder.range(query.offset, query.offset + limit - 1)
  } else if (query.limit !== undefined) {
    builder = builder.limit(query.limit)
  }

  const { data, error, count } = await builder

  if (error) {
    throw toContentError(error)
  }

  return {
    data: (data ?? []).map((row: Record<string, unknown>) =>
      toItem(ctx.type, row)
    ),
    total: count ?? undefined,
  }
}

/**
 * 22P02 (invalid_text_representation): the value doesn't parse as the
 * primary key column's own SQL type — for example a slug like
 * "hello-world" against a `bigint` id column. This is not a real error:
 * it means "not found by id, at the database level", the same outcome as
 * a clean empty result, and `get()` must fall through to trying the slug
 * column exactly as it would for an empty result. Postgres reports a type
 * mismatch as an error rather than zero rows, so this has to be handled
 * separately from the empty-result case, not folded into it.
 */
function isInvalidIdShape(error: PostgrestError): boolean {
  return error.code === '22P02'
}

async function get(
  ctx: PlutoContentContext,
  idOrSlug: string | number
): Promise<PlutoContentItem | null> {
  const client = await getClient(ctx.event)
  const pkColumn = ctx.type.primaryKey ?? 'id'

  const { data, error } = await client
    .from(ctx.type.source)
    .select('*')
    .eq(pkColumn, idOrSlug)
    .maybeSingle()

  if (error && !isInvalidIdShape(error)) {
    throw toContentError(error)
  }

  if (data) {
    return toItem(ctx.type, data)
  }

  if (ctx.type.slug) {
    const slugColumn = resolveFieldColumn(
      ctx.type,
      ctx.type.slug.field,
      'slug.field'
    )

    const bySlug = await client
      .from(ctx.type.source)
      .select('*')
      .eq(slugColumn, idOrSlug)
      .maybeSingle()

    if (bySlug.error) {
      throw toContentError(bySlug.error)
    }

    if (bySlug.data) {
      return toItem(ctx.type, bySlug.data)
    }
  }

  return null
}

async function create(
  ctx: PlutoContentContext,
  values: Record<string, unknown>
): Promise<PlutoContentItem> {
  const client = await getClient(ctx.event)
  const row = mapFieldsToColumns(ctx.type, values)

  // Status is not a declared field (see PlutoContentType.status — a
  // separate, top-level concern from `fields`, unlike `slug`, which
  // references a field also present in `fields`), so mapFieldsToColumns
  // never sees it — it filters strictly to declared field names. A
  // payload's status lives at the fixed conceptual key `status`,
  // regardless of what `type.status.column` names in storage, mirroring
  // how a field's own name (not its storage column) is the payload key
  // everywhere else in this contract.
  const statusColumn = resolveStatusColumn(ctx.type)
  if (statusColumn) {
    if (Object.hasOwn(values, 'status')) {
      row[statusColumn] = values.status
    } else if (ctx.type.status && ctx.type.status.default !== undefined) {
      row[statusColumn] = ctx.type.status.default
    }
  }

  // A client never controls its own creation timestamp. Always stamp it,
  // overwriting anything the caller's payload tried to set.
  const createdColumn = resolveTimestampColumn(ctx.type, 'created')
  if (createdColumn) {
    row[createdColumn] = new Date().toISOString()
  }

  const { data, error } = await client
    .from(ctx.type.source)
    .insert(row)
    .select('*')
    .single()

  if (error) {
    throw toContentError(error)
  }

  return toItem(ctx.type, data)
}

async function update(
  ctx: PlutoContentContext,
  id: string | number,
  values: Record<string, unknown>
): Promise<PlutoContentItem> {
  const client = await getClient(ctx.event)
  const pkColumn = ctx.type.primaryKey ?? 'id'
  const row = mapFieldsToColumns(ctx.type, values)

  // See the matching comment in create(): status is not a declared field,
  // so mapFieldsToColumns never sees it. Read it from the fixed
  // conceptual key `status` in the raw payload.
  const statusColumn = resolveStatusColumn(ctx.type)
  if (statusColumn && Object.hasOwn(values, 'status')) {
    row[statusColumn] = values.status
  }

  // A client never controls its own update timestamp. Always stamp it,
  // overwriting anything the caller's payload tried to set.
  const updatedColumn = resolveTimestampColumn(ctx.type, 'updated')
  if (updatedColumn) {
    row[updatedColumn] = new Date().toISOString()
  }

  // Published-at preservation, generalizing supabase-blog's hand-written
  // edit route: stamp published-at the first time a row is published, but
  // never overwrite an already-set value on a later edit.
  if (
    statusColumn &&
    ctx.type.status &&
    ctx.type.status.publishedAtColumn &&
    row[statusColumn] === ctx.type.status.publishedValue
  ) {
    const publishedAtColumn = ctx.type.status.publishedAtColumn
    // Selects the whole row rather than the one dynamic column name:
    // postgrest-js parses a `select()` argument at the type level, and a
    // non-literal (runtime) column name resolves to its own
    // `GenericStringError` type instead of a usable row shape.
    const { data: existing, error: fetchError } = await client
      .from(ctx.type.source)
      .select('*')
      .eq(pkColumn, id)
      .maybeSingle()

    if (fetchError) {
      throw toContentError(fetchError)
    }

    if (
      existing &&
      (existing as Record<string, unknown>)[publishedAtColumn] == null
    ) {
      row[publishedAtColumn] = new Date().toISOString()
    }
  }

  const { data, error } = await client
    .from(ctx.type.source)
    .update(row)
    .eq(pkColumn, id)
    .select('*')
    .single()

  if (error) {
    throw toContentError(error)
  }

  return toItem(ctx.type, data)
}

async function remove(
  ctx: PlutoContentContext,
  id: string | number
): Promise<void> {
  const client = await getClient(ctx.event)
  const pkColumn = ctx.type.primaryKey ?? 'id'

  const { error } = await client.from(ctx.type.source).delete().eq(pkColumn, id)

  if (error) {
    throw toContentError(error)
  }
}

/**
 * Counts the rows created in `[range.from, range.to)` with one exact-count
 * HEAD query: no rows come back, so it is not capped by the PostgREST row
 * limit. Row Level Security applies as usual. Returns `null` when the type
 * has no created timestamp column.
 */
async function countCreated(
  ctx: PlutoContentContext,
  range: { from: string; to: string }
): Promise<number | null> {
  const createdColumn = resolveTimestampColumn(ctx.type, 'created')
  if (!createdColumn) {
    return null
  }

  const client = await getClient(ctx.event)
  const { count, error } = await client
    .from(ctx.type.source)
    .select('*', { count: 'exact', head: true })
    .gte(createdColumn, range.from)
    .lt(createdColumn, range.to)

  if (error) {
    throw toContentError(error)
  }

  return count ?? 0
}

/** Delegates straight to `requireCapability`, unchanged. */
async function authorize(event: H3Event, capability: string): Promise<void> {
  await requireCapability(event, capability)
}

/** Builds the Supabase/PostgREST-backed `PlutoContentAdapter`. Register it with `registerContentAdapter` from a `server/plugins/*.ts` file. */
export function createSupabaseContentAdapter(): PlutoContentAdapter {
  return {
    id: 'supabase',
    list,
    get,
    create,
    update,
    remove,
    authorize,
    countCreated,
    timestampKeys,
  }
}
