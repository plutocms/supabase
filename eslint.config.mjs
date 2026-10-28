// @ts-check
import antfu from '@antfu/eslint-config'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import { getDefaultSelectors } from 'eslint-plugin-better-tailwindcss/defaults'
import withNuxt from './.nuxt/eslint.config.mjs'

// See: https://eslint.vuejs.org/rules
export default withNuxt(
  // @ts-ignore - Antfu's config is ESM only, but Nuxt's ESLint config is CJS --- IGNORE ---
  antfu({
    ignores: ['**/*.md', '.agents/**', '.github/**', 'shared/types/supabase.ts'],

    rules: {
      'node/prefer-global/process': ['off', 'never'],

      'style/indent-binary-ops': 'off',
      'style/arrow-parens': ['warn', 'always'],
      'style/brace-style': ['warn', '1tbs'],

      'vue/block-order': [
        'warn',
        {
          order: ['script', 'template', 'style'],
        },
      ],

      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-closing-bracket-newline': 'off',

      'vue/html-self-closing': [
        'warn',
        {
          html: {
            void: 'always',
            normal: 'always',
            component: 'always',
          },
          svg: 'always',
          math: 'always',
        },
      ],

      'vue/attributes-order': [
        'warn',
        {
          order: [
            'DEFINITION',
            'LIST_RENDERING',
            'CONDITIONALS',
            'RENDER_MODIFIERS',
            'GLOBAL',
            'UNIQUE',
            'TWO_WAY_BINDING',
            'SLOT',
            'OTHER_DIRECTIVES',
            'ATTR_DYNAMIC',
            'ATTR_STATIC',
            'ATTR_SHORTHAND_BOOL',
            'EVENTS',
            'CONTENT',
          ],
        },
      ],

      'vue/multi-word-component-names': 'off',

      'vue/eqeqeq': ['error', 'always'],

      'style/comma-dangle': [
        'warn',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          functions: 'never',
          imports: 'always-multiline',
        },
      ],

      'vue/comma-dangle': [
        'warn',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          functions: 'never',
        },
      ],

      'style/operator-linebreak': 'off',

      'vue/singleline-html-element-content-newline': 'off',
    },
  }),
  // Canonical Tailwind classes (the same suggestion as Tailwind IntelliSense,
  // `suggestCanonicalClasses`): `w-px`, not `w-[1px]`. The design system is
  // tailwind.lint.css. Nuxt UI `ui` objects (`:ui="{ root: '…' }"`) count too.
  {
    files: ['**/*.vue', '**/*.ts'],
    plugins: { 'better-tailwindcss': betterTailwindcss },
    settings: {
      'better-tailwindcss': {
        entryPoint: 'tailwind.lint.css',
        // px arbitrary values become spacing steps (`h-[27px]` is `h-6.75`).
        rootFontSize: 16,
        selectors: [
          ...getDefaultSelectors(),
          { kind: 'attribute', name: '^ui$', match: [{ type: 'objectValues' }] },
        ],
      },
    },
    rules: {
      'better-tailwindcss/enforce-canonical-classes': 'error',
      // The fix of the rule above can leave double spaces in a class list.
      'better-tailwindcss/no-unnecessary-whitespace': 'error',
    },
  }
)
