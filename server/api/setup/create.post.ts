import postgres from 'postgres'
import { persistDatabaseUrl } from '../../utils/env-file'
import { runLayerMigration } from '../../utils/migrations'
import { scrubConnectionString } from '../../utils/scrub-connection-string'
import { splitStatements } from '../../utils/sql'

interface Payload {
  baseUrl: string
  connectionString: string
}

interface LayerResult {
  layerName: string
  status: 'applied' | 'skipped' | 'failed'
  error?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Payload>(event)

  let schema = await $fetch<string | Blob>('/schema.sql', {
    baseURL: body.baseUrl,
  })

  if (typeof schema !== 'string') {
    schema = await schema.text()
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase URL or Key is not defined in environment variables.'
    )
  }

  const connectionString = body.connectionString

  const sql = postgres(connectionString)

  try {
    const statements = splitStatements(schema)

    for (const statement of statements) {
      await sql.unsafe(statement)
    }

    // Mark first_setup as complete
    await sql.unsafe(
      `UPDATE public.healthcheck SET config_value = 'false' WHERE config_name = 'first_setup'`
    )

    // Record the core schema migration
    await sql.unsafe(
      `INSERT INTO public.pluto_migrations (layer_name)
       VALUES ('core')
       ON CONFLICT (layer_name) DO NOTHING`
    )

    // Apply every extra layer's schema too. The core schema must run first
    // (a layer schema may depend on a core object), so this loop stays
    // after the core-schema block above. A single failing layer must not
    // fail the whole wizard — the core schema already succeeded and
    // first_setup is already 'false', so this loop reports per-layer
    // failures instead of throwing.
    const config = useRuntimeConfig()
    const layerSchemas: Record<string, string> = config.plutoLayerSchemas ?? {}

    const layers: LayerResult[] = []

    for (const [layerName, schemaSql] of Object.entries(layerSchemas)) {
      if (!schemaSql) {
        continue
      }

      const result = await runLayerMigration({
        layerName,
        schemaSql,
        connectionString,
      })

      if (result.success) {
        layers.push({
          layerName,
          status: result.skipped ? 'skipped' : 'applied',
        })
      } else {
        const message = scrubConnectionString(
          result.error ?? 'Unknown migration error.',
          connectionString
        )

        console.error(`Layer migration failed [${layerName}]:`, message)

        layers.push({ layerName, status: 'failed', error: message })
      }
    }

    // Deliberate runtime mutation: the connection string just proved
    // itself against the database, so make it available to
    // getConnectionString() for the rest of this process life, with no
    // server restart needed.
    process.env.DATABASE_URL = connectionString

    // Persist connection string to .env for future layer migrations
    const persisted = await persistDatabaseUrl(connectionString)

    return {
      success: true,
      message: 'Database setup completed successfully.',
      layers,
      persisted,
    }
  } catch (error: any) {
    const message = scrubConnectionString(
      error.message ?? 'Unknown error.',
      connectionString
    )

    console.error('Error setting up the database:', message)

    return {
      success: false,
      error: message,
    }
  } finally {
    sql.end()
  }
})
