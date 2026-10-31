import { serverSupabaseClient } from '#supabase/server'

/** The categories for the admin forms. The storefront reads `/api/pluto/v1/content/product-category`. */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)

  const { data, error } = await client
    .from('product_category')
    .select('*')
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
