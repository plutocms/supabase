import { execFile } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * Resolves the local `supabase` CLI binary from node_modules/.bin so
 * generation works from within the Nitro dev server without relying on
 * `bunx`/`npx` (and without requiring `supabase login`, since we connect
 * directly via --db-url).
 */
function resolveSupabaseBin(rootDir: string): string {
  // On Windows, npm installs `supabase.cmd` and Bun installs `supabase.exe`.
  const binNames = process.platform === 'win32'
    ? ['supabase.cmd', 'supabase.exe']
    : ['supabase']
  const localBin = binNames
    .map((name) => join(rootDir, 'node_modules/.bin', name))
    .find((path) => existsSync(path))
  return localBin ?? 'supabase'
}

// The block, with its leading comment lines. The block has no nested braces.
const INTERNAL_BLOCK = /(?:^[ \t]*\/\/[^\n]*\n)*^[ \t]*__InternalSupabase:\s*\{[^{}]*\}[ \t]*\n/m
// The block itself. The name alone is not enough: the output also has it in
// `Omit<Database, '__InternalSupabase'>`.
const HAS_BLOCK = /^[ \t]*__InternalSupabase:\s*\{/m
const DATABASE_OPEN = /^export type Database = \{[ \t]*\n/m

/**
 * Keeps the `__InternalSupabase` block of the existing types file.
 *
 * The `--db-url` mode of the Supabase CLI does not write this block. It
 * holds the PostgREST version that supabase-js reads for its typings. When
 * the new output has no block and the existing file has one, this function
 * copies the existing block into the new output. In every other case it
 * returns the new output as it is.
 */
export function keepInternalSupabase(
  next: string,
  existing: string | null
): string {
  if (!existing || HAS_BLOCK.test(next)) {
    return next
  }

  const block = existing.match(INTERNAL_BLOCK)?.[0]
  const open = next.match(DATABASE_OPEN)

  if (!block || !open || open.index === undefined) {
    return next
  }

  const at = open.index + open[0].length
  // The CLI writes a whitespace-only line after the opening brace. After the
  // block it would stay as a blank line, so remove it.
  const rest = next.slice(at).replace(/^(?:[ \t]*\n)+/, '')

  return next.slice(0, at) + block + rest
}

/**
 * Imports a package from the app's node_modules (resolved from `rootDir`).
 */
async function importFromApp(rootDir: string, name: string) {
  const entry = createRequire(join(rootDir, 'package.json')).resolve(name)
  const mod = await import(pathToFileURL(entry).href)
  return mod.default ?? mod
}

/**
 * Fixes the text with the ESLint of the app. It resolves ESLint and the
 * app's config from `rootDir`. It returns the text unchanged when the app
 * has no ESLint, when ESLint ignores the file, or when the fix fails.
 */
async function fixWithAppEslint(
  rootDir: string,
  filePath: string,
  text: string
): Promise<string> {
  try {
    const { ESLint } = await importFromApp(rootDir, 'eslint')
    const eslint = new ESLint({ cwd: rootDir, fix: true })
    const [result] = await eslint.lintText(text, { filePath })

    return result?.output ?? text
  } catch {
    return text
  }
}

/**
 * Formats the text with the Prettier of the app. It resolves Prettier from
 * `rootDir`. It returns the text unchanged when the app has no Prettier or
 * when the format fails.
 */
async function formatWithAppPrettier(
  rootDir: string,
  filePath: string,
  text: string
): Promise<string> {
  try {
    const api = await importFromApp(rootDir, 'prettier')
    const options = (await api.resolveConfig(filePath)) ?? {}

    return await api.format(text, { ...options, filepath: filePath })
  } catch {
    return text
  }
}

/**
 * Regenerates the Supabase `Database` types from the live database schema
 * and writes them to <rootDir>/shared/types/supabase.ts, only touching the
 * file if the content actually changed (avoids needless dev-server reloads).
 *
 * Never throws — failures are logged and swallowed so this can safely run
 * as a side effect of the migrations plugin without breaking server boot.
 */
export async function regenerateSupabaseTypes(
  rootDir: string,
  connectionString?: string
): Promise<void> {
  const connStr = connectionString ?? process.env.DATABASE_URL

  if (!connStr) {
    console.warn(
      '[typegen] Skipping Supabase type generation: no DATABASE_URL configured.'
    )
    return
  }

  const targetPath = join(rootDir, 'shared/types/supabase.ts')

  try {
    const { stdout } = await execFileAsync(
      resolveSupabaseBin(rootDir),
      ['gen', 'types', 'typescript', '--db-url', connStr, '--schema', 'public'],
      { maxBuffer: 1024 * 1024 * 16 }
    )

    if (!stdout.trim()) {
      console.warn('[typegen] Supabase CLI returned no output, skipping write.')
      return
    }

    const existing = existsSync(targetPath)
      ? readFileSync(targetPath, 'utf-8')
      : null

    // The same steps as a usual `lint:fix`: ESLint first, then Prettier. So
    // an unchanged schema gives the same text as the committed file.
    const fixed = await fixWithAppEslint(
      rootDir,
      targetPath,
      keepInternalSupabase(stdout, existing)
    )
    const processed = await formatWithAppPrettier(rootDir, targetPath, fixed)

    if (existing === processed) {
      return
    }

    writeFileSync(targetPath, processed, 'utf-8')
    console.warn(`[typegen] Regenerated Supabase types at ${targetPath}`)
  } catch (error) {
    console.warn('[typegen] Failed to regenerate Supabase types:', error)
  }
}
