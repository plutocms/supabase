import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

/**
 * Guards a server route so only an admin can call it.
 *
 * Calls `public.is_admin()` directly — deliberately NOT through
 * `requireCapability`/`public.has_capability()`. `has_capability()` is
 * defined by `004_roles_and_capabilities.sql`; a site that has upgraded
 * this package but not yet applied that migration has no such function in
 * its database, and every `requireCapability` call would throw. If
 * `requireAdmin` routed through it too, that would 403 the one route
 * (`/api/migrations/*`) an admin needs to actually apply the migration —
 * a deadlock with no escape through the UI. `public.is_admin()` has existed
 * since `002_admin_hardening.sql` and is only ever `create or replace`d,
 * never dropped, so it is always safe to call regardless of which layer
 * migrations have been applied. This is also why the migrations routes
 * call `requireAdmin` specifically, and not a named capability like
 * `system:migrate` — migrations are a bootstrapping concern and must never
 * depend on the capability system migrations themselves create.
 *
 * Throws a 401 if there is no logged-in user, or a 403 if the user is not
 * an admin. Returns the user's claims on success. See capability-guard.ts
 * for the same user.sub vs user.id note — this function has the same
 * shape but never reads either field either.
 */
export async function requireAdmin(event: H3Event) {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'You must be logged in.' })
  }

  const client = await serverSupabaseClient<Database>(event)
  const { data, error } = await client.rpc('is_admin')

  if (error) {
    // A logged error here matters: an RPC error (permission denied, or the
    // function itself missing) and "the function ran fine and returned
    // false" both reach this branch, and both produce the same 403 to the
    // caller on purpose — the response must not distinguish "you are not
    // an admin" from "something is misconfigured" to an untrusted client.
    // Server logs are where that distinction has to live instead.
    console.error('is_admin() RPC failed:', error.message)
  }

  if (error || data !== true) {
    throw createError({ statusCode: 403, statusMessage: 'Your account is not an admin.' })
  }

  return user
}
