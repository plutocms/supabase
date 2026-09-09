<script setup lang="ts">
const route = useRoute()
const session = useSupabaseSession()

const shouldShowNavbar = computed(() => {
  return route.path === '/admin'
    || route.path.startsWith('/admin/')
    || Boolean(session.value)
})
</script>

<template>
  <NavbarAdmin v-if="shouldShowNavbar" />
</template>
