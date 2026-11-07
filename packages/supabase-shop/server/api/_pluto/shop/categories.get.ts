import { serverSupabaseClient } from '#supabase/server'

/** The categories for the admin forms. The storefront reads `/api/pluto/v1/content/product-category`. */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)

  const { data, error } = await client
    .from('product_category')
    .select('*')
    // A manager can read the trashed ones (RLS), but a form never offers them.
    .is('deleted_at', null)
    .order('label', { ascending: true })

  if (error) {
    throw createPlutoError({
      statusCode: 500,
      message: 'Could not load the categories.',
      key: 'supabase-shop.errors.categoriesLoadFailed',
    })
  }

  return { data }
})
