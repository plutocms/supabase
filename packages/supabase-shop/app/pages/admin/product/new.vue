<script setup lang="ts">
const { t } = usePlutoI18n()

useHead({
  title: () => t('supabase-shop.pages.newProduct'),
})
</script>

<template>
  <PlutoContentForm type="product" />
</template>
