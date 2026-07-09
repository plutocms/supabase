import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { createResolver, defineNuxtModule, getLayerDirectories } from 'nuxt/kit'

/**
 * Discovers schema.[layerName].sql files across all Nuxt layers,
 * reads their content at build time, and populates runtimeConfig
 * so the migrations plugin can run them at server startup.
 *
 * Also seeds the consuming app's shared/types/supabase.ts with a
 * re-export of this layer's own committed snapshot when the consumer
 * has none yet, so `Database` resolves to real types instead of
 * `unknown` on first run. A re-export (rather than a full copy) keeps
 * a single canonical `Database` declaration so Nuxt's shared-imports
 * scanning across layers doesn't see two conflicting definitions. The
 * runtime migration plugin overwrites this with a fully generated file
 * once real migrations run (see server/plugins/migrations.ts).
 */
export default defineNuxtModule({
  meta: {
    name: 'pluto-migrations',
    configKey: 'plutoMigrations',
  },

  setup(_options, nuxt) {
    // Let the runtime migration plugin know where the consumer's
    // project root is, so it can write the generated types file there.
    nuxt.options.runtimeConfig.plutoRootDir = nuxt.options.rootDir

    const consumerTypesPath = join(
      nuxt.options.rootDir,
      'shared/types/supabase.ts'
    )
    if (!existsSync(consumerTypesPath)) {
      // Resolve *this exact* @plutocms/supabase instance's own snapshot
      // (local-linked or npm-installed, whichever is actually running)
      // rather than a bare package specifier, which would re-resolve
      // through the consumer's own node_modules and could pick up a
      // different, possibly stale, copy of the package.
      const { resolve } = createResolver(import.meta.url)
      const ownTypesPath = resolve('../shared/types/supabase.ts')
      const consumerTypesDir = dirname(consumerTypesPath)
      let importSpecifier = relative(consumerTypesDir, ownTypesPath)
        .replace(/\\/g, '/')
        .replace(/\.ts$/, '')
      if (!importSpecifier.startsWith('.')) {
        importSpecifier = `./${importSpecifier}`
      }

      mkdirSync(consumerTypesDir, { recursive: true })
      writeFileSync(
        consumerTypesPath,
        `export * from '${importSpecifier}'\n`,
        'utf-8'
      )
      console.warn(
        '[pluto-migrations] Seeded shared/types/supabase.ts (re-exporting @plutocms/supabase types; no generated types found yet).'
      )
    }

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

    // Populate runtimeConfig with layer names and their SQL content.
    // Nuxt's schema inference narrows this to a literal shape based on
    // whatever layer keys were last observed in this project (see the
    // `RuntimeConfig` augmentation in shared/types/runtime-config.d.ts,
    // which isn't visible from this module-context tsconfig), so the
    // assignment is cast to the intended general shape.
    ;(nuxt.options.runtimeConfig as { plutoLayerSchemas: Record<string, string> }).plutoLayerSchemas =
      layerSchemas

    if (layerNames.length > 0) {
      console.warn(
        `[pluto-migrations] Discovered layer schemas: ${layerNames.join(', ')}`
      )
    }
  },
})
