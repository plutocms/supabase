import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The text of the migration. Like the other migration tests of this layer, it checks the SQL, not
// a database. The copy test of the plan ran the file on a Postgres copy (PGlite).
const sql = readFileSync(
  join(__dirname, '..', 'db', 'migrations', '008_post_authors.sql'),
  'utf8'
)
  .replace(/--.*$/gm, '')
  .replace(/\s+/g, ' ')

describe('008_post_authors.sql', () => {
  it('creates authors with public columns only, safe to run again', () => {
    const table = /create table if not exists public\.authors \((.*?)\);/.exec(
      sql
    )?.[1]
    const columns = (table ?? '')
      .split(',')
      .map((part) => part.trim().split(' ')[0])
      .filter((name) => name !== 'constraint')

    expect(columns).toEqual([
      'id',
      'created_at',
      'updated_at',
      'name',
      'slug',
      'bio',
      'avatar',
    ])
    // A visitor reads every column: no user, email or role may be here.
    expect(table).not.toMatch(/user|email|role/i)
    expect(sql).toContain(
      'alter table public.authors enable row level security;'
    )
  })

  it('adds author_ids as a bigint array with a GIN index', () => {
    expect(sql).toContain(
      `alter table public.posts add column if not exists author_ids bigint[] not null default '{}';`
    )
    expect(sql).toContain(
      'create index if not exists idx_posts_author_ids on public.posts using gin (author_ids);'
    )
  })

  it('lets anyone read the authors and gates the writes on authors:manage', () => {
    expect(sql).toContain(
      'create policy "Allow public read of authors" on public.authors for select to anon, authenticated using (true);'
    )
    for (const action of ['insert', 'update', 'delete']) {
      expect(sql).toMatch(
        new RegExp(
          String.raw`create policy "Allow authors:manage ${action} on authors" on public\.authors for ${action} to authenticated (?:using|with check) \(public\.has_capability\('authors:manage'\)\)`
        )
      )
    }
  })

  it('gives authors:manage to the roles that hold posts:publish', () => {
    expect(sql).toContain(
      `insert into public.role_capabilities (role_key, capability) select role_key, 'authors:manage' from public.role_capabilities where capability = 'posts:publish' on conflict do nothing;`
    )
  })

  it('removes a deleted author from the posts with a security definer trigger', () => {
    expect(sql).toContain(
      `create or replace function public.remove_deleted_author_from_posts() returns trigger language plpgsql security definer set search_path = ''`
    )
    expect(sql).toContain(
      'set author_ids = array_remove(author_ids, old.id) where author_ids @> array[old.id];'
    )
    expect(sql).toContain(
      'revoke execute on function public.remove_deleted_author_from_posts() from public, anon, authenticated;'
    )
    expect(sql).toContain(
      'create trigger authors_remove_from_posts after delete on public.authors for each row execute function public.remove_deleted_author_from_posts();'
    )
  })

  it('uses no destructive statement on existing data', () => {
    expect(sql).not.toMatch(/drop (table|column)|truncate|delete from/i)
  })
})
