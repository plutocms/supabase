import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

/**
 * The server copy of the unsaved changes of an editor (012_content_backups.sql). Core's edit form
 * sends it through `PlutoContentAdapter.backups`. One row for each user, type and item, readable
 * only by its owner (Row Level Security). See the content-adapter skill ("Backups").
 */

export const BACKUPS_TABLE = 'pluto_content_backups'

/** The most copies kept for one user. Older ones (by `updated_at`) are deleted after a write. */
export const MAX_BACKUPS_PER_USER = 20

/** A copy expires after this many days. */
export const BACKUP_TTL_DAYS = 14

/** `otherDevice` is true when the replaced copy came from another device within this time. */
export const OTHER_DEVICE_WINDOW_MS = 10 * 60 * 1000

/** The most rows one cleanup deletes. A later write deletes the rest. */
const PRUNE_BATCH = 100

const DAY_MS = 24 * 60 * 60 * 1000

let warned = false

/**
 * True when the error says the table does not exist: Postgres `42P01`, or PostgREST `PGRST205`
 * (the table is not in the schema cache). This is the case before migration 012 is applied.
 */
export function isMissingTable(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === '42P01' || code === 'PGRST205'
}

/** Warns one time for each process that the table is missing. A save never fails for a backup. */
function warnMissingTable(): void {
  if (warned) {
    return
  }
  warned = true
  console.warn(
    '[content-backups] The table pluto_content_backups does not exist. Apply migration 012 from /admin/migrations to keep server copies of unsaved changes.'
  )
}

/** Resets the one-warning flag. For tests. */
export function resetMissingTableWarning(): void {
  warned = false
}

/** The id of the signed-in user, or `null`. */
async function userIdOf(event: H3Event): Promise<string | null> {
  const user = (await serverSupabaseUser(event)) as {
    sub?: string
    id?: string
  } | null
  return user?.sub ?? user?.id ?? null
}

/** The ISO time of the oldest row that is still valid. */
function expiryOf(now: number): string {
  return new Date(now - BACKUP_TTL_DAYS * DAY_MS).toISOString()
}

/**
 * The copy of the caller for one item, or `null`. It first deletes the expired copies of the
 * caller. With no user, or before 012 is applied, it answers `null`.
 */
export async function getBackup(
  ctx: PlutoContentContext,
  client: SupabaseClient,
  key: string
): Promise<PlutoContentBackup | null> {
  const userId = await userIdOf(ctx.event)
  if (!userId) {
    return null
  }
  try {
    const { error: expiredError } = await client
      .from(BACKUPS_TABLE)
      .delete()
      .eq('user_id', userId)
      .lt('updated_at', expiryOf(Date.now()))
    if (expiredError) {
      throw expiredError
    }
    const { data, error } = await client
      .from(BACKUPS_TABLE)
      .select('record')
      .eq('user_id', userId)
      .eq('type', ctx.type.name)
      .eq('item_key', key)
      .maybeSingle()
    if (error) {
      throw error
    }
    return (data as { record?: PlutoContentBackup } | null)?.record ?? null
  } catch (error) {
    if (isMissingTable(error)) {
      warnMissingTable()
      return null
    }
    throw error
  }
}

/**
 * Replaces the copy of the caller for one item, then deletes the expired copies and the copies
 * above `MAX_BACKUPS_PER_USER`. `otherDevice` is true when the replaced copy had another `device`
 * and a recent `updated_at`. With no user, or before 012 is applied, it does nothing.
 */
export async function putBackup(
  ctx: PlutoContentContext,
  client: SupabaseClient,
  key: string,
  record: PlutoContentBackup
): Promise<{ otherDevice: boolean }> {
  const userId = await userIdOf(ctx.event)
  if (!userId) {
    return { otherDevice: false }
  }
  try {
    const { data: current, error: currentError } = await client
      .from(BACKUPS_TABLE)
      .select('device, updated_at')
      .eq('user_id', userId)
      .eq('type', ctx.type.name)
      .eq('item_key', key)
      .maybeSingle()
    if (currentError) {
      throw currentError
    }
    const now = Date.now()
    const replaced = current as { device?: string; updated_at?: string } | null
    const otherDevice =
      Boolean(replaced) &&
      replaced!.device !== record.device &&
      now - new Date(replaced!.updated_at ?? 0).getTime() <=
        OTHER_DEVICE_WINDOW_MS

    const { error } = await client.from(BACKUPS_TABLE).upsert(
      {
        user_id: userId,
        type: ctx.type.name,
        item_key: key,
        device: record.device,
        saved_at: new Date(record.savedAt).toISOString(),
        updated_at: new Date(now).toISOString(),
        record,
      },
      { onConflict: 'user_id,type,item_key' }
    )
    if (error) {
      throw error
    }

    // The cleanup is best effort: a failure here must not fail the write.
    const { error: expiredError } = await client
      .from(BACKUPS_TABLE)
      .delete()
      .eq('user_id', userId)
      .lt('updated_at', expiryOf(now))
    if (expiredError) {
      console.warn(
        `[content-backups] Could not delete the expired copies: ${expiredError.message}`
      )
    }
    const { data: old, error: oldError } = await client
      .from(BACKUPS_TABLE)
      .select('id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(MAX_BACKUPS_PER_USER, MAX_BACKUPS_PER_USER + PRUNE_BATCH - 1)
    if (oldError) {
      console.warn(
        `[content-backups] Could not list the old copies: ${oldError.message}`
      )
    } else {
      const ids = (old ?? []).map((row: { id: number }) => row.id)
      if (ids.length > 0) {
        await client.from(BACKUPS_TABLE).delete().in('id', ids)
      }
    }
    return { otherDevice }
  } catch (error) {
    if (isMissingTable(error)) {
      warnMissingTable()
      return { otherDevice: false }
    }
    throw error
  }
}

/** Deletes the copy of the caller for one item. With no user, or before 012, it does nothing. */
export async function removeBackup(
  ctx: PlutoContentContext,
  client: SupabaseClient,
  key: string
): Promise<void> {
  const userId = await userIdOf(ctx.event)
  if (!userId) {
    return
  }
  const { error } = await client
    .from(BACKUPS_TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('type', ctx.type.name)
    .eq('item_key', key)
  if (error) {
    if (isMissingTable(error)) {
      warnMissingTable()
      return
    }
    throw error
  }
}
