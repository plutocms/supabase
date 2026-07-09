import { cwd } from 'node:process'
import { consola } from 'consola'
import { regenerateSupabaseTypes } from '../server/utils/typegen'

const databaseUrl = process.env.DATABASE_URL
const projectUrl = process.env.SUPABASE_URL

;(async () => {
  if (databaseUrl) {
    consola.info('Generating Supabase types via DATABASE_URL...')
    await regenerateSupabaseTypes(cwd(), databaseUrl)
    return
  }

  if (!projectUrl) {
    consola.error(
      'Cannot generate Supabase types: neither DATABASE_URL nor SUPABASE_URL is set.'
    )
    return
  }

  consola.warn(
    'DATABASE_URL is not set; falling back to --project-id (requires `supabase login`).'
  )

  const projectId = projectUrl.split('.supabase.co')[0]?.replace('https://', '')
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const { writeFileSync } = await import('node:fs')
  const { join } = await import('node:path')

  consola.info(`Generating Supabase types for project: ${projectId}`)

  try {
    const { stdout } = await promisify(execFile)(
      'supabase',
      [
        'gen',
        'types',
        'typescript',
        `--project-id=${projectId}`,
        '--schema=public',
      ],
      { maxBuffer: 1024 * 1024 * 16 }
    )
    writeFileSync(join(cwd(), 'shared/types/supabase.ts'), stdout, 'utf-8')
    consola.success('Supabase types generated.')
  } catch (error) {
    consola.error('Unhandled error:', error)
  }
})()
