import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)

  const body = await readBody(event)

  const { data, error } = await client.auth.signUp({
    email: body.email,
    password: body.password,
    options: {
      data: {
        first_name: body.first_name,
        last_name: body.last_name,
      },
    },
  })

  if (error) {
    throw createError({
      statusCode: Number.parseInt(error.code ?? '500'),
      cause: error.cause,
      message: error.message,
    })
  }

  return { message: 'User registered successfully', data }
})
