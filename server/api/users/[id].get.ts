import { serverSupabaseClient } from '#supabase/server'
import { requireCapability } from '../../utils/capability-guard'

export default defineEventHandler(async (event) => {
  await requireCapability(event, 'users:read')

  const client = await serverSupabaseClient<Database>(event)

  const id = event.context.params?.id as string

  const { data: user, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', id)

  if (error) {
    throw createPlutoError({
      statusCode: 500,
      message: `Error fetching user: ${error.message}`,
      key: 'supabase.errors.fetchUser',
      params: { message: error.message },
    })
  }

  return user
})
