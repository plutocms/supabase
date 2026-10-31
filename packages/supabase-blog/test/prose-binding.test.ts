import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// PlutoProse must bind `:innerHTML` in camelCase. `v-html` and the hyphenated
// `:inner-h-t-m-l` both render no content (see the comment in the component).
// The lint rule `vue/attribute-hyphenation` rewrites it on `eslint --fix`.
describe('plutoProse', () => {
  it('binds the HTML with a camelCase innerHTML prop', () => {
    const source = readFileSync(
      new URL('../app/components/PlutoProse.vue', import.meta.url),
      'utf8'
    )
    expect(source).toContain(':innerHTML="html"')
    expect(source).not.toContain(':inner-h-t-m-l=')
  })
})
