import { serverSupabaseClient } from '#supabase/server'
import { mapAccessError } from '../../../../utils/access-errors'
import { requireUserId } from '../../../../utils/access-invite'
import { requireAdminRole } from '../../../../utils/admin-role-guard'

/** Revokes the access of a user: it removes every role. The account stays. */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const id = requireUserId(event.context.params?.id)
  const client = await serverSupabaseClient<Database>(event)
  const { error } = await client.rpc('set_user_roles', {
    target: id,
    role_keys: [],
  })

  if (error) {
    throw mapAccessError(error)
  }

  return { id }
})
