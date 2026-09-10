import { requireAdmin } from '../../utils/admin-guard'
import { persistDatabaseUrl } from '../../utils/env-file'
import { runLayerMigration } from '../../utils/migrations'
import { getMigrationStatus } from '../../utils/pending-migrations'
import { scrubConnectionString } from '../../utils/scrub-connection-string'
import { regenerateSupabaseTypes } from '../../utils/typegen'

interface Payload {
  connectionString?: string
}

interface LayerResult {
  layerName: string
  status: 'applied' | 'skipped' | 'failed'
  error?: string
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<Payload | undefined>(event)

  // Connection string precedence: an already-configured DATABASE_URL always
  // wins, and a body-supplied string is ignored completely in that case.
  // This is the whole security model for this endpoint — without it, any
  // admin could point the server at an arbitrary database host.
  const envConnectionString = process.env.DATABASE_URL
  const bodyConnectionString = body?.connectionString
  const usingBodyConnectionString = !envConnectionString

  const connStr = envConnectionString || bodyConnectionString

  if (!connStr) {
    return {
      success: false as const,
      needsConnectionString: true,
    }
  }

  const config = useRuntimeConfig()
  const layerSchemas: Record<string, string> = config.plutoLayerSchemas ?? {}

  const { pending } = await getMigrationStatus(event)

  const results: LayerResult[] = []
  let anyApplied = false
  // Tracks whether we've already committed a body-supplied connection
  // string to process.env for this request (done once, on first success).
  let connStrCommitted = false

  for (const layerName of pending) {
    const schemaSql = layerSchemas[layerName]

    if (!schemaSql) {
      continue
    }

    const result = await runLayerMigration({
      layerName,
      schemaSql,
      connectionString: connStr,
    })

    if (result.success) {
      results.push({
        layerName,
        status: result.skipped ? 'skipped' : 'applied',
      })

      if (!result.skipped) {
        anyApplied = true
      }

      if (usingBodyConnectionString && !connStrCommitted) {
        // Deliberate runtime mutation: a valid connection string just
        // proved itself against the database, so make it available to
        // getConnectionString() for the rest of this process life. No
        // server restart is needed for later requests to pick it up.
        process.env.DATABASE_URL = connStr
        connStrCommitted = true
      }
    } else {
      const message = scrubConnectionString(
        result.error ?? 'Unknown migration error.',
        connStr
      )

      console.error(`Migration failed [${layerName}]:`, message)

      results.push({ layerName, status: 'failed', error: message })
    }
  }

  // Nothing to persist when DATABASE_URL was already configured. Otherwise
  // only persist once a body-supplied string has proven itself valid.
  let persisted = !usingBodyConnectionString
  let message: string | undefined

  if (usingBodyConnectionString && connStrCommitted) {
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
})
