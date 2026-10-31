import { productToPublic } from '../utils/product-public'

/**
 * Registers the content types of this layer with core's generic content
 * routes and with the public API, at Nitro startup. The `toPublic` hook is
 * attached here, server-side only, so `shared/utils/content-product.ts` itself
 * stays free of server-only imports.
 *
 * `productType` is not explicitly imported — see the doc comment atop
 * `shared/utils/content-product.ts` for why an explicit
 * `#shared/content/product` import broke for any real consumer of this
 * layer, and why living under `shared/utils/` with no explicit import
 * fixes it.
 *
 * The two taxonomies are public content types for the public API only.
 * The client does not register them, so the admin shows no entry for them.
 */
export default defineNitroPlugin(() => {
  registerContentType({
    ...productType,
    hooks: {
      toPublic: productToPublic,
    },
  })
  registerContentType(productCategoryType)
  registerContentType(productAvailabilityType)
})
