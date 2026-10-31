import { serverSupabaseClient } from '#supabase/server'
import { mapAccessError } from '../../../../utils/access-errors'
import { requireCapability } from '../../../../utils/capability-guard'

/** The staff: users with a role, or with the admin flag. */
export default defineEventHandler(async (event) => {
  await requireCapability(event, 'users:read')

  const client = await serverSupabaseClient<Database>(event)
  const { data, error } = await client.rpc('list_staff_users')

  if (error) {
    throw mapAccessError(error)
  }

  return { users: data ?? [] }
})
