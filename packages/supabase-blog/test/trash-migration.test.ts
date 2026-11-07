import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The text of the migration. Like the other migration tests of this layer, it checks the SQL, not
// a database. The copy test of the plan ran the file on a Postgres copy (PGlite), two times.
const sql = readFileSync(
  join(__dirname, '..', 'db', 'migrations', '009_trash.sql'),
  'utf8'
)
  .replace(/--.*$/gm, '')
  .replace(/\s+/g, ' ')

const TABLES = ['posts', 'tags', 'categories', 'authors']

describe('009_trash.sql', () => {
  it('adds deleted_at and a partial index to each table, safe to run again', () => {
    for (const table of TABLES) {
      expect(sql).toContain(
        `alter table public.${table} add column if not exists deleted_at timestamp with time zone null;`
      )
      expect(sql).toContain(
        `create index if not exists idx_${table}_deleted_at on public.${table} (deleted_at) where deleted_at is not null;`
      )
    }
  })

  it('hides a trashed post from visitors and readers, and shows the trash to posts:delete', () => {
    expect(sql).toContain(
      `create policy "Allow public read of published posts" on public.posts for select to anon using (status = 'published' and deleted_at is null);`
    )
    expect(sql).toContain(
      `using ( (status = 'published' and deleted_at is null) or public.has_capability('posts:read_drafts') or (deleted_at is not null and public.has_capability('posts:delete')) );`
    )
  })

  it('lets posts:delete change the trash state only, through a guard for the authenticated role', () => {
    expect(sql).toContain(
      `create policy "Allow posts:delete trash on posts" on public.posts for update to authenticated using (public.has_capability('posts:delete')) with check (public.has_capability('posts:delete'));`
    )
    expect(sql).toContain(
      `if current_user = 'authenticated' and not public.has_capability('posts:publish')`
    )
    expect(sql).toContain(
      `(to_jsonb(new) - 'deleted_at' - 'updated_at') is distinct from (to_jsonb(old) - 'deleted_at' - 'updated_at')`
    )
    expect(sql).toContain(
      'revoke execute on function public.posts_trash_only_guard() from public, anon, authenticated;'
    )
    expect(sql).toContain(
      'create trigger posts_trash_only_guard before update on public.posts for each row execute function public.posts_trash_only_guard();'
    )
  })

  it('hides trashed terms and authors from everyone but their managers', () => {
    for (const [table, capability] of [
      ['tags', 'terms:manage'],
      ['categories', 'terms:manage'],
      ['authors', 'authors:manage'],
    ]) {
      expect(sql).toContain(
        `create policy "Allow public read of ${table}" on public.${table} for select to anon, authenticated using (deleted_at is null);`
      )
      expect(sql).toContain(
        `on public.${table} for select to authenticated using (deleted_at is not null and public.has_capability('${capability}'));`
      )
    }
  })

  it('drops each policy before it creates it, and changes no data', () => {
    const created = sql.match(/create policy "[^"]+"/g) ?? []
    for (const policy of created) {
      const name = policy.slice('create policy '.length)
      expect(sql).toContain(`drop policy if exists ${name}`)
    }
    expect(sql).not.toMatch(
      /drop (table|column)|truncate|delete from|update public\./i
    )
  })
})
