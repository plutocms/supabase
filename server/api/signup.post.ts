import { serverSupabaseClient } from '#supabase/server'

interface Payload {
  username: string
  display_name: string
  email: string
  password: string
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)

  const body = await readBody<Payload>(event)

  if (!body.username || body.username.length < 3) {
    return {
      success: false,
      message: 'Username must be at least 3 characters.',
    }
  }

  const { data, error } = await client.auth.signUp({
    email: body.email,
    password: body.password,
    options: {
      data: {
        username: body.username,
        display_name: body.display_name,
      },
    },
  })

  if (error) {
    return {
      success: false,
      message: error.message,
      error,
    }
  }

  return {
    success: true,
    message: 'User registered successfully',
    data,
  }
})
