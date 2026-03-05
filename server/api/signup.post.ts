import { serverSupabaseClient } from '#supabase/server'

interface Payload {
  username: string
  display_name: string
  email: string
  password: string
  is_admin?: boolean
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)

  const body = await readBody<Payload>(event)

  const { data, error } = await client.auth.signUp({
    email: body.email,
    password: body.password,
    options: {
      data: {
        username: body.username,
        display_name: body.display_name,
        is_admin: body.is_admin || false,
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

  // Set the first_setup flag in the healthcheck table to false
  const { error: healthcheckError } = await client
    .from('healthcheck')
    .update({ config_value: 'false' })
    .eq('config_name', 'first_setup')

  if (healthcheckError) {
    return {
      success: false,
      message: healthcheckError.message,
      error: healthcheckError,
    }
  }

  return {
    success: true,
    message: 'User registered successfully',
    data,
  }
})
