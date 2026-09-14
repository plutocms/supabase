import { serverSupabaseClient } from '#supabase/server'
import { z } from 'zod'
import { requireCapability } from '../../utils/capability-guard'
import { parseBody } from '../../utils/validate'

// A key is lowercase segments separated by dots, e.g. 'website_title' or
// 'blog.posts_per_page'. Mirrors the settings_setting_key_format check
// constraint in db/migrations/003_settings_generic_keys.sql — this turns
// a violation into a clean 400 instead of a raw Postgres error. A layer
// other than core must namespace its own keys so two layers can never
// collide.
const SETTING_KEY_PATTERN = /^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/
const MAX_SETTING_VALUE_LENGTH = 10_000

const settingsUpdateSchema = z.record(
  z
    .string()
    .regex(
      SETTING_KEY_PATTERN,
      'Setting key must use lowercase letters, digits, underscores, and dot-separated segments.'
    ),
  z.string().max(MAX_SETTING_VALUE_LENGTH, 'Setting value is too long.')
)

export default defineEventHandler(async (event) => {
  await requireCapability(event, 'settings:manage')

  const client = await serverSupabaseClient<Database>(event)
  const body = await parseBody(event, settingsUpdateSchema)

  const transformed = Object.entries(body).map(([key, value]) => ({
    setting_key: key,
    setting_value: value,
  }))

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
