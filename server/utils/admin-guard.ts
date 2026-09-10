import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

/**
 * Guards a server route so only a logged-in admin can call it.
 *
 * `serverSupabaseUser` (from `@nuxtjs/supabase`, backed by
 * `client.auth.getClaims()`) returns decoded JWT claims, not a Supabase
 * `User` row. The claims object has no `id` field — the user's id is the
 * `sub` claim. Using `user.id` here silently queries `eq('id', undefined)`,
 * which matches zero rows and looks exactly like "not an admin" even for a
 * real admin. Always read `user.sub`, never `user.id`.
 *
 * Reads `is_admin` from `public.profiles`, never from `user_metadata`. The
 * `handle_new_user` trigger never writes `is_admin` back to
 * `auth.users.raw_user_meta_data`, so `user_metadata.is_admin` can be unset
 * even for the first admin. `public.profiles.is_admin` is the source of
 * truth.
 *
 * Throws a 401 if there is no logged-in user, or a 403 if the user is not
 * an admin. Returns the claims on success.
 */
export async function requireAdmin(event: H3Event) {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'You must be logged in.' })
  }

  const client = await serverSupabaseClient<Database>(event)

  const { data: profile, error } = await client
    .from('profiles')
    .select('is_admin')
    .eq('id', user.sub)
    .single()

  if (error || !profile?.is_admin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Your account is not an admin.',
    })
  }

  return user
}
