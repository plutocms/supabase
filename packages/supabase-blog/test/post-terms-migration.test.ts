import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The text of the migration. Like the other migration tests of this layer, it checks the SQL, not
// a database. The copy test of the plan ran the file on a Postgres copy.
const sql = readFileSync(
  join(__dirname, '..', 'db', 'migrations', '007_post_terms.sql'),
  'utf8'
)
  .replace(/--.*$/gm, '')
  .replace(/\s+/g, ' ')

describe('007_post_terms.sql', () => {
  it.each(['tags', 'categories'])('creates %s, safe to run again', (table) => {
    expect(sql).toContain(`create table if not exists public.${table} (`)
    expect(sql).toContain(
      `alter table public.${table} enable row level security;`
    )
  })

  it.each([
    ['tag_ids', 'idx_posts_tag_ids'],
    ['category_ids', 'idx_posts_category_ids'],
  ])('adds %s as a bigint array with a GIN index', (column, index) => {
    expect(sql).toContain(
      `alter table public.posts add column if not exists ${column} bigint[] not null default '{}';`
    )
    expect(sql).toContain(
      `create index if not exists ${index} on public.posts using gin (${column});`
    )
  })

  it.each(['tags', 'categories'])(
    'lets anyone read %s and gates the writes on terms:manage',
    (table) => {
      expect(sql).toContain(
        `create policy "Allow public read of ${table}" on public.${table} for select to anon, authenticated using (true);`
      )

      for (const action of ['insert', 'update', 'delete']) {
        const policy = new RegExp(
          String.raw`create policy "Allow terms:manage ${action} on ${table}" on public\.${table} for ${action} to authenticated (?:using|with check) \(public\.has_capability\('terms:manage'\)\)`
        )

        expect(sql).toMatch(policy)
      }
    }
  )

  it('never gates a term on the post capabilities', () => {
    const policies = sql.match(/create policy .*?;/g) ?? []

    for (const policy of policies) {
      expect(policy).not.toContain('posts:')
    }
  })

  it('gives terms:manage to the roles that hold posts:publish', () => {
    expect(sql).toContain(
      `insert into public.role_capabilities (role_key, capability) select role_key, 'terms:manage' from public.role_capabilities where capability = 'posts:publish' on conflict do nothing;`
    )
  })

  it.each([
    ['tag', 'tags', 'tag_ids'],
    ['category', 'categories', 'category_ids'],
  ])(
    'removes a deleted %s from the posts with a security definer trigger',
    (name, table, column) => {
      const fn = `remove_deleted_${name}_from_posts`

      expect(sql).toContain(
        `create or replace function public.${fn}() returns trigger language plpgsql security definer set search_path = ''`
      )
      expect(sql).toContain(
        `set ${column} = array_remove(${column}, old.id) where ${column} @> array[old.id];`
      )
      expect(sql).toContain(
        `revoke execute on function public.${fn}() from public, anon, authenticated;`
      )
      expect(sql).toContain(
        `create trigger ${table}_remove_from_posts after delete on public.${table} for each row execute function public.${fn}();`
      )
    }
  )

  it('uses no destructive statement on existing data', () => {
    expect(sql).not.toMatch(/drop (table|column)|truncate|delete from/i)
  })
})
