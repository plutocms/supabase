<script setup lang="ts">
// Renders nothing when there is no logged-in admin (status reads as null)
// or when no layer is pending. See `useMigrations` for the 401/403 handling.
const { status, pendingCount } = useMigrations()
const { t } = usePlutoI18n()

const title = computed(() =>
  t('supabase.migrations.banner', pendingCount.value)
)
</script>

<template>
  <UAlert
    v-if="status && pendingCount > 0"
    :title="title"
    color="warning"
    variant="subtle"
    icon="lucide:triangle-alert"
  >
    <template #description>
      <ULink to="/admin/migrations" class="underline"> {{ t('supabase.migrations.goTo') }} </ULink
      >.
    </template>
  </UAlert>
</template>
