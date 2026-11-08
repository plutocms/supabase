import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The text of the migration. It checks the SQL, not a database. The copy test of the plan ran the
// file on a Postgres copy (PGlite), two times.
const sql = readFileSync(
  join(__dirname, '..', 'db', 'migrations', '008_product_status.sql'),
  'utf8'
)
  .replace(/--.*$/gm, '')
  .replace(/\s+/g, ' ')

describe('008_product_status.sql', () => {
  it('adds the status (every existing product stays published) and the time', () => {
    expect(sql).toContain(
      "alter table public.products add column if not exists status text not null default 'published';"
    )
    expect(sql).toContain(
      'alter table public.products add column if not exists published_at timestamp with time zone null;'
    )
    expect(sql).toContain(
      "check (status in ('draft', 'review', 'scheduled', 'published'));"
    )
  })

  it('shows the live products to everyone and every product to products:manage', () => {
    expect(sql).toContain(
      'to anon, authenticated using (public.pluto_is_live(status, published_at) and deleted_at is null);'
    )
    expect(sql).toContain(
      "to authenticated using (deleted_at is null and public.has_capability('products:manage'));"
    )
  })

  it('gives products:publish to every role that manages products, and guards the status', () => {
    expect(sql).toContain(
      "select distinct role_key, 'products:publish' from public.role_capabilities where capability = 'products:manage' on conflict do nothing;"
    )
    expect(sql).toContain(
      "if current_user <> 'authenticated' or public.has_capability('products:publish') then return new;"
    )
    expect(sql).toContain(
      'create trigger products_status_guard before insert or update on public.products for each row execute function public.products_status_guard();'
    )
  })

  it('drops each policy before it creates it, and changes no data', () => {
    const created = sql.match(/create policy "[^"]+"/g) ?? []
    expect(created.length).toBe(2)
    for (const policy of created) {
      const name = policy.slice('create policy '.length)
      expect(sql).toContain(`drop policy if exists ${name}`)
    }
    expect(sql).not.toMatch(
      /drop (table|column)|truncate|delete from|update public\./i
    )
  })
})
