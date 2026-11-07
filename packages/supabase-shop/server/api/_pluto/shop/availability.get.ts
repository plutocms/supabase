import { serverSupabaseClient } from '#supabase/server'

/** The availability statuses for the admin forms. The storefront reads `/api/pluto/v1/content/product-availability`. */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)

  const { data, error } = await client
    .from('product_availability')
    .select('id, label, slug')
    // A manager can read the trashed ones (RLS), but a form never offers them.
    .is('deleted_at', null)
    .order('id', { ascending: true })

  if (error) {
    throw createPlutoError({
      statusCode: 500,
      message: 'Could not load the availability statuses.',
      key: 'supabase-shop.errors.availabilityLoadFailed',
    })
  }

  return { data }
})
