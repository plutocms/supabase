import fs from 'node:fs'
import path from 'node:path'
import { cwd } from 'node:process'
import { $ } from 'bun'
import { consola } from 'consola'

const projectUrl = process.env.SUPABASE_URL
const projectId = projectUrl?.split('.supabase.co')[0]?.replace('https://', '')
const _path = path
  .resolve(cwd(), './shared/types/supabase.ts')
  .replace(/\\/g, '/')

;(async () => {
  consola.info(`Generating Supabase types for project: ${projectId}`)

  // Create file if it doesn't exist
  if (!fs.existsSync(_path)) {
    consola.info('Types file does not exist. Creating a new one.')

    fs.mkdirSync(path.dirname(_path), { recursive: true })
    fs.writeFileSync(_path, '', 'utf-8')
  }

  const args = [
    `--project-id=${projectId || ''}`,
    '--schema=public',
    '>',
    `"${_path}"`,
  ]

  try {
    await $`bunx supabase gen types typescript ${{ raw: args.join(' ') }}`
  } catch (error) {
    consola.error('Unhandled error:', error)
  }
})()
