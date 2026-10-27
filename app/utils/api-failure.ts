// Reads the extra data of a failed call to this layer's routes. This file does
// not use Nuxt auto-imports, so plain Vitest can import it.

/**
 * Returns the `data` that a route put in its `createPlutoError`. A `$fetch`
 * error holds the whole response body in `data`, so the extra data sits in
 * `data.data`. Returns `undefined` when the error has none.
 */
export function failureData(error: unknown): Record<string, unknown> | undefined {
  const body = (error as { data?: unknown } | null | undefined)?.data
  const data = (body as { data?: unknown } | null | undefined)?.data

  return typeof data === 'object' && data !== null
    ? (data as Record<string, unknown>)
    : undefined
}
