<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const { t } = usePlutoI18n()

useHead({
  title: () => t('supabase.auth.confirm.pageTitle'),
})
</script>

<template>
  <PlutoAdminAuthCard :title="t('supabase.auth.confirm.title')">
    <div class="space-y-6 py-10">
      <div class="text-center space-y-4">
        <hgroup class="flex flex-col gap-y-1">
          <span class="text-5xl">
            <UIcon name="lucide:mail-check" class="inline-block" />
          </span>
        </hgroup>

        <p>
          {{ t('supabase.auth.confirm.description') }}
        </p>

        <div class="flex items-center justify-center gap-x-4">
          <UButton to="/admin" color="primary" icon="lucide:layout-dashboard">
            {{ t('supabase.auth.confirm.goToDashboard') }}
          </UButton>
        </div>
      </div>
    </div>
  </PlutoAdminAuthCard>
</template>
