import { plutoMailReady } from '../../../../utils/access-mail'
import { requireAdminRole } from '../../../../utils/admin-role-guard'
import { optionalServiceClient } from '../../../../utils/service-client'

/**
 * What the invite UI can offer, for an admin: whether the service role key is
 * set (copy invite link, invites through Pluto mail) and whether Pluto mail can
 * send. It holds no secret.
 */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  return {
    serviceKey: optionalServiceClient(event) !== null,
    mail: { configured: await plutoMailReady() },
  }
})
