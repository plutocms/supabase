<script setup lang="ts">
const route = useRoute()
const session = useSupabaseSession()

const shouldShowNavbar = computed(() => {
  if (allowedUnauthenticatedPaths.includes(route.path)) {
    return false
  }

  return route.path === '/admin'
    || route.path.startsWith('/admin/')
    || Boolean(session.value)
})
</script>

<template>
  <NavbarAdmin v-if="shouldShowNavbar" />
</template>
