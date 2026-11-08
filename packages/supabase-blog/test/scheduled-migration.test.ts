import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The text of the migration. Like the other migration tests of this layer, it checks the SQL, not
// a database. The copy test of the plan ran the file on a Postgres copy (PGlite), two times.
const sql = readFileSync(
  join(__dirname, '..', 'db', 'migrations', '010_scheduled_publish.sql'),
  'utf8'
)
  .replace(/--.*$/gm, '')
  .replace(/\s+/g, ' ')

describe('010_scheduled_publish.sql', () => {
  it('allows the review and scheduled statuses, with an index for the scheduled task', () => {
    expect(sql).toContain(
      'alter table public.posts drop constraint if exists posts_status_check;'
    )
    expect(sql).toContain(
      "check (status in ('draft', 'review', 'scheduled', 'published'));"
    )
    expect(sql).toContain(
      "create index if not exists idx_posts_scheduled on public.posts (published_at) where status = 'scheduled';"
    )
  })

  it('has the live rule of core, and the read policies use it', () => {
    expect(sql).toContain(
      "select p_status = 'published' or (p_status = 'scheduled' and p_published_at is not null and p_published_at <= now());"
    )
    expect(sql).toContain(
      'to anon using (public.pluto_is_live(status, published_at) and deleted_at is null);'
    )
    expect(sql).toContain(
      "using ( (public.pluto_is_live(status, published_at) and deleted_at is null) or public.has_capability('posts:read_drafts') or (deleted_at is not null and public.has_capability('posts:delete')) );"
    )
  })

  it('adds posts:write to every publisher, and the built-in Contributor role', () => {
    expect(sql).toContain(
      "select distinct role_key, 'posts:write' from public.role_capabilities where capability = 'posts:publish' on conflict do nothing;"
    )
    expect(sql).toContain(
      "('contributor', 'Contributor', 'Writes posts and sends them to review. Cannot publish.', true) on conflict (key) do nothing;"
    )
    expect(sql).toContain(
      "('contributor', 'posts:write'), ('contributor', 'posts:read_drafts') on conflict do nothing;"
    )
    expect(sql).not.toContain("('contributor', 'posts:publish')")
  })

  it('lets posts:write or posts:publish write, and guards the status without posts:publish', () => {
    expect(sql).toContain(
      "with check (public.has_capability('posts:write') or public.has_capability('posts:publish'));"
    )
    expect(sql).toContain(
      "and not public.has_capability('posts:publish') and not public.has_capability('posts:write')"
    )
    expect(sql).toContain(
      "if current_user <> 'authenticated' or public.has_capability('posts:publish') then return new;"
    )
    expect(sql).toContain(
      "if tg_op = 'UPDATE' and old.status in ('published', 'scheduled') then"
    )
    expect(sql).toContain("if new.status not in ('draft', 'review') then")
    expect(sql).toContain(
      'create trigger posts_status_guard before insert or update on public.posts for each row execute function public.posts_status_guard();'
    )
  })

  it('drops each policy before it creates it, and changes no data', () => {
    const created = sql.match(/create policy "[^"]+"/g) ?? []
    expect(created.length).toBe(4)
    for (const policy of created) {
      const name = policy.slice('create policy '.length)
      expect(sql).toContain(`drop policy if exists ${name}`)
    }
    expect(sql).not.toMatch(
      /drop (table|column)|truncate|delete from|update public\./i
    )
  })
})
