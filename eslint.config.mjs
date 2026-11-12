// Each package has its own ESLint config (ESLint uses the nearest one for each file). The root
// config only exists so that `eslint .` runs from the root, and it covers the playground. It adds
// no rule. The build output of the playground is not linted.
export default [
  {
    ignores: ['playground/.nuxt/', 'playground/.output/', 'playground/.data/'],
  },
  {},
]
