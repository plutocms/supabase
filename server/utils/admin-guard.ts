import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

/**
 * Guards a server route so only an admin can call it.
 *
 * Queries `public.profiles.is_admin` directly — deliberately NOT
 * `public.is_admin()` or `public.has_capability()`. Both of those are
 * defined by migrations (`002_admin_hardening.sql`,
 * `004_roles_and_capabilities.sql` respectively); a genuinely fresh site
 * that has never applied any migration beyond the original baseline
 * schema — an expected, normal state, not a broken one — has neither
 * function. `/api/migrations/*` (the only routes that call `requireAdmin`
 * today) are the one place this actually bites: they are the routes that
 * apply a pending migration, so they must work with zero migrations
 * applied, not just with `002`+ already in place. An earlier version of
 * this function called `public.is_admin()` on the theory that it "always
 * exists" — true for a site that has applied at least `002`, false for a
 * fresh one that has not, which is exactly the case that matters here.
 * `profiles.is_admin` (the column) is part of the original baseline
 * schema itself, before any of this project's layered migrations existed,
 * so querying it directly has no migration dependency at all.
 *
 * The trade-off: a user granted the `admin` role only through
 * `user_roles` (see `permissions-storage/SKILL.md`'s "Granting a role by
 * hand"), with `profiles.is_admin` left `false`, cannot pass this check —
 * only RLS and `has_capability()`-gated routes recognize a role-only
 * admin. That is an acceptable, narrow limitation: `user_roles` cannot
 * exist before `004` has been applied, so a role-only admin can only
 * exist on a site that has already applied every current migration, at
 * which point there is nothing left for that admin to need
 * `/admin/migrations` for. If a future migration ever needs applying by
 * a role-only admin, grant them `profiles.is_admin = true` too.
 *
 * `serverSupabaseUser` (from `@nuxtjs/supabase`, backed by
 * `client.auth.getClaims()`) returns decoded JWT claims, not a Supabase
 * `User` row — the claims object has no `id` field, only `sub`. Querying
 * `.eq('id', user.id)` silently matches zero rows and looks exactly like
 * "not an admin" even for a real admin. Always read `user.sub`.
 *
 * Throws a 401 if there is no logged-in user, or a 403 if the user is not
 * an admin. Returns the user's claims on success.
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

  if (error) {
    // Logged, never returned: the 403 below must not tell an untrusted
    // caller whether it hit a real error (a missing column, a connection
    // problem) or a genuine non-admin. Server logs are where that
    // distinction has to live instead.
    console.error('requireAdmin: profiles lookup failed:', error.message)
  }

  if (error || !profile?.is_admin) {
    throw createError({ statusCode: 403, statusMessage: 'Your account is not an admin.' })
  }

  return user
}
