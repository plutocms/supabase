import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// `#shared` resolves to the `shared/` folder of the app that extends this layer, not to the
// layer's own folder. A layer file that imports its own types through `#shared` breaks the
// typecheck of every app. Only the Supabase schema may use it: the app owns the schema.
const ALLOWED = new Set(['#shared/types/supabase'])

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory()
      ? files(path)
      : /\.(?:ts|vue)$/.test(name)
        ? [path]
        : []
  })
}

describe('#shared imports', () => {
  it('import only the app-owned Supabase schema', () => {
    const bad = ['app', 'server', 'shared'].flatMap(files).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/from '(#shared\/[^']+)'/g)]
        .map((match) => match[1]!)
        .filter((specifier) => !ALLOWED.has(specifier))
        .map((specifier) => `${file}: ${specifier}`)
    )

    expect(bad).toEqual([])
  })
})
