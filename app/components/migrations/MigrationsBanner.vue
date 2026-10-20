<script setup lang="ts">
// The pending-migrations notice. It is an `adminBanners` entry of this layer,
// so the core admin layout renders it at the top of the admin pages.
// Renders nothing when there is no logged-in admin (status reads as null)
// or when no layer is pending. See `useMigrations` for the 401/403 handling.
// It also hides on the migrations page itself.
const route = useRoute()
const { status, pendingCount } = useMigrations()
const { t } = usePlutoI18n()

const title = computed(() =>
  t('supabase.migrations.banner', pendingCount.value)
)

const isVisible = computed(
  () =>
    Boolean(status.value)
    && pendingCount.value > 0
    && !route.path.startsWith('/admin/migrations')
)
</script>

<template>
  <ClientOnly>
    <Container v-if="isVisible" class="pt-4">
      <UAlert
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
    </Container>
  </ClientOnly>
</template>
