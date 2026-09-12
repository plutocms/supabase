import type { H3Event } from 'h3'
import { ALL_CAPABILITIES, requireCapability } from './capability-guard'

/**
 * Guards a server route so only an admin (or a holder of every
 * capability, which is what the built-in admin role grants) can call it.
 * A thin alias over requireCapability, kept for the routes that ask for
 * "admin, full stop" rather than one named capability.
 *
 * Throws a 401 if there is no logged-in user, or a 403 if the user is not
 * an admin. Returns the claims on success. See capability-guard.ts for
 * the user.sub vs user.id note: this function forwards straight into
 * requireCapability, which never reads either field.
 */
export async function requireAdmin(event: H3Event) {
  return requireCapability(event, ALL_CAPABILITIES, {
    message: 'Your account is not an admin.',
  })
}
