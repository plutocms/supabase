import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

/**
 * The saved versions of content items (011_content_revisions.sql). The content adapter writes one
 * row after each create and update, with the client of the signed-in user, and core's History reads
 * them through `listRevisions` and `getRevision`. See the content-adapter skill ("Revisions").
 */

export const REVISIONS_TABLE = 'pluto_content_revisions'

/** The most revisions kept for one item. Older ones are deleted after an insert. */
export const MAX_REVISIONS_PER_ITEM = 100

type RevisionAction = 'create' | 'update' | 'publish' | 'unpublish'

/**
 * The action of an update: `publish` or `unpublish` when the status crosses the published value,
 * else `update`. `before` is the stored status, `after` the status of the payload (undefined when
 * the payload has none).
 */
export function updateAction(
  type: PlutoContentType,
  before: unknown,
  after: unknown
): RevisionAction {
  if (!type.status || after === undefined) {
    return 'update'
  }
  const published = type.status.publishedValue || 'published'
  if (after === published && before !== published) {
    return 'publish'
  }
  if (after !== published && before === published) {
    return 'unpublish'
  }
  return 'update'
}

/** The name of the signed-in user for a revision: the profile name, else the email. */
async function authorOf(
  event: H3Event,
  client: SupabaseClient
): Promise<{
  id: string
  name: string | null
} | null> {
  const user = (await serverSupabaseUser(event)) as {
    sub?: string
    id?: string
    email?: string
  } | null
  const id = user?.sub ?? user?.id
  if (!id) {
    return null
  }
  const { data } = await client
    .from('profiles')
    .select('display_name, username, email')
    .eq('id', id)
    .maybeSingle()
  const profile = data as {
    display_name?: string | null
    username?: string | null
    email?: string | null
  } | null
  return {
    id,
    name:
      profile?.display_name ||
      profile?.username ||
      profile?.email ||
      user?.email ||
      null,
  }
}

/**
 * Writes one revision of `item` after a save, then deletes the revisions above
 * `MAX_REVISIONS_PER_ITEM`. It never throws: a failed write (011 not applied yet, a policy) only
 * logs a warning, because the save itself already worked.
 */
export async function recordRevision(
  ctx: PlutoContentContext,
  client: SupabaseClient,
  item: PlutoContentItem,
  action: RevisionAction
): Promise<void> {
  try {
    const author = await authorOf(ctx.event, client)
    if (!author) {
      return
    }
    const itemId = String(item.id)
    const { error } = await client.from(REVISIONS_TABLE).insert({
      type: ctx.type.name,
      item_id: itemId,
      action,
      data: item,
      author_id: author.id,
      author_name: author.name,
      capability: ctx.type.capabilities?.write ?? null,
    })
    if (error) {
      throw error
    }

    const { data: old, error: oldError } = await client
      .from(REVISIONS_TABLE)
      .select('id')
      .eq('type', ctx.type.name)
      .eq('item_id', itemId)
      .order('id', { ascending: false })
      .range(MAX_REVISIONS_PER_ITEM, MAX_REVISIONS_PER_ITEM + 99)
    if (oldError) {
      throw oldError
    }
    const ids = (old ?? []).map((row: { id: number }) => row.id)
    if (ids.length > 0) {
      await client.from(REVISIONS_TABLE).delete().in('id', ids)
    }
  } catch (error) {
    console.warn(
      `[content-adapter] Could not save a revision of ${ctx.type.name} "${String(item.id)}": ${(error as { message?: string }).message ?? String(error)}`
    )
  }
}

/** Deletes the revisions of a deleted item. Best effort, like `recordRevision`. */
export async function deleteRevisions(
  ctx: PlutoContentContext,
  client: SupabaseClient,
  id: string | number
): Promise<void> {
  const { error } = await client
    .from(REVISIONS_TABLE)
    .delete()
    .eq('type', ctx.type.name)
    .eq('item_id', String(id))
  if (error) {
    console.warn(
      `[content-adapter] Could not delete the revisions of ${ctx.type.name} "${String(id)}": ${error.message}`
    )
  }
}

interface RevisionRow {
  id: number
  created_at: string
  action: RevisionAction | null
  author_name: string | null
}

/**
 * The revisions of one item, newest first. The cursor is the id of the last revision of the page
 * before (keyset paging). Row Level Security limits the rows to the editors of the type.
 */
export async function listItemRevisions(
  ctx: PlutoContentContext,
  client: SupabaseClient,
  id: string | number,
  query: {
    limit: number
    cursor?: string
  }
): Promise<PlutoContentRevisionPage> {
  let builder = client
    .from(REVISIONS_TABLE)
    .select('id, created_at, action, author_name')
    .eq('type', ctx.type.name)
    .eq('item_id', String(id))
    .order('id', { ascending: false })
    .limit(query.limit + 1)
  if (query.cursor && /^\d+$/.test(query.cursor)) {
    builder = builder.lt('id', Number(query.cursor))
  }
  const { data, error } = await builder
  if (error) {
    throw error
  }
  const rows = (data ?? []) as RevisionRow[]
  const page = rows.slice(0, query.limit)
  return {
    data: page.map((row) => ({
      id: String(row.id),
      createdAt: row.created_at,
      ...(row.author_name && { author: { name: row.author_name } }),
      ...(row.action && { action: row.action }),
    })),
    ...(rows.length > query.limit && {
      nextCursor: String(page.at(-1)!.id),
    }),
  }
}

/** The item as it was at one revision, or `null`. */
export async function getItemRevision(
  ctx: PlutoContentContext,
  client: SupabaseClient,
  id: string | number,
  revisionId: string
): Promise<PlutoContentItem | null> {
  if (!/^\d+$/.test(revisionId)) {
    return null
  }
  const { data, error } = await client
    .from(REVISIONS_TABLE)
    .select('data')
    .eq('id', Number(revisionId))
    .eq('type', ctx.type.name)
    .eq('item_id', String(id))
    .maybeSingle()
  if (error) {
    throw error
  }
  const stored = (data as { data?: PlutoContentItem } | null)?.data
  return stored ? { ...stored, id: stored.id ?? id } : null
}
