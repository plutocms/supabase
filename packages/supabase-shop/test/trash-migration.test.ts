import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The text of the migration. The copy test of the plan ran the file on a Postgres copy (PGlite),
// two times, with the access checks.
const sql = readFileSync(
  join(__dirname, '..', 'db', 'migrations', '007_trash.sql'),
  'utf8'
)
  .replace(/--.*$/gm, '')
  .replace(/\s+/g, ' ')

const TABLES = ['products', 'product_category', 'product_availability']

describe('007_trash.sql', () => {
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

  it('hides a trashed row from visitors and shoppers, and shows it to the managers', () => {
    for (const [table, capability] of [
      ['products', 'products:delete'],
      ['product_category', 'shop:manage_taxonomy'],
      ['product_availability', 'shop:manage_availability'],
    ]) {
      expect(sql).toContain(
        `create policy "Allow public read access" on public.${table} for select to anon, authenticated using (deleted_at is null);`
      )
      expect(sql).toContain(
        `on public.${table} for select to authenticated using (deleted_at is not null and public.has_capability('${capability}'));`
      )
    }
  })

  it('lets products:delete change the trash state only, through a guard', () => {
    expect(sql).toContain(
      `create policy "Allow products:delete trash on products" on public.products for update to authenticated using (public.has_capability('products:delete')) with check (public.has_capability('products:delete'));`
    )
    expect(sql).toContain(
      `if current_user = 'authenticated' and not public.has_capability('products:manage')`
    )
    expect(sql).toContain(
      'create trigger products_trash_only_guard before update on public.products for each row execute function public.products_trash_only_guard();'
    )
  })

  it('drops each policy before it creates it, and changes no data', () => {
    for (const policy of sql.match(/create policy "[^"]+"/g) ?? []) {
      expect(sql).toContain(
        `drop policy if exists ${policy.slice('create policy '.length)}`
      )
    }
    expect(sql).not.toMatch(
      /drop (table|column)|truncate|delete from|update public\./i
    )
  })
})
