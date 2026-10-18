import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

/**
 * The calling user's own admin language. `null` means Automatic: the user
 * has not chosen one. No admin gate: every signed-in user reads their own
 * row. A signed-out caller gets `null`, not a 401, so the client never has
 * to special-case this route's error path.
 *
 * Read `user.sub`, not `user.id`. See server/utils/admin-guard.ts.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    return { locale: null as string | null }
  }

  const client = await serverSupabaseClient<Database>(event)
  const { data, error } = await client
    .from('profiles')
    .select('locale')
    .eq('id', user.sub)
    .maybeSingle()

  if (error) {
    // profiles.locale is added by 005_profile_locale.sql. A site that has
    // upgraded this package but not yet applied that migration has no such
    // column. That state is expected and temporary, so degrade to
    // "Automatic" instead of a 500. The same choice is made in
    // server/api/permissions/me.get.ts.
    console.error(
      'profiles.locale read failed, returning no locale:',
      error.message
    )
    return { locale: null as string | null }
  }

  return { locale: data?.locale ?? null }
})
