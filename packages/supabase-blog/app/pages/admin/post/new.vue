<script setup lang="ts">
const { t } = usePlutoI18n()

useHead({
  title: () => t('supabase-blog.pages.newPost'),
})
</script>

<template>
  <PlutoContentForm type="post" />
</template>
