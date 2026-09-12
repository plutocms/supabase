import { serverSupabaseClient } from '#supabase/server'
import { requireCapability } from '../../utils/capability-guard'

export default defineEventHandler(async (event) => {
  await requireCapability(event, 'users:read')

  const client = await serverSupabaseClient<Database>(event)

  const { data: users, error } = await client.from('profiles').select('*')

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Error fetching users: ${error.message}`,
    })
  }

  return users
})
