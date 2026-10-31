// The taxonomies of the shop as content types: `product-category` and
// `product-availability`. They exist for the public API. A storefront reads
// them at `/api/pluto/v1/content/product-category` and
// `/api/pluto/v1/content/product-availability`.
//
// A layer registers them on the server only (`server/plugins/content.ts`).
// They are not in the client registry, so they have no admin nav entry,
// dashboard tile or command palette item. The admin edits categories with
// the routes under `/api/_pluto/shop/`.
//
// `product_category` has no `created_at` column and no `updated_at` column.
// `product_availability` has no `updated_at` column. `timestamps: false`
// keeps the adapter away from columns that do not exist.
//
// `shop:manage_taxonomy` gates the writes of the category.
// `shop:manage_availability` gates the writes of the availability. No role
// has it, so only an admin (the wildcard capability) passes. The admin has
// no screen that writes availability. A type with no write capability would
// fail open in core, so the availability must name one.
//
// This file lives under `shared/utils/` for the same reason as
// `content-product.ts`: Nuxt auto-imports the value only from there.

export const productCategoryType = defineContentType({
  name: 'product-category',
  label: 'Product category',
  labelPlural: 'Product categories',
  icon: 'lucide:tags',
  source: 'product_category',
  titleField: 'label',
  fields: [
    {
      name: 'label',
      type: 'text',
      label: 'Label',
      required: true,
      inList: true,
    },
    {
      name: 'slug',
      type: 'slug',
      label: 'Slug',
      from: 'label',
      required: true,
      inList: true,
    },
    { name: 'description', type: 'textarea', label: 'Description' },
  ],
  slug: { field: 'slug' },
  status: false,
  timestamps: false,
  capabilities: {
    write: 'shop:manage_taxonomy',
    delete: 'shop:manage_taxonomy',
  },
  autoRoutes: false,
  api: { public: true, fields: ['label', 'slug', 'description'] },
})

export const productAvailabilityType = defineContentType({
  name: 'product-availability',
  label: 'Product availability',
  labelPlural: 'Product availabilities',
  icon: 'lucide:package-check',
  source: 'product_availability',
  titleField: 'label',
  fields: [
    {
      name: 'label',
      type: 'text',
      label: 'Label',
      required: true,
      inList: true,
    },
    {
      name: 'slug',
      type: 'slug',
      label: 'Slug',
      from: 'label',
      required: true,
      inList: true,
    },
  ],
  slug: { field: 'slug' },
  status: false,
  timestamps: false,
  capabilities: {
    write: 'shop:manage_availability',
    delete: 'shop:manage_availability',
  },
  autoRoutes: false,
  api: { public: true, fields: ['label', 'slug'] },
})
