// The cart of @plutocms/shop: a product has the units in stock in `stock_quantity`, and
// `is_custom` (made to order) has no stock limit.
export default defineAppConfig({
  plutoShop: {
    cart: {
      stockField: 'stock_quantity',
      madeToOrderField: 'is_custom',
    },
  },
})
