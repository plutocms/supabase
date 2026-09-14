import type { PlutoMigrationFile } from '../../../shared/types/migrations'
import type { MigrationFileResult } from '../../utils/migrations'
import { z } from 'zod'
import { requireAdmin } from '../../utils/admin-guard'
import { persistDatabaseUrl } from '../../utils/env-file'
import { resolveConnectionString, runPendingMigrations } from '../../utils/migrations'
import { scrubConnectionString } from '../../utils/scrub-connection-string'
import { regenerateSupabaseTypes } from '../../utils/typegen'
import { parseBody } from '../../utils/validate'

// The whole body is optional: an already-configured DATABASE_URL means the
// caller need not (and, per resolveConnectionString, cannot) supply one.
const runMigrationsSchema = z
  .object({
    connectionString: z.string().trim().min(1, 'Connection string must not be empty.').optional(),
  })
  .optional()

export default defineEventHandler(async (event) => {
  // requireAdmin specifically, not a named capability — see admin-guard.ts
  // for why: this route must work even before 004_roles_and_capabilities.sql
  // (which defines the capability system) has been applied.
  await requireAdmin(event)

  const body = await parseBody(event, runMigrationsSchema)

  // Connection string precedence: an already-configured DATABASE_URL always
  // wins, and a body-supplied string is ignored completely in that case.
  // This is the whole security model for this endpoint — without it, any
  // admin could point the server at an arbitrary database host. See
  // resolveConnectionString for the full rule.
  const { connStr, usingBody: usingBodyConnectionString } =
    resolveConnectionString(body?.connectionString)

  if (!connStr) {
    return {
      success: false as const,
      needsConnectionString: true,
    }
  }

  const config = useRuntimeConfig()
  // Nuxt's schema inference narrows `plutoLayerMigrations` to whatever
  // layer keys and file shapes it happened to observe at build time (see
  // the `RuntimeConfig` augmentation in shared/types/runtime-config.d.ts),
  // so the read is cast back to the intended general shape.
  const layers = (config.plutoLayerMigrations ?? {}) as unknown as Record<
    string,
    PlutoMigrationFile[]
  >

  try {
    const layerResults = await runPendingMigrations({
      connectionString: connStr,
      layers,
    })

    const results: MigrationFileResult[] = layerResults.flatMap(
      (layer) => layer.results
    )

    const anyApplied = results.some((result) => result.status === 'applied')

    // Deliberate runtime mutation: a valid connection string just proved
    // itself against the database, so make it available to
    // getConnectionString() for the rest of this process life. No
    // server restart is needed for later requests to pick it up.
    if (usingBodyConnectionString) {
      process.env.DATABASE_URL = connStr
    }

    // Nothing to persist when DATABASE_URL was already configured.
    // Otherwise persist the now-proven body-supplied string.
    let persisted = !usingBodyConnectionString
    let message: string | undefined

    if (usingBodyConnectionString) {
      persisted = await persistDatabaseUrl(connStr)

      if (!persisted) {
        message =
          'Migrations were applied, but the connection string could not be ' +
          'saved to .env. Add DATABASE_URL to .env by hand.'
      }
    }

    if (import.meta.dev && anyApplied && config.plutoRootDir) {
      await regenerateSupabaseTypes(config.plutoRootDir, connStr)
    }

    return {
      success: true as const,
      results,
      persisted,
      message,
    }
  } catch (error: any) {
    const errorMessage = scrubConnectionString(
      error?.message ?? 'Unknown migration error.',
      connStr
    )

    console.error('Error applying migrations:', errorMessage)

    return {
      success: false as const,
      error: errorMessage,
    }
  }
})
