import { serverSupabaseClient } from '#supabase/server'
import { mapAccessError } from '../../utils/access-errors'
import { requireCapability } from '../../utils/capability-guard'

/** The roles, with their capabilities and the number of users. */
export default defineEventHandler(async (event) => {
  await requireCapability(event, 'users:read')

  const client = await serverSupabaseClient<Database>(event)
  const { data, error } = await client.rpc('list_roles')

  if (error) {
    throw mapAccessError(error)
  }

  return { roles: data ?? [] }
})
