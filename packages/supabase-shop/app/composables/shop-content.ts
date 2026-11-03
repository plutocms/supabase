import type { MaybeRefOrGetter } from 'vue'
import type {
  PublicProduct,
  PublicProductTaxonomy,
} from '../../shared/types/product'

// The composables of the public shop types, on `definePlutoContent` of core. See the
// shop-products skill ("Composables").

const products = definePlutoContent<PublicProduct>('product')
const categories = definePlutoContent<PublicProductTaxonomy>('product-category')

/**
 * The published products, with pages (`?page=` of the URL). `products` is the list.
 *
 * @example
 * const { products, pages } = await useProducts({ limit: 12, filter: { category: 'mugs' } })
 */
export function useProducts(options: PlutoContentListOptions = {}) {
  const result = products.useList(options)
  return extendPlutoAsyncData(result, { products: result.items })
}

/**
 * One product, by slug or id. A missing product shows the error page (404). It sets the SEO
 * tags and the admin bar "Edit Product". `product` is the product.
 *
 * @example
 * const { product } = await useProduct(() => String(route.params.slug))
 */
export function useProduct(
  slug: MaybeRefOrGetter<string | number>,
  options: PlutoContentItemOptions = {}
) {
  const result = products.useItem(slug, options)
  return extendPlutoAsyncData(result, { product: result.item })
}

/** Every product category (up to 100, one page). `categories` is the list. */
export function useProductCategories(options: PlutoContentListOptions = {}) {
  const result = categories.useList({ limit: 100, page: false, ...options })
  return extendPlutoAsyncData(result, { categories: result.items })
}
