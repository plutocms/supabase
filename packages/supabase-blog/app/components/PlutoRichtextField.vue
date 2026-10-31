<script setup lang="ts">
// Adapts PostEditor.vue to the generic field-widget contract every widget
// in the content form shares: `field`, `modelValue`, `disabled`, and
// `update:modelValue` (see the content-model skill). PostEditor.vue only
// has a plain `v-model` (`placeholder`/`ui` props, no `field`/`disabled`)
// — this wrapper is the adapter, so PostEditor.vue itself stays untouched.
//
// With `canvas`, the core post editor (`post-canvas`) shows this widget as its
// Visual mode: no label, and a full-height box that scrolls its own text, like
// the Markdown mode of the post editor. No padding: the post editor sets the
// space around it.
const props = defineProps<{
  field: PlutoTextField
  modelValue: unknown
  disabled?: boolean
  canvas?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = usePlutoI18n()

const value = computed(() => (props.modelValue as string | undefined) ?? '')

const UFormField = resolveComponent('UFormField')
const frame = computed(() =>
  props.canvas
    ? { is: 'div', attrs: { class: 'flex h-full min-h-0 flex-col' } }
    : {
        is: UFormField,
        attrs: {
          label: props.field.label,
          description: props.field.description,
          required: props.field.required,
        },
      }
)
</script>

<template>
  <component :is="frame.is" v-bind="frame.attrs">
    <!-- PostEditor.vue has no disabled state of its own. Dim and block
         input instead of forwarding an unsupported prop. -->
    <div
      :class="[
        canvas && 'flex min-h-0 flex-1 flex-col',
        disabled && 'pointer-events-none opacity-60',
      ]"
    >
      <PostEditor
        :model-value="value"
        :placeholder="
          t('supabase-blog.editor.fieldPlaceholder', {
            label: field.label.toLowerCase(),
          })
        "
        :ui="
          canvas
            ? {
                root: 'border-default bg-default flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border',
                content: 'min-h-0 flex-1 overflow-y-auto',
                base: 'min-h-full px-8 py-6',
              }
            : undefined
        "
        @update:model-value="emit('update:modelValue', $event)"
      />
    </div>
  </component>
</template>
