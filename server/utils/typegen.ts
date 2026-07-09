import { execFile } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * Resolves the local `supabase` CLI binary from node_modules/.bin so
 * generation works from within the Nitro dev server without relying on
 * `bunx`/`npx` (and without requiring `supabase login`, since we connect
 * directly via --db-url).
 */
function resolveSupabaseBin(rootDir: string): string {
  const binName = process.platform === 'win32' ? 'supabase.cmd' : 'supabase'
  const localBin = join(rootDir, 'node_modules/.bin', binName)
  return existsSync(localBin) ? localBin : 'supabase'
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

    if (existing === stdout) {
      return
    }

    writeFileSync(targetPath, stdout, 'utf-8')
    console.warn(`[typegen] Regenerated Supabase types at ${targetPath}`)
  } catch (error) {
    console.warn('[typegen] Failed to regenerate Supabase types:', error)
  }
}
