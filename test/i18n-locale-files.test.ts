import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Checks every locale file of this layer against en: same keys, same
// placeholders, same plural forms. A new language is checked by adding its file.
const dir = join(__dirname, '..', 'i18n', 'locales')
const codes = readdirSync(dir)
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.slice(0, -'.json'.length))

type FlatMessages = Record<string, string>

function flatten(
  value: unknown,
  prefix = '',
  out: FlatMessages = {}
): FlatMessages {
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key

    if (typeof child === 'string') {
      out[path] = child
    } else {
      flatten(child, path, out)
    }
  }

  return out
}

const locales: Record<string, FlatMessages> = {}
for (const code of codes) {
  locales[code] = flatten(
    JSON.parse(readFileSync(join(dir, `${code}.json`), 'utf8'))
  )
}

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)]
    .map((match) => match[1]!)
    .toSorted()
}

function pluralForms(message: string): number {
  return message.split(' | ').length
}

describe('supabase locale files', () => {
  it('include en and pt-BR', () => {
    expect(codes).toContain('en')
    expect(codes).toContain('pt-BR')
  })

  for (const code of codes.filter((name) => name !== 'en')) {
    describe(code, () => {
      it('has every key of en, and no other key', () => {
        expect(Object.keys(locales[code]!).toSorted()).toEqual(
          Object.keys(locales.en!).toSorted()
        )
      })

      it('uses the same placeholders as en for each key', () => {
        for (const [key, message] of Object.entries(locales.en!)) {
          expect(placeholders(locales[code]![key] ?? ''), key).toEqual(
            placeholders(message)
          )
        }
      })

      it('has the same number of plural forms as en for each key', () => {
        for (const [key, message] of Object.entries(locales.en!)) {
          expect(pluralForms(locales[code]![key] ?? ''), key).toBe(
            pluralForms(message)
          )
        }
      })
    })
  }

  for (const code of codes) {
    it(`${code} has no empty value`, () => {
      for (const [key, message] of Object.entries(locales[code]!)) {
        expect(message.trim(), key).not.toBe('')
      }
    })

    it(`${code} has only the supabase namespace at the top`, () => {
      const namespaces = new Set(
        Object.keys(locales[code]!).map((key) => key.split('.')[0]!)
      )

      expect([...namespaces]).toEqual(['supabase'])
    })
  }
})

// Usage scan. Every literal key in the code must exist in a locale file. A key
// that the code builds at run time is invisible to this scan, so keep such
// keys as full literals (for example in a map), as `AUTH_ERROR_KEYS` does.
const root = join(__dirname, '..')

function sourceFiles(folder: string): string[] {
  const files: string[] = []

  for (const name of readdirSync(folder)) {
    const path = join(folder, name)

    if (statSync(path).isDirectory()) {
      files.push(...sourceFiles(path))
    } else if (/\.(?:ts|vue)$/.test(name) && !name.endsWith('.d.ts')) {
      files.push(path)
    }
  }

  return files
}

const KEY_LITERAL =
  /(['"`])((?:supabase|pluto)\.[\w-]+(?:\.[\w-]+)+)\1/g

function usedKeys(namespace: 'supabase' | 'pluto'): Map<string, string[]> {
  const used = new Map<string, string[]>()

  for (const folder of ['app', 'server', 'shared']) {
    for (const file of sourceFiles(join(root, folder))) {
      for (const match of readFileSync(file, 'utf8').matchAll(KEY_LITERAL)) {
        const key = match[2]!

        if (key.startsWith(`${namespace}.`)) {
          used.set(key, [...(used.get(key) ?? []), file])
        }
      }
    }
  }

  return used
}

describe('translation keys used in the code', () => {
  it('finds a useful number of supabase keys', () => {
    expect(usedKeys('supabase').size).toBeGreaterThan(100)
  })

  it('has every supabase.* key in en.json', () => {
    const missing = [...usedKeys('supabase')]
      .filter(([key]) => !(key in locales.en!))
      .map(([key, files]) => `${key} (${files[0]})`)

    expect(missing).toEqual([])
  })

  it('has every pluto.* key in the en.json of @plutocms/pluto', () => {
    const plutoEn = flatten(
      JSON.parse(
        readFileSync(
          join(
            root,
            'node_modules',
            '@plutocms',
            'pluto',
            'i18n',
            'locales',
            'en.json'
          ),
          'utf8'
        )
      )
    )
    const missing = [...usedKeys('pluto')]
      .filter(([key]) => !(key in plutoEn))
      .map(([key, files]) => `${key} (${files[0]})`)

    expect(missing).toEqual([])
  })

  it('uses every en.json key somewhere in the code', () => {
    const used = usedKeys('supabase')
    const unused = Object.keys(locales.en!).filter((key) => !used.has(key))

    expect(unused).toEqual([])
  })
})
