<script setup lang="ts">
const route = useRoute('admin-post-edit-id')
const { t } = usePlutoI18n()

useHead({
  title: () => t('supabase-blog.navbar.editPost'),
})
</script>

<template>
  <PlutoContentForm :id="route.params.id as string" type="post" />
</template>
