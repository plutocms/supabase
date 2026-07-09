import { runLayerMigration } from '../utils/migrations'
import { regenerateSupabaseTypes } from '../utils/typegen'

export default defineNitroPlugin(async () => {
  // Only run if DATABASE_URL is configured (setup already completed)
  if (!process.env.DATABASE_URL) {
    return
  }

  const config = useRuntimeConfig()
  const layerSchemas = config.plutoLayerSchemas ?? {}

  const layerNames = Object.keys(layerSchemas)

  if (layerNames.length === 0) {
    return
  }

  let anyApplied = false

  for (const layerName of layerNames) {
    const schemaSql = layerSchemas[layerName]

    if (!schemaSql) {
      continue
    }

    try {
      const result = await runLayerMigration({
        layerName,
        schemaSql,
      })

      if (result.skipped) {
        console.warn(
          `[migrations] Layer "${layerName}" already applied, skipped.`
        )
      } else if (result.success) {
        console.warn(`[migrations] Layer "${layerName}" migrated successfully.`)
        anyApplied = true
      } else {
        console.error(`[migrations] Layer "${layerName}" failed:`, result.error)
      }
    } catch (error) {
      console.error(
        `[migrations] Error running migration for "${layerName}":`,
        error
      )
    }
  }

  // Regenerate Database types from the live schema whenever a layer schema
  // was newly applied, so `Database` stays in sync without a manual step.
  // Re-editing an already-applied layer schema is a no-op here (it's
  // recorded as `skipped`); use the `supabase-types` script to force a
  // refresh in that case.
  if (import.meta.dev && anyApplied && config.plutoRootDir) {
    await regenerateSupabaseTypes(config.plutoRootDir)
  }
})
