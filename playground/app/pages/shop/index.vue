<script setup lang="ts">
// The products, newest first: a picture, the name and the price.
const { data, error } = await usePlutoPublicList<PublicProduct>('product', {
  limit: 24,
  sort: '-createdAt',
})

const products = computed(() => data.value?.data ?? [])

function picture(product: PublicProduct) {
  return product.media.find((file) => file.mimeType?.startsWith('image/'))
}
</script>

<template>
  <div>
    <h1 class="text-highlighted text-2xl font-semibold">Shop</h1>

    <p v-if="error" class="text-error mt-6">
      Could not load the products: {{ error.statusMessage || error.message }}
    </p>

    <p v-else-if="!products.length" class="text-muted mt-6">
      No products yet.
      <NuxtLink to="/admin" class="text-primary"
        >Add one in the admin.</NuxtLink
      >
    </p>

    <ul class="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3">
      <li v-for="product in products" :key="product.id">
        <NuxtLink :to="`/shop/${product.slug}`" class="group block">
          <PlutoImage
            v-if="picture(product)"
            :media="picture(product)!"
            class="bg-elevated aspect-square w-full rounded-lg object-cover"
          />
          <div v-else class="bg-elevated aspect-square w-full rounded-lg" />
          <p class="text-highlighted mt-2 font-medium group-hover:underline">
            {{ product.name }}
          </p>
          <p class="text-muted text-sm">
            {{ formatProductPrice(product.price) }}
          </p>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
