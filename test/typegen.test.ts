import { describe, expect, it } from 'vitest'
import { keepInternalSupabase } from '../server/utils/typegen'

const existing = `export type Json = string

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {}
  }
}
`

const generated = `export type Json = string

export type Database = {
  public: {
    Tables: {
      posts: {}
    }
  }
}
`

describe('keepInternalSupabase', () => {
  it('copies the existing block into an output without one', () => {
    const result = keepInternalSupabase(generated, existing)

    expect(result).toContain('PostgrestVersion: "14.5"')
    expect(result).toContain('// Allows to automatically instantiate')
    expect(result.indexOf('__InternalSupabase')).toBeLessThan(
      result.indexOf('public: {')
    )
    expect(result).toContain('posts: {}')
    expect(result).not.toContain('Tables: {}\n')
  })

  it('keeps the new output when it has its own block', () => {
    const next = generated.replace(
      'export type Database = {\n',
      'export type Database = {\n  __InternalSupabase: {\n    PostgrestVersion: "15.0"\n  }\n'
    )

    expect(keepInternalSupabase(next, existing)).toBe(next)
  })

  it('keeps the new output when there is no existing file', () => {
    expect(keepInternalSupabase(generated, null)).toBe(generated)
  })

  it('keeps the new output when the existing file has no block', () => {
    expect(keepInternalSupabase(generated, 'export type Database = {}\n')).toBe(
      generated
    )
  })

  it('keeps the new output when it has no Database type', () => {
    expect(keepInternalSupabase('export type X = 1\n', existing)).toBe(
      'export type X = 1\n'
    )
  })

  it('copies the block when the output names it in DatabaseWithoutInternals', () => {
    // The real CLI output always has this line, outside the Database type.
    const cli = `${generated}\ntype DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">\n`
    const result = keepInternalSupabase(cli, existing)

    expect(result).toContain('PostgrestVersion: "14.5"')
    expect(result).toContain('Omit<Database, "__InternalSupabase">')
  })

  it('copies the block from a file in the ESLint style', () => {
    // After `eslint --fix`: an interface and single quotes.
    const eslintStyle = existing
      .replace('export type Database = {', 'export interface Database {')
      .replace('"14.5"', "'14.5'")

    expect(keepInternalSupabase(generated, eslintStyle)).toContain(
      "PostgrestVersion: '14.5'"
    )
  })

  it('removes the blank line the CLI writes after the opening brace', () => {
    const cli = generated.replace(
      'export type Database = {\n',
      'export type Database = {\n  \n'
    )
    const result = keepInternalSupabase(cli, existing)

    expect(result).toContain('  }\n  public: {')
  })

  it('is stable when it runs twice', () => {
    const once = keepInternalSupabase(generated, existing)

    expect(keepInternalSupabase(once, once)).toBe(once)
  })
})
