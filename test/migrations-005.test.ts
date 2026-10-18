import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { splitStatements } from '../server/utils/sql'

const sql = readFileSync(
  join(__dirname, '..', 'db', 'migrations', '005_profile_locale.sql'),
  'utf8'
)
// A statement keeps the comment lines before it, so strip them first.
const statements = splitStatements(sql).map((statement) =>
  statement
    .replace(/^--.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
)

function find(pattern: RegExp): string | undefined {
  return statements.find((statement) => pattern.test(statement))
}

describe('005_profile_locale.sql', () => {
  it('adds a nullable locale column, guarded', () => {
    const statement = find(/^alter table public\.profiles add column/i)

    expect(statement).toMatch(/add column if not exists locale text;$/i)
    expect(statement).not.toMatch(/not null|default/i)
  })

  it('adds the format check guarded, not valid, then validates it', () => {
    const guarded = find(/^do \$\$/i)

    expect(guarded).toMatch(/if not exists/i)
    expect(guarded).toMatch(/add constraint profiles_locale_format/i)
    expect(guarded).toMatch(/not valid;/i)
    expect(guarded).toContain(String.raw`'^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'`)
    expect(
      find(
        /^alter table public\.profiles validate constraint profiles_locale_format/i
      )
    ).toBeDefined()
  })

  it('does not restrict the check to a fixed list of languages', () => {
    expect(sql).not.toMatch(/locale in \(/i)
  })

  it('creates set_my_locale as a security definer with an empty search path', () => {
    const statement = find(/^create or replace function public\.set_my_locale/i)

    expect(statement).toMatch(/\(new_locale text\)/i)
    expect(statement).toMatch(/returns void/i)
    expect(statement).toMatch(/security definer set search_path = ''/i)
    expect(statement).toMatch(
      /update public\.profiles set locale = new_locale, updated_at = now\(\) where id = auth\.uid\(\)/i
    )
  })

  it('revokes execute from public and anon, and grants it to authenticated', () => {
    expect(
      find(
        /^revoke execute on function public\.set_my_locale\(text\) from public, anon;$/i
      )
    ).toBeDefined()
    expect(
      find(
        /^grant execute on function public\.set_my_locale\(text\) to authenticated;$/i
      )
    ).toBeDefined()
  })

  it('adds no RLS policy', () => {
    expect(sql).not.toMatch(/create policy/i)
    expect(sql).not.toMatch(/alter policy/i)
  })
})
