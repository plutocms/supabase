import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const dir = join(__dirname, '..', 'db', 'migrations')
const files = readdirSync(dir).filter((name) => name.endsWith('.sql'))

function read(name: string): string {
  return readFileSync(join(dir, name), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
    .replace(/\s+/g, ' ')
}

const allSql = files.map(read).join('\n')

const GRANT =
  /grant ([a-z]+(?:, [a-z]+)*) on (?:table )?public\.(\w+) to ([a-z_]+(?:, [a-z_]+)*);/gi

interface Grant {
  privileges: string[]
  table: string
  roles: string[]
}

function parseGrants(sql: string): Grant[] {
  return [...sql.matchAll(GRANT)].map((match) => ({
    privileges: match[1]!.toLowerCase().split(/\s*,\s*/),
    table: match[2]!,
    roles: match[3]!.toLowerCase().split(/\s*,\s*/),
  }))
}

function matrix(sql: string): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {}

  for (const grant of parseGrants(sql)) {
    for (const role of grant.roles) {
      result[grant.table] ??= {}
      result[grant.table]![role] = grant.privileges.slice().sort().join(',')
    }
  }

  return result
}

describe('data API grants (supabase-blog)', () => {
  const tables = [
    ...allSql.matchAll(
      /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/gi
    ),
  ].map((match) => match[1]!)
  const grants = parseGrants(allSql)

  it('finds the tables of the layer', () => {
    expect([...new Set(tables)].sort()).toEqual(['posts'])
  })

  it('grants every created table to authenticated', () => {
    for (const table of new Set(tables)) {
      expect(
        grants.some(
          (grant) =>
            grant.table === table && grant.roles.includes('authenticated')
        ),
        table
      ).toBe(true)
    }
  })

  it('grants anon select only', () => {
    for (const grant of grants.filter((item) => item.roles.includes('anon'))) {
      expect(grant.privileges, grant.table).toEqual(['select'])
    }
  })

  it('never grants truncate, references, trigger or all', () => {
    expect(allSql).not.toMatch(/grant\s+(all|truncate|references|trigger)\b/i)
    for (const grant of grants) {
      for (const privilege of grant.privileges) {
        expect(privilege).not.toMatch(/^(truncate|references|trigger|all)/)
      }
    }
  })

  it('004_data_api_grants.sql grants the exact matrix', () => {
    const crud = 'delete,insert,select,update'
    const expected: Record<string, Record<string, string>> = {}

    for (const table of ['posts']) {
      expected[table] = {
        anon: 'select',
        authenticated: crud,
        service_role: crud,
      }
    }

    expect(matrix(read('004_data_api_grants.sql'))).toEqual(expected)
  })

  it('004_data_api_grants.sql only grants, so it is safe to run twice', () => {
    const statements = read('004_data_api_grants.sql')
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean)

    for (const statement of statements) {
      expect(statement).toMatch(/^grant\s/i)
    }
  })
})
