import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { parseBody } from '../../utils/validate'

const localeSchema = z.object({
  locale: z.string().nullable(),
})

/**
 * True when PostgREST says the function does not exist. PGRST202 is
 * PostgREST's own "function not found" code. 42883 is the Postgres code.
 */
function isMissingFunction(error: {
  code?: string
  message?: string
}): boolean {
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    /could not find the function/i.test(error.message ?? '')
  )
}

/**
 * Stores the calling user's admin language. Pass `null` for Automatic.
 *
 * The write goes through `public.set_my_locale()`, a SECURITY DEFINER
 * function from 005_profile_locale.sql. `profiles` has no UPDATE policy on
 * purpose, so a user can never write `is_admin`.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createPlutoError({
      statusCode: 401,
      message: 'You must be logged in.',
      key: 'supabase.errors.notLoggedIn',
    })
  }

  const { locale } = await parseBody(event, localeSchema)
  const { adminLocales } = useRuntimeConfig().public.plutoI18n

  if (locale !== null && !adminLocales.includes(locale)) {
    throw createPlutoError({
      statusCode: 400,
      message: 'This language is not supported.',
      key: 'supabase.errors.localeUnsupported',
    })
  }

  const client = await serverSupabaseClient<Database>(event)
  const { error } = await client.rpc('set_my_locale', {
    new_locale: locale as string,
  })

  if (error) {
    if (isMissingFunction(error)) {
      throw createPlutoError({
        statusCode: 409,
        message: 'Apply the pending database migrations to save your language.',
        key: 'supabase.profile.migrationPending',
      })
    }

    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { locale }
})
