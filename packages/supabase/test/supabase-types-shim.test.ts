import { describe, expect, it } from 'vitest'
import { supabaseTypesShim } from '../modules/supabase-types-shim'

const now = '../../node_modules/.bun/@plutocms+supabase@0.31.0+abc/node_modules/@plutocms/supabase/shared/types/supabase'
const old = '../../node_modules/.bun/@plutocms+supabase@0.23.0+def/node_modules/@plutocms/supabase/shared/types/supabase'

describe('supabaseTypesShim', () => {
  it('seeds the shim when the app has no types file', () => {
    expect(supabaseTypesShim(undefined, now)).toBe(`export * from '${now}'\n`)
  })

  it('moves an earlier shim to the new path of the package', () => {
    expect(supabaseTypesShim(`export * from '${old}'\n`, now)).toBe(
      `export * from '${now}'\n`
    )
    expect(
      supabaseTypesShim(
        "export * from '../../../supabase/packages/supabase/shared/types/supabase'",
        now
      )
    ).toBe(`export * from '${now}'\n`)
  })

  it('leaves a shim with the current path, and generated types', () => {
    expect(supabaseTypesShim(`export * from '${now}'\n`, now)).toBeNull()
    expect(
      supabaseTypesShim('export type Json = string\nexport type Database = {}\n', now)
    ).toBeNull()
  })
})
