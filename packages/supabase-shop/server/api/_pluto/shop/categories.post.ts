import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

/** Matches `product_category`'s real columns (see db/migrations/001_baseline.sql): `slug` and `label` are required, `description` is optional. */
export const newCategoryPayloadSchema = z.object({
  slug: z.string().trim().min(1, 'A non-empty slug is required.'),
  label: z.string().trim().min(1, 'A non-empty label is required.'),
  description: z.string().nullish(),
})

export default defineEventHandler(async (event) => {
  await requireCapability(event, 'shop:manage_taxonomy')

  const client = await serverSupabaseClient<Database>(event)

  const body = await parseBody(event, newCategoryPayloadSchema)

  const { data, error } = await client
    .from('product_category')
    .insert({
      slug: body.slug,
      label: body.label,
      description: body.description ?? null,
    })
    .select()
    .single()

  if (error) {
    throw createPlutoError({
      statusCode: 500,
      message: 'Could not create the category.',
      key: 'supabase-shop.errors.categoryCreateFailed',
    })
  }

  return { data }
})
