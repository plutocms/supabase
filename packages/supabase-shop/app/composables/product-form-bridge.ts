/**
 * Cross-field state shared by the product form's `is_custom`, `availability`,
 * and `stock_quantity` widgets. It exists to preserve the rule
 * `Post.vue` used to enforce with a single `watch`: a custom product is
 * always "commission" availability with no stock quantity.
 *
 * Each of the three fields renders as its own, separately resolved widget
 * component (see the content-model skill), with no direct access to the
 * others' props. `useState` gives them one shared, reactive place to read
 * and write that rule from, scoped per page load like every other
 * `useState`.
 */
export function useProductFormBridge() {
  return useState('shop:product-form', () => ({
    isCustom: false,
    availabilitySlug: null as string | null,
  }))
}
