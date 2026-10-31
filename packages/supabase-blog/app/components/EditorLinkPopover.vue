<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { useEditorSnapshot } from '../composables/useEditorSnapshot'

const props = defineProps<{
  editor: Editor
  autoOpen?: boolean
}>()

const { t } = usePlutoI18n()

const open = ref(false)
const url = ref('')

// `editor.isActive(...)` and `editor.state` must never be read from a
// computed — see `useEditorSnapshot` for why. This snapshot rebuilds at
// most once per animation frame instead.
const snapshot = useEditorSnapshot(
  () => props.editor,
  (editor) => ({
    active: editor.isActive('link'),
    disabled:
      !editor.isEditable ||
      (editor.view.state.selection.empty && !editor.isActive('link')),
  })
)

watch(
  () => props.editor,
  (editor, _, onCleanup) => {
    if (!editor) {
      return
    }

    const updateUrl = () => {
      const { href } = editor.getAttributes('link')
      url.value = href || ''
    }

    updateUrl()
    editor.on('selectionUpdate', updateUrl)

    onCleanup(() => {
      editor.off('selectionUpdate', updateUrl)
    })
  },
  { immediate: true }
)

watch(
  () => snapshot.value?.active,
  (isActive) => {
    if (isActive && props.autoOpen) {
      open.value = true
    }
  }
)

function setLink() {
  if (!url.value) {
    return
  }

  const { selection } = props.editor.state
  const isEmpty = selection.empty
  const hasCode = props.editor.isActive('code')

  let chain = props.editor.chain().focus()

  // When linking code, extend the code mark range first to select the full code
  if (hasCode && !isEmpty) {
    chain = chain.extendMarkRange('code').setLink({ href: url.value })
  } else {
    chain = chain.extendMarkRange('link').setLink({ href: url.value })

    if (isEmpty) {
      chain = chain.insertContent({ type: 'text', text: url.value })
    }
  }

  chain.run()
  open.value = false
}

function removeLink() {
  props.editor
    .chain()
    .focus()
    .extendMarkRange('link')
    .unsetLink()
    .setMeta('preventAutolink', true)
    .run()

  url.value = ''
  open.value = false
}

function openLink() {
  if (!url.value) {
    return
  }
  window.open(url.value, '_blank', 'noopener,noreferrer')
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    setLink()
  }
}
</script>

<template>
  <UPopover v-model:open="open" :ui="{ content: 'p-0.5' }">
    <UTooltip :text="t('supabase-blog.editor.link')">
      <UButton
        :active="snapshot?.active ?? false"
        :disabled="snapshot?.disabled ?? true"
        icon="i-lucide-link"
        color="neutral"
        active-color="primary"
        variant="ghost"
        active-variant="soft"
        size="sm"
      />
    </UTooltip>

    <template #content>
      <UInput
        v-model="url"
        :placeholder="t('supabase-blog.editor.linkPopover.placeholder')"
        name="url"
        type="url"
        variant="none"
        autofocus
        @keydown="handleKeyDown"
      >
        <div class="flex items-center mr-0.5">
          <UButton
            :disabled="!url && !snapshot?.active"
            :title="t('supabase-blog.editor.linkPopover.apply')"
            icon="i-lucide-corner-down-left"
            variant="ghost"
            size="sm"
            @click="setLink"
          />

          <USeparator orientation="vertical" class="h-6 mx-1" />

          <UButton
            :disabled="!url && !snapshot?.active"
            :title="t('supabase-blog.editor.linkPopover.open')"
            icon="i-lucide-external-link"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="openLink"
          />

          <UButton
            :disabled="!url && !snapshot?.active"
            :title="t('supabase-blog.editor.linkPopover.remove')"
            icon="i-lucide-trash"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="removeLink"
          />
        </div>
      </UInput>
    </template>
  </UPopover>
</template>
