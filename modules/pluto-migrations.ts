import type { PlutoMigrationFile } from '../shared/types/migrations'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { createResolver, defineNuxtModule, getLayerDirectories } from 'nuxt/kit'

const schemaPattern = /^schema\.(.+)\.sql$/
const noTransactionPattern = /^--\s*pluto:no-transaction\b/

/**
 * Plain, deliberate string comparator for migration file names — ASCII
 * lexicographic order, so `001_...` sorts before `002_...` and so on.
 * Written out instead of relying on `Array.prototype.sort()`'s default
 * (which happens to do the same thing for ASCII names, but isn't a
 * documented guarantee to depend on).
 */
function compareFileNames(a: string, b: string): number {
  if (a < b) {
    return -1
  }
  if (a > b) {
    return 1
  }
  return 0
}

/**
 * Derives a layer's key from its `package.json` `name` field, stripping
 * any `@scope/` prefix. `@plutocms/supabase` always maps to the literal
 * key `core` — every deployed site's ledger already has rows with
 * `layer_name = 'core'`. Falls back to the layer directory's own name
 * when `package.json` is missing or unreadable.
 */
function deriveLayerKey(layerRoot: string): string {
  try {
    const pkgRaw = readFileSync(join(layerRoot, 'package.json'), 'utf-8')
    const pkg = JSON.parse(pkgRaw) as { name?: string }

    if (typeof pkg.name === 'string' && pkg.name.length > 0) {
      if (pkg.name === '@plutocms/supabase') {
        return 'core'
      }
      return pkg.name.replace(/^@[^/]+\//, '')
    }
  } catch {
    // package.json missing or unreadable — fall back to the directory name.
  }

  return basename(layerRoot)
}

function computeChecksum(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex').slice(0, 16)
}

/**
 * True when the file's first non-blank line is a `-- pluto:no-transaction`
 * directive.
 */
function detectNoTransaction(content: string): boolean {
  const firstNonBlankLine = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0)

  return firstNonBlankLine ? noTransactionPattern.test(firstNonBlankLine) : false
}

function readMigrationFile(dir: string, fileName: string, name: string): PlutoMigrationFile {
  const content = readFileSync(join(dir, fileName), 'utf-8')

  return {
    name,
    sql: content,
    checksum: computeChecksum(content),
    noTransaction: detectNoTransaction(content),
  }
}

/**
 * Discovers `db/migrations/*.sql` (or, for a layer not yet converted, the
 * legacy `public/schema.sql` / `public/schema.[name].sql`) across all Nuxt
 * layers, reads their content at build time, and populates runtimeConfig
 * so the migrations engine can apply them at server startup.
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
    const layerMigrations: Record<string, PlutoMigrationFile[]> = {}

    // Keeps the first-discovered layer for a given key (getLayerDirectories
    // orders the user/project layer first), and warns once when a later
    // layer's key collides with one already discovered.
    function assignLayer(layerKey: string, files: PlutoMigrationFile[]): void {
      if (layerMigrations[layerKey]) {
        console.warn(
          `[pluto-migrations] Layer key "${layerKey}" was already discovered from another layer. Keeping the first one, ignoring this one.`
        )
        return
      }
      layerMigrations[layerKey] = files
    }

    for (const layer of layerDirs) {
      const migrationsDir = join(layer.root, 'db/migrations')

      if (existsSync(migrationsDir)) {
        let fileNames: string[] = []
        try {
          fileNames = readdirSync(migrationsDir).filter((file) =>
            file.endsWith('.sql')
          )
        } catch {
          console.error(
            `[pluto-migrations] Failed to read migrations directory: ${migrationsDir}`
          )
          continue
        }

        fileNames.sort(compareFileNames)

        const files: PlutoMigrationFile[] = []
        for (const fileName of fileNames) {
          try {
            files.push(readMigrationFile(migrationsDir, fileName, fileName))
          } catch {
            console.error(
              `[pluto-migrations] Failed to read migration file: ${fileName}`
            )
          }
        }

        assignLayer(deriveLayerKey(layer.root), files)
        continue
      }

      // Legacy fallback for a layer not yet converted to db/migrations/,
      // exactly as before: a single public/schema.sql (always key `core`)
      // and/or public/schema.[name].sql (key comes from the file name, not
      // package.json — this keeps working for an unconverted layer without
      // requiring it to match its package name).
      const publicDir = join(layer.root, 'public')

      if (!existsSync(publicDir)) {
        continue
      }

      let publicFiles: string[] = []
      try {
        publicFiles = readdirSync(publicDir)
      } catch {
        continue
      }

      for (const fileName of publicFiles) {
        if (fileName === 'schema.sql') {
          try {
            assignLayer('core', [
              readMigrationFile(publicDir, fileName, '001_baseline.sql'),
            ])
          } catch {
            console.error(
              `[pluto-migrations] Failed to read schema file: ${fileName}`
            )
          }
          continue
        }

        const match = fileName.match(schemaPattern)
        if (match?.[1]) {
          try {
            assignLayer(match[1], [
              readMigrationFile(publicDir, fileName, '001_baseline.sql'),
            ])
          } catch {
            console.error(
              `[pluto-migrations] Failed to read schema file: ${fileName}`
            )
          }
        }
      }
    }

    // Populate runtimeConfig with every layer's ordered migration files.
    // Nuxt's schema inference narrows this to a literal shape based on
    // whatever layer keys and file shapes happen to be discovered in a
    // given project (see the `RuntimeConfig` augmentation in
    // shared/types/runtime-config.d.ts, which isn't visible from this
    // module-context tsconfig), so the assignment is cast to the intended
    // general shape. That inferred shape's array elements don't carry
    // enough structure for a direct cast, hence the `unknown` step.
    ;(
      nuxt.options.runtimeConfig as unknown as {
        plutoLayerMigrations: Record<string, PlutoMigrationFile[]>
      }
    ).plutoLayerMigrations = layerMigrations

    const layerKeys = Object.keys(layerMigrations)
    if (layerKeys.length > 0) {
      console.warn(
        `[pluto-migrations] Discovered layer migrations: ${layerKeys
          .map((key) => `${key} (${layerMigrations[key]!.length} file(s))`)
          .join(', ')}`
      )
    }
  },
})
