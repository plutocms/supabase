<script setup lang="ts">
// Renders nothing when there is no logged-in admin (status reads as null)
// or when no layer is pending. See `useMigrations` for the 401/403 handling.
const { status, pendingCount } = useMigrations()

const title = computed(() =>
  pendingCount.value === 1
    ? '1 layer needs a database migration'
    : `${pendingCount.value} layers need a database migration`
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
      <ULink to="/admin/migrations" class="underline"> Go to Migrations </ULink
      >.
    </template>
  </UAlert>
</template>
