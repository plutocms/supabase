import { serverSupabaseClient } from '#supabase/server'
import { mapAccessError } from '../../../../../utils/access-errors'
import { requireAdminRole } from '../../../../../utils/admin-role-guard'

/** Deletes a role. It answers with the number of users who lost the role. */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const key = event.context.params?.key as string
  const client = await serverSupabaseClient<Database>(event)
  const { data, error } = await client.rpc('delete_role', { p_key: key })

  if (error) {
    throw mapAccessError(error)
  }

  return { key, removedFromUsers: data ?? 0 }
})
