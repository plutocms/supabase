import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

/**
 * Writes (or updates) `DATABASE_URL` in the project's `.env` file.
 *
 * Reads the current file, replaces an existing `DATABASE_URL` line or
 * appends a new one, then writes it back. Never throws: a failure to read
 * or write is swallowed and reported as `false`, so a caller can still
 * report success for work that is already durably recorded elsewhere (for
 * example, an applied migration row) even when `.env` could not be
 * updated.
 *
 * Caveat: `process.cwd()` may not point at the project root in every
 * deployment (a production build can start from a different working
 * directory). This best-effort write can silently target the wrong file in
 * that case.
 */
export async function persistDatabaseUrl(
  connectionString: string
): Promise<boolean> {
  try {
    const envPath = resolve(process.cwd(), '.env')
    let envContent = ''

    try {
      envContent = await readFile(envPath, 'utf-8')
    } catch {
      // .env doesn't exist yet.
    }

    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(
        /^DATABASE_URL=.*$/m,
        `DATABASE_URL="${connectionString}"`
      )
    } else {
      // Ensure there's a trailing newline before appending.
      if (envContent.length > 0 && !envContent.endsWith('\n')) {
        envContent += '\n'
      }
      envContent += `DATABASE_URL="${connectionString}"\n`
    }

    await writeFile(envPath, envContent, 'utf-8')

    return true
  } catch (error) {
    console.error('Error persisting DATABASE_URL to .env:', error)

    return false
  }
}
