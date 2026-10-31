<script setup lang="ts">
const { t } = usePlutoI18n()

useHead({
  title: () => t('supabase-shop.nav.products'),
})
</script>

<template>
  <PlutoContentList type="product" />
</template>
