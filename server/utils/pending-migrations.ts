import type { H3Event } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

export interface MigrationStatus {
  discovered: string[]
  applied: string[]
  pending: string[]
  hasConnection: boolean
}

/**
 * Computes which layer schemas are discovered, applied, and pending.
 *
 * This reads `pluto_migrations` through RLS with the caller's own session
 * (the table policy limits reads to `authenticated`). Call this only from a
 * route already gated by `requireAdmin` — an anonymous caller would see zero
 * rows (not an error), which would make every discovered layer look
 * pending and leak layer names to an unauthenticated visitor.
 *
 * Never returns the SQL content of a layer schema, only its name.
 */
export async function getMigrationStatus(
  event: H3Event
): Promise<MigrationStatus> {
  const config = useRuntimeConfig()
  const layerSchemas: Record<string, string> = config.plutoLayerSchemas ?? {}
  const discovered = Object.keys(layerSchemas)

  const client = await serverSupabaseClient<Database>(event)

  const { data, error } = await client
    .from('pluto_migrations')
    .select('layer_name')

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Error reading migration status: ${error.message}`,
    })
  }

  const applied = (data ?? []).map((row) => row.layer_name)
  const appliedSet = new Set(applied)
  const pending = discovered.filter((name) => !appliedSet.has(name))

  return {
    discovered,
    applied,
    pending,
    hasConnection: Boolean(process.env.DATABASE_URL),
  }
}
