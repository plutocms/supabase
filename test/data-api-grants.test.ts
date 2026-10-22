import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ledgerDdl } from '../server/utils/ledger'

const dir = join(__dirname, '..', 'db', 'migrations')
const files = readdirSync(dir).filter((name) => name.endsWith('.sql'))

function stripComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
    .replace(/\s+/g, ' ')
}

function read(name: string): string {
  return stripComments(readFileSync(join(dir, name), 'utf8'))
}

const allSql = [...files.map(read), stripComments(ledgerDdl)].join('\n')

const GRANT = /grant ([a-z]+(?:, [a-z]+)*) on (?:table )?public\.(\w+) to ([a-z_]+(?:, [a-z_]+)*);/gi

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

describe('data API grants (core layer)', () => {
  const tables = [
    ...allSql.matchAll(
      /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/gi
    ),
  ].map((match) => match[1]!)
  const grants = parseGrants(allSql)

  it('finds the seven core tables', () => {
    expect([...new Set(tables)].sort()).toEqual([
      'healthcheck',
      'pluto_migrations',
      'profiles',
      'role_capabilities',
      'roles',
      'settings',
      'user_roles',
    ])
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
    for (const grant of grants) {
      for (const privilege of grant.privileges) {
        expect(privilege).not.toMatch(/^(truncate|references|trigger|all)/)
      }
    }
    expect(allSql).not.toMatch(
      /grant\s+(all|truncate|references|trigger)\b/i
    )
  })

  it('006 grants the exact matrix', () => {
    const crud = 'delete,insert,select,update'

    expect(matrix(read('006_data_api_grants.sql'))).toEqual({
      healthcheck: { anon: 'select', authenticated: 'select,update', service_role: crud },
      settings: { authenticated: 'insert,select,update', service_role: crud },
      profiles: { authenticated: 'select', service_role: crud },
      pluto_migrations: { authenticated: 'select', service_role: crud },
      roles: { authenticated: crud, service_role: crud },
      role_capabilities: { authenticated: crud, service_role: crud },
      user_roles: { authenticated: crud, service_role: crud },
    })
  })

  it('006 grants execute on the four functions', () => {
    const sql = read('006_data_api_grants.sql')

    expect(sql).toMatch(
      /grant execute on function public\.is_admin\(\) to authenticated, service_role;/i
    )
    expect(sql).toMatch(
      /grant execute on function public\.has_capability\(text\) to authenticated, service_role;/i
    )
    expect(sql).toMatch(
      /grant execute on function public\.my_capabilities\(\) to authenticated, service_role;/i
    )
    expect(sql).toMatch(
      /grant execute on function public\.set_my_locale\(text\) to authenticated;/i
    )
  })

  it('006 is safe to run twice: only grants', () => {
    const statements = read('006_data_api_grants.sql')
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean)

    for (const statement of statements) {
      expect(statement).toMatch(/^grant\s/i)
    }
  })
})

describe('007_restrict_staff_reads.sql', () => {
  const sql = read('007_restrict_staff_reads.sql')

  function policy(name: string): string {
    const match = sql.match(
      new RegExp(`create policy "${name}"[\\s\\S]*?;`, 'i')
    )

    return (match?.[0] ?? '').replace(/\s+/g, ' ')
  }

  it('drops each old policy and each new policy before it creates them', () => {
    const creates = [...sql.matchAll(/create policy "([^"]+)"\s+on\s+(\S+)/gi)]

    expect(creates).toHaveLength(4)
    for (const [, name, table] of creates) {
      expect(sql).toContain(`drop policy if exists "${name}" on ${table};`)
    }
    for (const old of [
      'Enable read access for authenticated users on settings on public.settings',
      'Enable read access for authenticated users on pluto_migrations on public.pluto_migrations',
      'Enable read access for authenticated users on roles on public.roles',
      'Enable read access for authenticated users on role_capabilities on public.role_capabilities',
    ]) {
      const [name, table] = old.split(' on public.')

      expect(sql).toContain(`drop policy if exists "${name}" on public.${table};`)
    }
  })

  it('settings: staff (at least one capability) read', () => {
    const text = policy('Enable read access for staff on settings')

    expect(text).toMatch(/on public\.settings for select/i)
    expect(text).toMatch(/to authenticated, dashboard_user/i)
    expect(text).toMatch(/exists \(select 1 from public\.my_capabilities\(\)\)/i)
    expect(text).not.toMatch(/using \(true\)/i)
  })

  it('pluto_migrations: admin read', () => {
    const text = policy('Enable read access for admins on pluto_migrations')

    expect(text).toMatch(/on public\.pluto_migrations for select/i)
    expect(text).toMatch(/to authenticated, dashboard_user/i)
    expect(text).toMatch(/public\.is_admin\(\)/i)
  })

  it('roles and role_capabilities: admin read', () => {
    for (const table of ['roles', 'role_capabilities']) {
      const text = policy(`Enable read access for admins on ${table}`)

      expect(text).toMatch(new RegExp(`on public\\.${table} for select`, 'i'))
      expect(text).toMatch(/to authenticated using \(public\.is_admin\(\)\)/i)
    }
  })

  it('adds no write policy and no grant', () => {
    expect(sql).not.toMatch(/for (insert|update|delete|all)/i)
    expect(sql).not.toMatch(/\bgrant\b/i)
  })
})
