<script setup lang="ts">
// The `product.is_custom` field widget. Mirrors its own value into
// `useProductFormBridge()`, the cross-field bridge `PlutoProductAvailabilityField.vue`
// and `PlutoProductStockField.vue` read to enforce "a custom product is
// always commission availability with no stock quantity". See the
// shop-products skill.
const props = defineProps<{
  field: PlutoBooleanField
  modelValue: unknown
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const bridge = useProductFormBridge()

const value = computed(() => props.modelValue === true)

watch(
  value,
  (isCustom) => {
    bridge.value.isCustom = isCustom
  },
  { immediate: true }
)

// Field widgets load on demand, so they can mount in any order. A stale
// `isCustom` from the last product form must not look like a change to the
// availability and stock widgets of the next one. This widget owns the flag,
// so it resets the flag when it unmounts.
onUnmounted(() => {
  bridge.value.isCustom = false
})
</script>

<template>
  <UFormField :label="field.label" :description="field.description">
    <USwitch
      :model-value="value"
      :disabled="disabled"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </UFormField>
</template>
