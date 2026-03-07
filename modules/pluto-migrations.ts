import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineNuxtModule, getLayerDirectories } from 'nuxt/kit'

/**
 * Discovers schema.[layerName].sql files across all Nuxt layers,
 * reads their content at build time, and populates runtimeConfig
 * so the migrations plugin can run them at server startup.
 */
export default defineNuxtModule({
  meta: {
    name: 'pluto-migrations',
    configKey: 'plutoMigrations',
  },

  setup(_options, nuxt) {
    const layerDirs = getLayerDirectories()
    const layerSchemas: Record<string, string> = {}
    const schemaPattern = /^schema\.(.+)\.sql$/

    for (const layer of layerDirs) {
      // Each layer may have a public/ directory with schema files
      const publicDir = join(layer.root, 'public')

      if (!existsSync(publicDir)) {
        continue
      }

      let files: string[] = []
      try {
        files = readdirSync(publicDir, 'utf-8')
      } catch {
        continue
      }

      for (const file of files) {
        // Skip the core schema
        if (file === 'schema.sql') {
          continue
        }

        const match = file.match(schemaPattern)
        if (match?.[1]) {
          const layerName = match[1]
          // Read SQL content at build time
          try {
            layerSchemas[layerName] = readFileSync(
              join(publicDir, file),
              'utf-8'
            )
          } catch {
            console.error(
              `[pluto-migrations] Failed to read schema file: ${file}`
            )
          }
        }
      }
    }

    const layerNames = Object.keys(layerSchemas)

    // Populate runtimeConfig with layer names and their SQL content
    nuxt.options.runtimeConfig.plutoLayerSchemas = layerSchemas

    if (layerNames.length > 0) {
      console.warn(
        `[pluto-migrations] Discovered layer schemas: ${layerNames.join(', ')}`
      )
    }
  },
})
