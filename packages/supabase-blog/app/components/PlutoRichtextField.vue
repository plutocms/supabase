<script setup lang="ts">
// Adapts PostEditor.vue to the generic field-widget contract every widget
// in the content form shares: `field`, `modelValue`, `disabled`, and
// `update:modelValue` (see the content-model skill). PostEditor.vue only
// has a plain `v-model` (`placeholder`/`ui` props, no `field`/`disabled`)
// — this wrapper is the adapter, so PostEditor.vue itself stays untouched.
//
// With `canvas`, the core post editor (`post-canvas`) shows this widget as its
// Visual mode: no label and no border (the compose panel has the background of
// the text). The toolbar is a separate rounded bar in one row that stays at the
// top, and the text fills the rest of the height. The compose panel scrolls, not
// this widget. No padding: the post editor sets the space around it.
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

// PostEditor.vue holds the document as ProseMirror state and serializes it to Markdown on a
// 400 ms debounce. The form calls this before a save and before a backup write, so a Ctrl+S right
// after typing, or a backup, does not miss the last keystrokes. Outside the content form, the
// context is missing and nothing registers.
const editor = ref<{ flush: () => void } | null>(null)
usePlutoContentForm()?.onFlush(() => editor.value?.flush())

const value = computed(() => (props.modelValue as string | undefined) ?? '')

const UFormField = resolveComponent('UFormField')
const frame = computed(() =>
  props.canvas
    ? { is: 'div', attrs: { class: 'flex flex-col' } }
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
        canvas && 'flex flex-1 flex-col',
        disabled && 'pointer-events-none opacity-60',
      ]"
    >
      <PostEditor
        ref="editor"
        :model-value="value"
        :canvas="canvas"
        :placeholder="
          t('supabase-blog.editor.fieldPlaceholder', {
            label: field.label.toLowerCase(),
          })
        "
        :ui="
          canvas
            ? {
                root: 'flex flex-1 flex-col',
                content: 'flex flex-1 flex-col',
                // The text in line with the title; the editor element reaches into the gutter of
                // the column (`-ms-14 ps-14`), so the pointer stays in it on the way to the block
                // buttons (Tiptap hides them when the pointer leaves the editor).
                base: 'flex-1 -ms-14 ps-14 pe-0 pt-12 pb-3 sm:ps-14 sm:pe-0',
              }
            : undefined
        "
        @update:model-value="emit('update:modelValue', $event)"
      />
    </div>
  </component>
</template>
