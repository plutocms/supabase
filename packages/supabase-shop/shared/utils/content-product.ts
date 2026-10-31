// The `product` content type. It maps onto the `products` table columns
// from `db/migrations/001_baseline.sql`: id, slug, name, description,
// price, created_at, category, is_custom, stock_quantity, availability,
// and media (`db/migrations/006_core_media.sql`).
// See the content-model skill in `@plutocms/core` for the full
// field/status/timestamp contract.
//
// `defineContentType` and the field types come from `@plutocms/core`'s
// `shared/utils`/`shared/types`, auto-imported the same way every other
// shared/utils export is across this layer. This file needs no explicit
// import for them, and no server-only imports either — the `toPublic`
// hook lives in `server/utils/product-public.ts` and is attached in
// `server/plugins/content.ts`, not here.
//
// This file lives under `shared/utils/`, not a bespoke `shared/content/`
// folder — load-bearing, not stylistic. Nuxt's shared-imports auto-import
// only wires a real runtime import for names under `shared/utils/**` and
// `shared/types/**`; a value exported from an arbitrary `shared/`
// subfolder gets a type-only declaration (enough for `nuxi typecheck`) but
// no actual import in the compiled bundle. That gap only shows up for a
// *consumer* extending this layer as a dependency, so wave 6 shipped
// `productType` under `shared/content/` with an explicit
// `#shared/content/product` import — an alias that resolves only to the
// *top-level app's own* `shared/` folder, never to this layer's. Any real
// site extending this layer crashed at Nitro startup ("productType is not
// defined"). Moving the file here and dropping the explicit import is the
// fix, confirmed the same way for `@plutocms/supabase-blog`'s equivalent
// `postType` against `pluto-supabase-blog-template`.
//
// `media` holds the ids of the files of the core media library, in order
// (the `products.media` jsonb column). The core `media` widget edits it, and
// the public API gives the records in place of the ids. See the media skill
// in `@plutocms/core`.
//
// `basePath`/`newPath`/`editPath` point the generic list and form UI at
// this layer's existing, already-deployed admin URLs
// (`/admin/products`, `/admin/product/new`, `/admin/product/edit/:id`)
// instead of the `/admin/content/product` convention `autoRoutes` would
// otherwise imply. `autoRoutes: false` keeps this content type from
// generating its own nav/pages entries — `app/plugins/pluto-extension.ts`
// already declares them by hand, at these same URLs.
export const productType = defineContentType({
  name: 'product',
  label: 'Product',
  labelPlural: 'Products',
  icon: 'lucide:box',
  source: 'products',
  titleField: 'name',
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Name',
      description: 'The name shown in the store.',
      required: true,
      inList: true,
      region: 'main',
      order: 10,
    },
    {
      name: 'media',
      type: 'media',
      label: 'Media',
      description: 'Photos of the piece, and one optional 3D model.',
      multiple: true,
      accept: ['image/*', 'model/gltf-binary'],
      region: 'main',
      order: 20,
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      description: 'The text shown on the product page.',
      region: 'main',
      order: 30,
    },
    // The price is integer cents. `listFormat` shows it as money in the generic list.
    {
      name: 'price',
      type: 'number',
      label: 'Price',
      description: 'The price shown in the store.',
      required: true,
      integer: true,
      min: 0,
      inList: true,
      listFormat: (value) =>
        typeof value === 'number' ? formatProductPrice(value) : '',
      widget: 'product-price',
      region: 'side',
      order: 50,
    },
    {
      name: 'is_custom',
      type: 'boolean',
      label: 'Is custom',
      description:
        'Turn this on if you make the piece only when a customer orders it. The availability becomes "commission".',
      widget: 'product-is-custom',
      region: 'side',
      order: 60,
    },
    {
      name: 'availability',
      type: 'reference',
      label: 'Availability',
      description: 'Tells the customer if the piece can be bought now.',
      optionsUrl: '/api/_pluto/shop/availability',
      labelKey: 'label',
      valueKey: 'id',
      widget: 'product-availability',
      region: 'side',
      order: 70,
    },
    {
      name: 'stock_quantity',
      type: 'number',
      label: 'Stock quantity',
      description:
        'How many units you have. It shows only for pieces in stock.',
      min: 0,
      widget: 'product-stock',
      region: 'side',
      order: 80,
    },
    {
      name: 'category',
      type: 'reference',
      label: 'Category',
      description: 'Groups similar pieces in the store.',
      optionsUrl: '/api/_pluto/shop/categories',
      labelKey: 'label',
      valueKey: 'id',
      widget: 'product-category',
      region: 'side',
      order: 90,
    },
    {
      name: 'slug',
      type: 'slug',
      label: 'Slug',
      description:
        'The last part of the product link. It comes from the name. Use lowercase letters, numbers and hyphens.',
      from: 'name',
      preview: '/product/',
      required: true,
      inList: true,
      region: 'side',
      order: 100,
    },
  ],
  slug: { field: 'slug' },
  status: false,
  timestamps: { created: 'created_at', updated: false },
  capabilities: { write: 'products:manage', delete: 'products:delete' },
  autoRoutes: false,
  // The public API (`/api/pluto/v1/content/product`). The list of fields is
  // explicit, so a column added later stays private until someone adds it
  // here. Core gives the records of `media` in place of the ids. The server
  // hook `toPublic` turns `category` and `availability` into objects.
  api: {
    public: true,
    fields: [
      'name',
      'slug',
      'description',
      'price',
      'is_custom',
      'stock_quantity',
      'category',
      'availability',
      'media',
    ],
  },
  basePath: '/admin/products',
  newPath: '/admin/product/new',
  editPath: (id) => `/admin/product/edit/${id}`,
  // "New Product" in the admin bar, and "Edit Product" on a product page that
  // calls `usePlutoEditLink('product', product.id)`.
  adminBar: true,
  // The "View Product" link of the form: the product page of the shop template
  // (`pages/product/[slug].vue`).
  previewUrl: (item) =>
    typeof item.slug === 'string' && item.slug
      ? `/product/${item.slug}`
      : undefined,
})
