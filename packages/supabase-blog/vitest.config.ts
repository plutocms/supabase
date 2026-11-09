import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Matches @plutocms/core's own vitest.config.ts. Plain `vitest run` never
// sets `import.meta.dev` on its own, so `defineContentType`'s dev-only
// warnings never fire without this — and test/content-post.test.ts checks
// for exactly those warnings.
//
// `#layers/pluto` is the core layer, as Nuxt gives it to the app (the Markdown path and the
// sanitizer import the content component mark from core). Core ships TypeScript, so Vitest
// transforms it instead of loading it as an external.
export default defineConfig({
  define: {
    'import.meta.dev': 'true',
  },
  resolve: {
    alias: {
      '#layers/pluto': fileURLToPath(
        new URL('../../node_modules/@plutocms/core', import.meta.url)
      ),
    },
  },
  test: {
    server: { deps: { inline: [/@plutocms[\\/]core/] } },
  },
})
