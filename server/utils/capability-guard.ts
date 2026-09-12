import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

/** The wildcard capability. A holder passes every capability check. */
export const ALL_CAPABILITIES = '*'

interface RequireCapabilityOptions {
  /** Overrides the 403 message. */
  message?: string
}

/**
 * Guards a server route on a named capability.
 *
 * `serverSupabaseUser` (from `@nuxtjs/supabase`, backed by
 * `client.auth.getClaims()`) returns decoded JWT claims, not a Supabase
 * `User` row — used here only to distinguish "not logged in" (401) from
 * "logged in but missing the capability" (403). The capability check
 * itself runs in the database, through public.has_capability(), a
 * SECURITY DEFINER function that reads auth.uid() directly from the same
 * session — user.sub/user.id is never passed to it.
 *
 * public.has_capability() folds in public.is_admin(), so every existing
 * admin passes every capability check with no data migration.
 *
 * Throws a 401 if there is no logged-in user, or a 403 if the user is
 * missing the capability. Returns the claims on success.
 */
export async function requireCapability(
  event: H3Event,
  capability: string,
  options?: RequireCapabilityOptions
) {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'You must be logged in.' })
  }

  const client = await serverSupabaseClient<Database>(event)
  const { data, error } = await client.rpc('has_capability', { cap: capability })

  if (error || data !== true) {
    throw createError({
      statusCode: 403,
      statusMessage:
        options?.message ?? `Your account is missing the "${capability}" permission.`,
    })
  }

  return user
}
