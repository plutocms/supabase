import { serverSupabaseClient } from '#supabase/server'
import {
  inviteBodySchema,
  inviteRedirectUrl,
} from '../../../../../utils/access-invite'
import {
  provisionAccess,
  serviceKeyRequiredError,
} from '../../../../../utils/access-mail'
import { requireAdminRole } from '../../../../../utils/admin-role-guard'
import { enforceInviteRateLimit } from '../../../../../utils/rate-limit'
import { optionalServiceClient } from '../../../../../utils/service-client'
import { parseBody } from '../../../../../utils/validate'

/**
 * Grants the roles and returns a one-time sign-in link. No email is sent, so
 * the Supabase mailer and its limits are not used. The admin copies the link
 * and sends it to the user.
 *
 * It needs the service role key (`auth.admin.generateLink`). Without it, the
 * answer is 503. The link expires, and it works once.
 *
 * - An email with an account: the roles are added, and the link is a
 *   magic link for that account.
 * - A new email: the invite link makes the user, then the roles are set.
 *   If the roles fail, the new user is deleted.
 */
export default defineEventHandler(async (event) => {
  const caller = await requireAdminRole(event)

  enforceInviteRateLimit(caller.sub)

  const { email, roleKeys, displayName } = await parseBody(
    event,
    inviteBodySchema
  )
  const service = optionalServiceClient(event)

  if (!service) {
    throw serviceKeyRequiredError()
  }

  const client = await serverSupabaseClient<Database>(event)
  const { origin } = getRequestURL(event)
  const result = await provisionAccess({
    client,
    service,
    email,
    roleKeys,
    displayName,
    redirectTo: inviteRedirectUrl(origin),
    origin,
  })

  return {
    status: result.created ? ('invited' as const) : ('granted' as const),
    link: result.link,
  }
})
