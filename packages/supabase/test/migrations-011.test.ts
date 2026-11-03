import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { splitStatements } from '../server/utils/sql'

const sql = readFileSync(
  join(__dirname, '..', 'db', 'migrations', '011_content_revisions.sql'),
  'utf8'
)
// A statement keeps the comment lines before it, so strip them first.
const statements = splitStatements(sql).map((statement) =>
  statement
    .replace(/--.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/;$/, '')
)

describe('011_content_revisions.sql', () => {
  it('creates the table and its index, guarded', () => {
    expect(statements[0]).toMatch(
      /^create table if not exists public\.pluto_content_revisions \(/i
    )
    expect(
      statements.some((statement) =>
        /^create index if not exists pluto_content_revisions_item_idx on public\.pluto_content_revisions \(type, item_id, id desc\)$/i.test(
          statement
        )
      )
    ).toBe(true)
  })

  it('turns on RLS, with select, insert and delete policies, and no update policy', () => {
    expect(statements).toContain(
      'alter table public.pluto_content_revisions enable row level security'
    )
    const policies = statements.filter((statement) =>
      /^create policy/i.test(statement)
    )
    expect(policies.map((policy) => /for (\w+)/i.exec(policy)?.[1])).toEqual([
      'select',
      'insert',
      'delete',
    ])
    expect(policies[1]).toMatch(/author_id = auth\.uid\(\)/)
    for (const policy of policies) {
      expect(policy).toMatch(/public\.has_capability\(capability\)/)
    }
  })

  it('drops each policy first, so it is safe to run twice', () => {
    expect(
      statements.filter((statement) => /^drop policy if exists/i.test(statement))
    ).toHaveLength(3)
  })
})
