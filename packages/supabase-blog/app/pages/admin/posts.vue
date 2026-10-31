<script setup lang="ts">
const { t } = usePlutoI18n()

useHead({
  title: () => t('supabase-blog.nav.posts'),
})
</script>

<template>
  <PlutoContentList type="post" />
</template>
