import { defineAsyncComponent } from 'vue'
// The product field widgets load on demand and stay out of the entry chunk. Core shows a
// skeleton for each field while its chunk loads.
const PlutoProductAvailabilityField = defineAsyncComponent(
  () => import('../components/PlutoProductAvailabilityField.vue')
)
const PlutoProductCategoryField = defineAsyncComponent(
  () => import('../components/PlutoProductCategoryField.vue')
)
const PlutoProductIsCustomField = defineAsyncComponent(
  () => import('../components/PlutoProductIsCustomField.vue')
)
const PlutoProductPriceField = defineAsyncComponent(
  () => import('../components/PlutoProductPriceField.vue')
)
const PlutoProductStockField = defineAsyncComponent(
  () => import('../components/PlutoProductStockField.vue')
)

export default defineNuxtPlugin(() => {
  definePlutoExtension({
    id: 'supabase-shop',
    capabilities: [
      {
        id: 'products-manage',
        key: 'products:manage',
        label: 'supabase-shop.capabilities.productsManage',
      },
      {
        id: 'products-delete',
        key: 'products:delete',
        label: 'supabase-shop.capabilities.productsDelete',
      },
      {
        id: 'shop-manage-taxonomy',
        key: 'shop:manage_taxonomy',
        label: 'supabase-shop.capabilities.manageTaxonomy',
      },
    ],
    nav: [
      {
        id: 'products',
        order: 300,
        label: 'supabase-shop.nav.products',
        icon: 'lucide:box',
        to: '/admin/products',
        defaultOpen: true,
        children: [
          {
            label: 'supabase-shop.nav.createProduct',
            to: '/admin/product/new',
          },
          { label: 'supabase-shop.nav.allProducts', to: '/admin/products' },
        ],
      },
    ],
    pages: [
      {
        id: 'products',
        path: '/admin/products',
        title: 'supabase-shop.nav.products',
        icon: 'lucide:box',
      },
      {
        id: 'product-new',
        path: '/admin/product/new',
        title: 'supabase-shop.pages.newProduct',
        parent: 'supabase-shop:products',
      },
    ],
    contentTypes: [{ id: 'product', type: productType }],
    // Registered by `widget:` name only, never bare `fieldType:` — a
    // `fieldType`-keyed entry becomes the app-wide default for every
    // layer's fields of that type, which would hijack blog's (or any
    // other layer's) fields of the same type.
    contentFieldWidgets: [
      {
        id: 'product-price',
        widget: 'product-price',
        component: PlutoProductPriceField,
      },
      {
        id: 'product-is-custom',
        widget: 'product-is-custom',
        component: PlutoProductIsCustomField,
      },
      {
        id: 'product-availability',
        widget: 'product-availability',
        component: PlutoProductAvailabilityField,
      },
      {
        id: 'product-stock',
        widget: 'product-stock',
        component: PlutoProductStockField,
      },
      {
        id: 'product-category',
        widget: 'product-category',
        component: PlutoProductCategoryField,
      },
    ],
  })
})
