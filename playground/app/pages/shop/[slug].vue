<script setup lang="ts">
// One product: its pictures, the price, the stock and the description, and Add to cart (the cart
// of the shop add-on, in the browser).
const route = useRoute()

const { data, error } = await usePlutoPublicItem<PublicProduct>('product', () =>
  String(route.params.slug)
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found' })
}

const product = computed(() => data.value?.data)
const pictures = computed(
  () =>
    product.value?.media.filter((file) =>
      file.mimeType?.startsWith('image/')
    ) ?? []
)

usePlutoEditLink('product', () => product.value?.id)

const cart = useCart<PublicProduct>()
const inCart = computed(() =>
  product.value ? cart.quantityOf(product.value.id) : 0
)
const limit = computed(() => (product.value ? cart.limitOf(product.value) : 0))

const stock = computed(() => {
  const item = product.value
  if (!item) {
    return ''
  }
  if (item.is_custom) {
    return 'Made to order'
  }
  return item.stock_quantity > 0
    ? `${item.stock_quantity} in stock`
    : 'Sold out'
})
</script>

<template>
  <article v-if="product">
    <NuxtLink to="/shop" class="text-muted hover:text-highlighted text-sm">
      ← All products
    </NuxtLink>

    <div class="mt-8 grid gap-8 sm:grid-cols-2">
      <div class="flex flex-col gap-3">
        <PlutoImage
          v-for="file in pictures"
          :key="file.id"
          :media="file"
          class="bg-elevated w-full rounded-lg"
        />
        <div
          v-if="!pictures.length"
          class="bg-elevated aspect-square w-full rounded-lg"
        />
      </div>

      <div>
        <p v-if="product.category" class="text-muted text-sm">
          {{ product.category.label }}
        </p>
        <h1 class="text-highlighted text-3xl font-semibold">
          {{ product.name }}
        </h1>
        <p class="text-highlighted mt-3 text-xl">
          {{ formatProductPrice(product.price) }}
        </p>
        <p class="text-muted mt-1 text-sm">{{ stock }}</p>

        <ClientOnly>
          <UButton
            :disabled="inCart >= limit"
            :label="
              inCart ? `Add one more (${inCart} in the cart)` : 'Add to cart'
            "
            icon="i-lucide-shopping-cart"
            class="mt-6"
            @click="cart.add(product)"
          />
        </ClientOnly>

        <p v-if="product.description" class="mt-6 whitespace-pre-line">
          {{ product.description }}
        </p>
      </div>
    </div>
  </article>
</template>
