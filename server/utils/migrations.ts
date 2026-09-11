import postgres from 'postgres'
import { ensureLedger } from './ledger'
import { splitStatements } from './sql'

/**
 * Retrieves the database connection string from environment variables.
 * Stored in .env during initial setup.
 */
export function getConnectionString(): string | null {
  return process.env.DATABASE_URL ?? null
}

/**
 * Checks if a specific layer migration has already been applied.
 */
async function isMigrationApplied(
  sql: postgres.Sql,
  layerName: string
): Promise<boolean> {
  const result = await sql.unsafe(
    `SELECT 1 FROM public.pluto_migrations WHERE layer_name = $1`,
    [layerName]
  )
  return result.length > 0
}

/**
 * Records a migration as applied.
 *
 * `ensureLedger` (called below, before this) upgrades `pluto_migrations`
 * to the versioned, per-migration shape: `migration_name` is `not null`,
 * and the unique constraint is now `(layer_name, migration_name)`, not
 * `layer_name` alone. This engine still applies one monolithic schema
 * file per layer, so every row it writes uses the fixed migration name
 * `001_baseline.sql` — matching the name that same file gets once a layer
 * is converted to `db/migrations/` (see `db/migrations/001_baseline.sql`).
 */
async function recordMigration(
  sql: postgres.Sql,
  layerName: string
): Promise<void> {
  await sql.unsafe(
    `INSERT INTO public.pluto_migrations (layer_name, migration_name)
     VALUES ($1, $2)
     ON CONFLICT (layer_name, migration_name) DO NOTHING`,
    [layerName, '001_baseline.sql']
  )
}

interface LayerMigrationResult {
  success: boolean
  skipped?: boolean
  error?: string
}

/**
 * Runs a layer's schema SQL if not already applied.
 * Splits and executes statements, then records the migration.
 */
export async function runLayerMigration(opts: {
  layerName: string
  schemaSql: string
  connectionString?: string
}): Promise<LayerMigrationResult> {
  const connStr = opts.connectionString ?? getConnectionString()

  if (!connStr) {
    return {
      success: false,
      error: 'No DATABASE_URL configured. Re-run setup or add it to .env.',
    }
  }

  const sql = postgres(connStr)

  try {
    await ensureLedger(sql)

    const applied = await isMigrationApplied(sql, opts.layerName)
    if (applied) {
      return { success: true, skipped: true }
    }

    const statements = splitStatements(opts.schemaSql)

    for (const statement of statements) {
      await sql.unsafe(statement)
    }

    await recordMigration(sql, opts.layerName)

    return { success: true }
  } catch (error: any) {
    console.error(`Migration error [${opts.layerName}]:`, error)
    return { success: false, error: error.message }
  } finally {
    await sql.end()
  }
}
