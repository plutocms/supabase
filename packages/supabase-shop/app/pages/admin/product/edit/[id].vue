<script setup lang="ts">
const route = useRoute('admin-product-edit-id')
const { t } = usePlutoI18n()

useHead({
  title: () => t('supabase-shop.navbar.editProduct'),
})
</script>

<template>
  <PlutoContentForm :id="route.params.id as string" type="product" />
</template>
