import type { Database } from '#shared/types/supabase'

/** A category or an availability status in the public answer of a product. */
export type PublicProductTaxonomy = Pick<
  Database['public']['Tables']['product_category']['Row'],
  'id' | 'label' | 'slug'
>

/**
 * One product in the answer of `/api/pluto/v1/content/product`. The
 * `toPublic` hook of the layer turns `category` and `availability` into
 * objects. Core gives the records of `media` (the media skill of
 * `@plutocms/core`).
 */
export interface PublicProduct {
  id: number
  name: string
  slug: string
  description: string | null
  price: number
  is_custom: boolean
  stock_quantity: number
  category: PublicProductTaxonomy | null
  availability: PublicProductTaxonomy | null
  media: PlutoPublicMedia[]
  createdAt?: string
}

export type Product = Database['public']['Tables']['products']['Row']
