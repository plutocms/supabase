import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../utils/admin-guard'

// A key is lowercase segments separated by dots, e.g. 'website_title' or
// 'blog.posts_per_page'. Mirrors the settings_setting_key_format check
// constraint in db/migrations/003_settings_generic_keys.sql — this turns
// a violation into a clean 400 instead of a raw Postgres error. A layer
// other than core must namespace its own keys so two layers can never
// collide.
const SETTING_KEY_PATTERN = /^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/
const MAX_SETTING_VALUE_LENGTH = 10_000

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const client = await serverSupabaseClient<Database>(event)
  const body = await readBody<Record<string, unknown>>(event)

  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'No payload sent.' })
  }

  const transformed = Object.entries(body).map(([key, value]) => {
    if (!SETTING_KEY_PATTERN.test(key)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid setting key: ${key}`,
      })
    }

    if (typeof value !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: `Setting "${key}" must be a string.`,
      })
    }

    if (value.length > MAX_SETTING_VALUE_LENGTH) {
      throw createError({
        statusCode: 400,
        statusMessage: `Setting "${key}" is too long.`,
      })
    }

    return {
      setting_key: key,
      setting_value: value,
    }
  })

  const { data, error } = await client
    .from('settings')
    .upsert(transformed, { onConflict: 'setting_key' })
    .select()

  if (error) {
    throw createError({ statusMessage: error.message })
  }

  return {
    message: 'Settings updated successfully.',
    statusCode: 200,
    data,
  }
})
