import type { PlutoMigrationFile } from '../../../shared/types/migrations'
import postgres from 'postgres'
import { persistDatabaseUrl } from '../../utils/env-file'
import { runPendingMigrations } from '../../utils/migrations'
import { scrubConnectionString } from '../../utils/scrub-connection-string'

interface Payload {
  connectionString: string
}

export default defineEventHandler(async (event) => {
  // An already-configured DATABASE_URL means setup has already completed.
  // This route is reachable with no admin session — no admin can exist
  // before setup creates the profiles table — so once real setup has run,
  // this check is the only thing stopping anyone from re-running it against
  // an arbitrary database. Mirrors the same precedence rule in
  // server/api/migrations/run.post.ts, which calls it "the whole security
  // model for this endpoint."
  if (process.env.DATABASE_URL) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Setup has already been completed.',
    })
  }

  const body = await readBody<Payload>(event)

  const config = useRuntimeConfig()
  // Nuxt's schema inference narrows `plutoLayerMigrations` to whatever
  // layer keys and file shapes it happened to observe at build time (see
  // the `RuntimeConfig` augmentation in shared/types/runtime-config.d.ts),
  // so the read is cast back to the intended general shape.
  const layers = (config.plutoLayerMigrations ?? {}) as unknown as Record<
    string,
    PlutoMigrationFile[]
  >

  // The core layer's migrations are discovered and embedded at build time
  // by the pluto-migrations module, exactly like every other layer — see
  // modules/pluto-migrations.ts. Reading it from there instead of fetching
  // it over HTTP means this route needs no `baseUrl` from the caller, and
  // can no longer be made to fetch or execute SQL from an arbitrary origin.
  if (!layers.core?.length) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Core schema not found. Reinstall @plutocms/supabase and restart the dev server.',
    })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase URL or Key is not defined in environment variables.'
    )
  }

  const connectionString = body.connectionString

  try {
    // core must apply before every other layer — a layer's migrations may
    // reference core objects (public.profiles, public.is_admin()).
    // runPendingMigrations guarantees this ordering itself.
    const layerResults = await runPendingMigrations({
      connectionString,
      layers,
    })

    const coreResult = layerResults.find((layer) => layer.layerName === 'core')

    // Only mark first_setup complete once the core layer's own migrations
    // are known good. A single failing extra layer must not block this —
    // core already succeeded, so the wizard can still hand off to sign-up —
    // but a failed core layer must not flip first_setup, since the base
    // schema (profiles, healthcheck, and so on) may be incomplete.
    if (coreResult && !coreResult.failed) {
      const sql = postgres(connectionString, { max: 1 })
      try {
        await sql.unsafe(
          `UPDATE public.healthcheck SET config_value = 'false' WHERE config_name = 'first_setup'`
        )
      } finally {
        await sql.end()
      }
    }

    // Deliberate runtime mutation: the connection string just proved
    // itself against the database, so make it available to
    // getConnectionString() for the rest of this process life, with no
    // server restart needed.
    process.env.DATABASE_URL = connectionString

    // Persist connection string to .env for future layer migrations. This
    // must stay the very last thing this handler does — see "The
    // dev-server restart on first save" in
    // .claude/skills/layer-migrations/SKILL.md.
    const persisted = await persistDatabaseUrl(connectionString)

    return {
      success: true,
      message: 'Database setup completed successfully.',
      layers: layerResults,
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
  }
})
