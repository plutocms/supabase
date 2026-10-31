import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)

  const { data } = await client
    .from('settings')
    .select('setting_key, setting_name, setting_value')

  const settings: Record<string, string> = {}

  data?.forEach((item) => {
    // setting_key is null only for a row written before
    // db/migrations/003_settings_generic_keys.sql backfilled it — fall
    // back to the enum column so a mid-migration read never drops a row.
    const key = item.setting_key ?? item.setting_name

    if (!key || !item.setting_value) {
      return
    }

    settings[key] = item.setting_value
  })

  return { settings }
})
