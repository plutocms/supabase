import { defineConfig } from 'vitest/config'

// Matches @plutocms/core's own vitest.config.ts. Plain `vitest run` never
// sets `import.meta.dev` on its own, so `defineContentType`'s dev-only
// warnings never fire without this — and test/content-post.test.ts checks
// for exactly those warnings.
export default defineConfig({
  define: {
    'import.meta.dev': 'true',
  },
})
