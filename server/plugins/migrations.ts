import { runLayerMigration } from '../utils/migrations'

export default defineNitroPlugin(async () => {
  // Only run if DATABASE_URL is configured (setup already completed)
  if (!process.env.DATABASE_URL) {
    return
  }

  const config = useRuntimeConfig()
  const layerSchemas: Record<string, string> =
    (config as any).plutoLayerSchemas ?? {}

  const layerNames = Object.keys(layerSchemas)

  if (layerNames.length === 0) {
    return
  }

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
})
