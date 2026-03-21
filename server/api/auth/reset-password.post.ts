import { serverSupabaseClient } from '#supabase/server'

interface Payload {
  email: string
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const body = await readBody<Payload>(event)

  if (!body.email) {
    return {
      success: false,
      message: 'Email is required.',
    }
  }

  const { origin } = getRequestURL(event)

  const { error } = await client.auth.resetPasswordForEmail(body.email, {
    redirectTo: `${origin}/admin/update-password`,
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
    message: 'Password reset email sent.',
  }
})
