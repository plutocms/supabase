import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The columns of the `@plutocms/seo` add-on layer. The layer names them in `PLUTO_SEO_FIELDS`
// (`packages/layers/addons/seo` in plutocms/pluto): a change here needs the same change there.
const sql = readFileSync(
  join(__dirname, '..', 'db', 'migrations', '006_post_seo.sql'),
  'utf8'
)
  .replace(/--.*$/gm, '')
  .replace(/\s+/g, ' ')

describe('006_post_seo.sql', () => {
  it.each([
    ['seo_title', 'text null'],
    ['seo_description', 'text null'],
    ['seo_image', 'text null'],
    ['seo_noindex', 'boolean not null default false'],
  ])('adds %s as %s, safe to run again', (column, definition) => {
    expect(sql).toContain(
      `alter table public.posts add column if not exists ${column} ${definition};`
    )
  })

  it('changes nothing else', () => {
    expect(sql.match(/alter table/g)).toHaveLength(4)
    expect(sql).not.toMatch(/drop|grant|policy/i)
  })
})
