import { serverSupabaseClient } from '#supabase/server'

type HealthcheckSettingKey =
  Database['public']['Tables']['healthcheck']['Row']['config_name']

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)

  const { data, error } = await client.from('healthcheck').select('*')

  if (error) {
    throw createPlutoError({
      statusCode: 500,
      message: `Could not read the setup state: ${error.message}`,
      key: 'supabase.errors.setupStateRead',
      params: { message: error.message },
    })
  }

  // @ts-expect-error: Object.fromEntries may not infer the correct type
  const isFirstSetup: Record<HealthcheckSettingKey, string> = {
    ...Object.fromEntries(
      data?.map((item) => [item.config_name, item.config_value]) || []
    ),
  }

  data?.forEach((item) => {
    if (!item.config_name || !item.config_value) {
      return
    }

    isFirstSetup[item.config_name] = item.config_value
  })

  return {
    success: true as const,
    message: 'Healthcheck settings retrieved successfully',
    is_first_setup: isFirstSetup.first_setup === 'true',
  }
})
