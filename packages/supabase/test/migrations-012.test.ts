import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { splitStatements } from '../server/utils/sql'

const sql = readFileSync(
  join(__dirname, '..', 'db', 'migrations', '012_content_backups.sql'),
  'utf8'
)
// A statement keeps the comment lines before it, so strip them first.
const statements = splitStatements(sql).map((statement) =>
  statement.replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim().replace(/;$/, '')
)

describe('012_content_backups.sql', () => {
  it('creates the table and its index, guarded', () => {
    expect(statements[0]).toMatch(
      /^create table if not exists public\.pluto_content_backups \(/i
    )
    expect(
      statements.some((statement) =>
        /^create index if not exists pluto_content_backups_user_idx on public\.pluto_content_backups \(user_id, updated_at desc\)$/i.test(
          statement
        )
      )
    ).toBe(true)
  })

  it('has the unique key, the key length check and the size check', () => {
    expect(statements[0]).toMatch(
      /constraint pluto_content_backups_item_key unique \(user_id, type, item_key\)/
    )
    expect(statements[0]).toMatch(
      /check \(char_length\(item_key\) between 1 and 500\)/
    )
    expect(statements[0]).toMatch(
      /check \(octet_length\(record::text\) <= 5000000\)/
    )
    expect(statements[0]).toMatch(
      /user_id uuid not null default auth\.uid\(\) references auth\.users \(id\) on delete cascade/
    )
  })

  it('turns on RLS, with an owner-only policy for each command', () => {
    expect(statements).toContain(
      'alter table public.pluto_content_backups enable row level security'
    )
    const policies = statements.filter((statement) =>
      /^create policy/i.test(statement)
    )
    expect(policies.map((policy) => /for (\w+)/i.exec(policy)?.[1])).toEqual([
      'select',
      'insert',
      'update',
      'delete',
    ])
    for (const policy of policies) {
      expect(policy).toMatch(/to authenticated/)
      expect(policy).toMatch(/user_id = \(select auth\.uid\(\)\)/)
    }
    // insert and update also check the new row.
    expect(policies[1]).toMatch(
      /with check \(user_id = \(select auth\.uid\(\)\)\)/
    )
    expect(policies[2]).toMatch(
      /with check \(user_id = \(select auth\.uid\(\)\)\)/
    )
  })

  it('drops each policy first, so it is safe to run twice', () => {
    expect(
      statements.filter((statement) =>
        /^drop policy if exists/i.test(statement)
      )
    ).toHaveLength(4)
  })

  it('grants CRUD to authenticated and service_role, and nothing to anon', () => {
    expect(statements).toContain(
      'grant select, insert, update, delete on public.pluto_content_backups to authenticated'
    )
    expect(statements).toContain(
      'grant select, insert, update, delete on public.pluto_content_backups to service_role'
    )
    expect(
      statements.some((statement) => /^grant .* to .*\banon\b/i.test(statement))
    ).toBe(false)
  })
})
