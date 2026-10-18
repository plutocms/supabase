<script setup lang="ts">
// Renders one translated message that holds links or markup in the middle of
// a sentence. Each `{name}` in the message becomes the slot with that name.
// The word order stays in the translation, so each language can move the
// parts. Example: <SupabaseMessageParts :message="t('…')"><template #link>…
const props = defineProps<{
  /** The translated message. Write each slot as `{name}`. */
  message: string
}>()

const parts = computed(() =>
  props.message
    .split(/(\{\w+\})/)
    .filter((part) => part !== '')
    .map((part) => {
      const slot = /^\{(\w+)\}$/.exec(part)?.[1]

      return slot ? { slot } : { text: part }
    })
)
</script>

<template>
  <template v-for="(part, index) in parts" :key="index">
    <slot v-if="part.slot" :name="part.slot" />

    <template v-else>{{ part.text }}</template>
  </template>
</template>
