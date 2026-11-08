import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// PlutoProse shows the rendered HTML through `PlutoHtml` of core, which binds
// `innerHTML` in camelCase (`v-html` and `:inner-h-t-m-l` render no content in
// SSR) and puts the embed players in place.
describe('plutoProse', () => {
  it('shows the HTML through PlutoHtml of core', () => {
    const source = readFileSync(
      new URL('../app/components/PlutoProse.vue', import.meta.url),
      'utf8'
    )
    expect(source).toContain('<PlutoHtml')
    expect(source).toContain(':html="html"')
    expect(source).not.toContain('v-html')
    expect(source).not.toContain(':inner-h-t-m-l=')
  })
})
