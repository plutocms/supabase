<script setup lang="ts">
// The public pages of the playground: a header with the posts, the shop, the cart and the admin.
// As plain as can be, to see the posts and the products of the Supabase project on a site.
const site = usePlutoSite()
const cart = useCart()
</script>

<template>
  <div class="bg-default min-h-dvh">
    <header class="border-default border-b">
      <UContainer class="flex h-14 items-center justify-between gap-4">
        <NuxtLink to="/" class="text-highlighted font-semibold">
          {{ site.name }}
        </NuxtLink>
        <nav class="flex items-center gap-4 text-sm">
          <NuxtLink to="/" class="text-muted hover:text-highlighted">
            Posts
          </NuxtLink>
          <NuxtLink to="/shop" class="text-muted hover:text-highlighted">
            Shop
          </NuxtLink>
          <NuxtLink to="/cart" class="text-muted hover:text-highlighted">
            Cart
            <ClientOnly>
              <UBadge
                v-if="cart.count.value"
                :label="String(cart.count.value)"
                size="sm"
                variant="subtle"
                class="ms-1"
              />
            </ClientOnly>
          </NuxtLink>
          <NuxtLink to="/admin" class="text-muted hover:text-highlighted">
            Admin
          </NuxtLink>
        </nav>
      </UContainer>
    </header>

    <UContainer as="main" class="max-w-4xl py-10">
      <slot />
    </UContainer>
  </div>
</template>
