<script setup lang="ts">
// The cart of the shop add-on (saved in the browser): the lines, their quantity, and the
// subtotal. No checkout: the playground only shows the cart.
const cart = useCart<PublicProduct>()

onMounted(() => cart.refresh())
</script>

<template>
  <div>
    <h1 class="text-highlighted text-2xl font-semibold">Cart</h1>

    <ClientOnly>
      <p v-if="cart.isEmpty.value" class="text-muted mt-6">
        The cart is empty.
        <NuxtLink to="/shop" class="text-primary">See the products.</NuxtLink>
      </p>

      <template v-else>
        <ul class="divide-default mt-6 divide-y">
          <li
            v-for="line in cart.lines.value"
            :key="line.product.id"
            class="flex items-center gap-4 py-3"
          >
            <NuxtLink
              :to="`/shop/${line.product.slug}`"
              class="text-highlighted min-w-0 flex-1 truncate font-medium"
            >
              {{ line.product.name }}
            </NuxtLink>
            <UInputNumber
              :model-value="line.quantity"
              :min="1"
              :max="line.limit"
              size="sm"
              class="w-28"
              @update:model-value="
                (value) => cart.setQuantity(line.product.id, value ?? 1)
              "
            />
            <span class="w-20 text-end">
              {{ formatProductPrice(line.subtotal) }}
            </span>
            <UButton
              aria-label="Remove"
              icon="i-lucide-trash"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="cart.remove(line.product.id)"
            />
          </li>
        </ul>

        <p class="text-highlighted mt-6 text-end text-lg font-semibold">
          Subtotal: {{ formatProductPrice(cart.subtotal.value) }}
        </p>
      </template>
    </ClientOnly>
  </div>
</template>
