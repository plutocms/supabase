<script setup lang="ts">
// Shows an invite link for a user that already exists. Opened with useOverlay
// from the Users page.
defineProps<{
  link: string
}>()

const emit = defineEmits<{ close: [value: boolean] }>()
const { t } = usePlutoI18n()
</script>

<template>
  <UModal
    :title="t('supabase.access.link.title')"
    :close="{ onClick: () => emit('close', false) }"
  >
    <template #body>
      <AccessLinkField :link="link" />
    </template>

    <template #footer>
      <div class="flex w-full justify-end">
        <UButton color="neutral" variant="outline" @click="emit('close', false)">
          {{ t('pluto.common.close') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
