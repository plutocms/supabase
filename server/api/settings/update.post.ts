import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../utils/admin-guard'

// Mirrors the TSettings enum in db/migrations/001_baseline.sql. The Postgres enum
// already rejects an unknown key at the DB level (as a raw constraint
// error) — this turns that into a clean 400 instead.
const KNOWN_SETTING_KEYS = [
  'website_title',
  'website_url',
  'website_description',
] as const

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  type SettingName =
    Database['public']['Tables']['settings']['Insert']['setting_name']
  type FormBody = Record<SettingName, string>

  const client = await serverSupabaseClient<Database>(event)
  const body = await readBody<FormBody>(event)

  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'No payload sent.' })
  }

  const transformed = Object.entries(body).map(([key, value]) => {
    if (
      !KNOWN_SETTING_KEYS.includes(key as (typeof KNOWN_SETTING_KEYS)[number])
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: `Unknown setting: ${key}`,
      })
    }

    if (typeof value !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: `Setting "${key}" must be a string.`,
      })
    }

    return {
      setting_name: key as SettingName,
      setting_value: value,
    }
  })

  const { data, error } = await client
    .from('settings')
    .upsert(transformed, { onConflict: 'setting_name' })
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
