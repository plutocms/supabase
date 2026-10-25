import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

/**
 * Guards a server route so only an admin can call it, through
 * `public.is_admin()`. That function reads `profiles.is_admin` and the
 * `admin` role, so it also accepts an admin who has the role only.
 *
 * Use it for the access API (migration 008). Keep `requireAdmin` for the
 * migrations routes: it needs no migration at all.
 *
 * The rpc runs with the session of the caller, so `auth.uid()` is the caller.
 * Throws a 401 with no user, or a 403 for a user who is not an admin.
 * Returns the claims (the user id is `sub`).
 */
export async function requireAdminRole(event: H3Event) {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createPlutoError({
      statusCode: 401,
      message: 'You must be logged in.',
      key: 'supabase.errors.notLoggedIn',
    })
  }

  const client = await serverSupabaseClient<Database>(event)
  const { data, error } = await client.rpc('is_admin')

  if (error) {
    // Logged, never returned: the 403 must not tell the caller why.
    console.error('requireAdminRole: is_admin() failed:', error.message)
  }

  if (error || data !== true) {
    throw createPlutoError({
      statusCode: 403,
      message: 'Your account is not an admin.',
      key: 'supabase.errors.notAdmin',
    })
  }

  return user
}
