<script setup lang="ts">
// The `product.price` field widget. The model value is integer cents (4990).
// The input is a cents mask: each digit enters from the right (5 -> 0,05 ->
// 0,50 -> 5,09 -> 50,90), and Backspace removes the last digit. A number
// input does not fit: it rounds the value to its step. The mask reads the
// digits of the whole value on each input event, so it also works with a
// phone keyboard and with paste. The text uses `formatProductPrice`, the same
// format as the store. The hardcoded `BRL` currency is a known, separate
// issue — see the shop-products skill.
const props = defineProps<{
  field: PlutoNumberField
  modelValue: unknown
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const input = useTemplateRef('input')

const cents = computed(() =>
  typeof props.modelValue === 'number' ? props.modelValue : null
)
const display = computed(() =>
  cents.value === null ? '' : formatProductPrice(cents.value)
)

function onUpdate(value: string | number) {
  let next = digitsToCents(String(value))
  // Backspace on R$ 0,00 empties the field.
  if (next === 0 && !cents.value) {
    next = null
  }
  emit('update:modelValue', next)

  // The cents can stay the same (a letter, or a digit after the 13th), so Vue
  // does not patch the input. Write the formatted text back, and keep the
  // caret at the end, where the next digit enters.
  nextTick(() => {
    const el = input.value?.inputRef
    if (!el) {
      return
    }
    el.value = next === null ? '' : formatProductPrice(next)
    el.setSelectionRange(el.value.length, el.value.length)
  })
}
</script>

<template>
  <UFormField
    :label="field.label"
    :description="field.description"
    :required="field.required"
  >
    <UInput
      ref="input"
      :model-value="display"
      :disabled="disabled"
      :placeholder="formatProductPrice(0)"
      inputmode="numeric"
      autocomplete="off"
      class="w-full"
      @update:model-value="onUpdate"
    />
  </UFormField>
</template>
