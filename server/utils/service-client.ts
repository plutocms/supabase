import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * Returns the Supabase client with the service role key, or null when the
 * key is not set. The key is optional for invites: without it, the invite
 * routes send a sign-in link instead (see `sign-in-link.ts`).
 */
export function optionalServiceClient(event: H3Event) {
  try {
    return serverSupabaseServiceRole<Database>(event)
  } catch {
    return null
  }
}

/** The client of `optionalServiceClient`, when the key is set. */
export type ServiceClient = NonNullable<ReturnType<typeof optionalServiceClient>>
