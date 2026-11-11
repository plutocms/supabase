/**
 * A shim that pluto-migrations wrote: one re-export of the types of an @plutocms/supabase copy
 * (installed, or linked from a local checkout).
 */
const SEEDED_SHIM = /^export \* from '[^']*\/shared\/types\/supabase'\s*$/

/**
 * The text to write to the app's `shared/types/supabase.ts`, or `null` to leave the file as it
 * is. A missing file gets the shim. A shim that pluto-migrations wrote earlier gets the new path
 * when the path changed: a package manager with versioned folders (Bun's
 * `node_modules/.bun/@plutocms+supabase@<version>...`) moves the package on each update, and the
 * old path then has no types. A file with other text (types that the app generated) stays.
 */
export function supabaseTypesShim(
  existing: string | undefined,
  importSpecifier: string
): string | null {
  const shim = `export * from '${importSpecifier}'\n`
  if (existing === undefined) {
    return shim
  }
  if (SEEDED_SHIM.test(existing) && existing.trim() !== shim.trim()) {
    return shim
  }
  return null
}
