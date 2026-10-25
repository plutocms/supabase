<script setup lang="ts">
// The invite link in a read-only field with a copy button, and the note: the
// link works once and expires.
defineProps<{
  link: string
}>()

const { t } = usePlutoI18n()
</script>

<template>
  <UFormField :label="t('supabase.access.link.label')" :help="t('supabase.access.link.note')">
    <UInput :model-value="link" class="w-full" readonly @focus="($event.target as HTMLInputElement).select()">
      <template #trailing>
        <AccessCopyButton :text="link" :label="t('supabase.access.link.copy')" />
      </template>
    </UInput>
  </UFormField>
</template>
