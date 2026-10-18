import { serverSupabaseClient } from '#supabase/server'
import { requireCapability } from '../../utils/capability-guard'

export default defineEventHandler(async (event) => {
  await requireCapability(event, 'users:read')

  const client = await serverSupabaseClient<Database>(event)

  const { data: users, error } = await client.from('profiles').select('*')

  if (error) {
    throw createPlutoError({
      statusCode: 500,
      message: `Error fetching users: ${error.message}`,
      key: 'supabase.errors.fetchUsers',
      params: { message: error.message },
    })
  }

  return users
})
