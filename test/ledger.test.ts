import { describe, expect, it } from 'vitest'
import { ledgerDdl } from '../server/utils/ledger'
import { splitStatements } from '../server/utils/sql'

describe('ledgerDdl', () => {
  it('splits into 9 well-formed, semicolon-terminated statements', () => {
    const statements = splitStatements(ledgerDdl)

    expect(statements).toHaveLength(9)
    for (const statement of statements) {
      expect(statement.trim().endsWith(';')).toBe(true)
    }
  })

  it('creates the table with the composite unique constraint', () => {
    const [createTable] = splitStatements(ledgerDdl)

    expect(createTable).toMatch(
      /create table if not exists public\.pluto_migrations/
    )
    expect(createTable).toMatch(
      /constraint pluto_migrations_layer_migration_key unique \(layer_name, migration_name\)/
    )
  })

  it('adds migration_name and checksum as nullable columns first', () => {
    const statements = splitStatements(ledgerDdl)

    expect(
      statements.some((s) =>
        s.includes('add column if not exists migration_name text')
      )
    ).toBe(true)
    expect(
      statements.some((s) =>
        s.includes('add column if not exists checksum text')
      )
    ).toBe(true)
  })

  it('backfills migration_name before setting it not null', () => {
    const statements = splitStatements(ledgerDdl)

    const backfillIndex = statements.findIndex((s) =>
      s.includes('migration_name = \'001_baseline.sql\'')
    )
    const notNullIndex = statements.findIndex((s) =>
      s.includes('alter column migration_name set not null')
    )

    expect(backfillIndex).toBeGreaterThan(-1)
    expect(notNullIndex).toBeGreaterThan(backfillIndex)
  })

  it('drops the old single-column unique constraint', () => {
    const statements = splitStatements(ledgerDdl)

    expect(
      statements.some((s) =>
        s.includes('drop constraint if exists pluto_migrations_layer_key')
      )
    ).toBe(true)
  })

  it('guards the new composite constraint with a pg_constraint check', () => {
    const statements = splitStatements(ledgerDdl)

    const guarded = statements.find((s) =>
      s.includes('add constraint pluto_migrations_layer_migration_key')
    )

    expect(guarded).toBeDefined()
    expect(guarded).toContain('pg_constraint')
  })

  it('re-enables row level security and re-asserts the read policy idempotently', () => {
    const statements = splitStatements(ledgerDdl)

    expect(
      statements.some((s) => s.includes('enable row level security'))
    ).toBe(true)

    const policyStatement = statements.find((s) => s.includes('create policy'))

    expect(policyStatement).toBeDefined()
    expect(policyStatement).toContain('pg_policies')
  })
})
