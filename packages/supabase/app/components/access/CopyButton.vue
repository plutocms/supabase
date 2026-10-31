<script setup lang="ts">
// A small button that copies a text. The tooltip says "Copied" for 2 seconds.
const props = defineProps<{
  text: string
  /** The accessible name of the button. */
  label: string
}>()

const { t } = usePlutoI18n()
const { copy, copied } = useClipboard({ copiedDuring: 2000 })
</script>

<template>
  <UTooltip :text="copied ? t('supabase.access.link.copied') : props.label">
    <UButton
      :icon="copied ? 'lucide:check' : 'lucide:copy'"
      :aria-label="props.label"
      :color="copied ? 'success' : 'neutral'"
      variant="ghost"
      size="xs"
      @click="copy(props.text)"
    />
  </UTooltip>
</template>
