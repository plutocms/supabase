import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)

  const id = event.context.params?.id as string

  const { data: user, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Error fetching user: ${error.message}`,
    })
  }

  return user
})
