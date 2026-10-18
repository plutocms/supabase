import { readdirSync, readFileSync } from 'node:fs'
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
