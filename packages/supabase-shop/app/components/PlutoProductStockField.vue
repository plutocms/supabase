<script setup lang="ts">
// The `product.stock_quantity` field widget. Renders only for "in-stock"
// availability — matching Post.vue's original `v-if`, resolved here by
// slug instead of a literal availability id (see the shop-products
// skill). While hidden, it never touches the field's value at all, so an
// already-loaded stock quantity is never clobbered just because
// availability briefly reads as something else during a page load.
//
// It only ever sets a value in two cases: the field has none yet (a
// brand-new product, or the first time this field becomes visible), or
// `isCustom` actually flips — both times mirroring the same rule
// Post.vue enforced: a custom product always has a `null` stock quantity,
// any other product defaults to `0`.
const props = defineProps<{
  field: PlutoNumberField
  modelValue: unknown
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const bridge = useProductFormBridge()

const visible = computed(() => bridge.value.availabilitySlug === 'in-stock')

const value = computed(() => {
  const raw = props.modelValue
  return typeof raw === 'number' ? raw : null
})

function defaultForIsCustom(isCustom: boolean): number | null {
  return isCustom ? null : 0
}

onMounted(() => {
  if (props.modelValue === undefined) {
    emit('update:modelValue', defaultForIsCustom(bridge.value.isCustom))
  }
})

watch(
  () => bridge.value.isCustom,
  (isCustom) => {
    emit('update:modelValue', defaultForIsCustom(isCustom))
  }
)
</script>

<template>
  <UFormField
    v-if="visible"
    :label="field.label"
    :description="field.description"
  >
    <UInputNumber
      :model-value="value"
      :min="field.min"
      :disabled="disabled"
      placeholder="0"
      class="w-full"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </UFormField>
</template>
