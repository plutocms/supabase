import { serverSupabaseClient } from '#supabase/server'
import { mapAccessError } from '../../../../../../utils/access-errors'
import {
  requireUserId,
  rolesBodySchema,
} from '../../../../../../utils/access-invite'
import { requireAdminRole } from '../../../../../../utils/admin-role-guard'
import { parseBody } from '../../../../../../utils/validate'

/** Replaces the roles of a user. An empty list revokes the access. */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const id = requireUserId(event.context.params?.id)
  const { roleKeys } = await parseBody(event, rolesBodySchema)
  const client = await serverSupabaseClient<Database>(event)
  const { error } = await client.rpc('set_user_roles', {
    target: id,
    role_keys: roleKeys,
  })

  if (error) {
    throw mapAccessError(error)
  }

  return { id }
})
