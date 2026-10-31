import type { PlutoMigrationFile } from '../../shared/types/migrations'
import { runPendingMigrations } from '../utils/migrations'
import { regenerateSupabaseTypes } from '../utils/typegen'

export default defineNitroPlugin(async () => {
  // Only run if DATABASE_URL is configured (setup already completed)
  if (!process.env.DATABASE_URL) {
    return
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

  if (Object.keys(layers).length === 0) {
    return
  }

  let anyApplied = false

  try {
    const layerResults = await runPendingMigrations({
      connectionString: process.env.DATABASE_URL,
      layers,
    })

    for (const layer of layerResults) {
      for (const result of layer.results) {
        const label = `${result.layerName}/${result.migrationName}`

        if (result.status === 'skipped') {
          console.warn(`[migrations] ${label} already applied, skipped.`)
        } else if (result.status === 'applied') {
          console.warn(`[migrations] ${label} migrated successfully.`)
          anyApplied = true
        } else {
          console.error(`[migrations] ${label} failed:`, result.error)
        }
      }
    }
  } catch (error) {
    console.error('[migrations] Error running pending migrations:', error)
  }

  // Regenerate Database types from the live schema whenever a migration
  // file was newly applied, so `Database` stays in sync without a manual
  // step.
  if (import.meta.dev && anyApplied && config.plutoRootDir) {
    await regenerateSupabaseTypes(config.plutoRootDir)
  }
})
