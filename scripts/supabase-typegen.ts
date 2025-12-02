import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { cwd } from 'node:process'
import { consola } from 'consola'

export async function generateSupabaseTypes() {
  const projectUrl = process.env.SUPABASE_URL
  const projectId = projectUrl
    ?.split('.supabase.co')[0]
    ?.replace('https://', '')
  const _path = path.resolve(cwd(), './shared/types/supabase.ts')

  consola.info(`Generating Supabase types for project: ${projectId}`)

  // Create file if it doesn't exist
  if (!fs.existsSync(_path)) {
    consola.info('Types file does not exist. Creating a new one.')

    fs.mkdirSync(path.dirname(_path), { recursive: true })
    fs.writeFileSync(_path, '', 'utf-8')
  }

  const args = [
    'gen',
    'types',
    'typescript',
    '--project-id',
    `${projectId || ''}`,
    '--schema',
    'public',
    '>',
    'shared/types/supabase.ts',
  ]

  try {
    execSync(`npx -y supabase ${args.join(' ')}`, { stdio: 'inherit' })

    consola.success('Supabase types generated successfully!')
  } catch (error) {
    consola.error('Error generating Supabase types:', error)
  }
}
