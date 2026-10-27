import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { parseBody } from '../../../../utils/validate'

// Supabase Auth (GoTrue) rejects a password under 6 characters with its own
// opaque error. Matching that minimum here turns an empty/short password
// into the same clean 400 shape as every other validation failure, instead
// of a raw auth-service error reaching the caller.
const signupSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters.').max(100),
  display_name: z.string().trim().min(1, 'Display name is required.').max(200),
  email: z.string().trim().email('Email must be a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)

  const body = await parseBody(event, signupSchema)

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
    // A 4xx from Supabase Auth keeps its status (for example 429 for a rate
    // limit). Any other status becomes a 502. The code goes in `data`, so
    // the signup page can show the translated text of a known code.
    const status = error.status ?? 400
    throw createPlutoError({
      statusCode: status >= 400 && status < 500 ? status : 502,
      message: error.message,
      key: 'supabase.errors.signupFailed',
      data: { code: error.code },
    })
  }

  return {
    success: true,
    message: 'User registered successfully',
    data,
  }
})
