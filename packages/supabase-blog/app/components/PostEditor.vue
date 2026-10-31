<script setup lang="ts">
import type {
  DropdownMenuItem,
  EditorCustomHandlers,
  EditorToolbarItem,
} from '@nuxt/ui'
import type { Editor, JSONContent } from '@tiptap/vue-3'
import { createHandlers, mapEditorItems } from '@nuxt/ui/utils/editor'
import { tv } from '@nuxt/ui/utils/tv'
import Code from '@tiptap/extension-code'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import theme from '#build/ui/editor'
import EditorLinkPopover from './EditorLinkPopover.vue'
import EditorToolbar from './EditorToolbar.vue'

const props = defineProps<{
  placeholder?: string
  ui?: Record<string, string>
}>()

const { t, locale } = usePlutoI18n()
const {
  bubbleToolbarItems,
  createBlockMenuItemTree,
  fixedToolbarItems,
  suggestionItems,
} = usePostEditorItems()

const value = defineModel<string>({ default: '' })

// The image command opens the media picker of core (images only).
const isMediaModalOpen = ref(false)

const customHandlers = {
  imageUpload: {
    canExecute: (editor: Editor) => editor.can().setImage({ src: '' }),
    execute: (editor: Editor) => {
      isMediaModalOpen.value = true

      return editor.chain().focus()
    },
    isActive: (editor: Editor) => editor.isActive('image'),
    isDisabled: undefined,
  },
} satisfies EditorCustomHandlers


function imageToolbarItems(editor: Editor): EditorToolbarItem[][] {
  const node = editor.state.doc.nodeAt(editor.state.selection.from)

  return [
    [
      {
        icon: 'i-lucide-download',
        to: node?.attrs?.src,
        download: true,
        tooltip: { text: t('supabase-blog.editor.download') },
      },
      {
        icon: 'i-lucide-refresh-cw',
        tooltip: { text: t('supabase-blog.editor.replace') },
        onClick: () => {
          const { state } = editor
          const { selection } = state

          const pos = selection.from
          const node = state.doc.nodeAt(pos)

          if (node && node.type.name === 'image') {
            editor
              .chain()
              .focus()
              .deleteRange({ from: pos, to: pos + node.nodeSize })
              .run()
          }

          isMediaModalOpen.value = true
        },
      },
    ],
    [
      {
        icon: 'i-lucide-trash',
        tooltip: { text: t('pluto.common.delete') },
        onClick: () => {
          const { state } = editor
          const { selection } = state

          const pos = selection.from
          const node = state.doc.nodeAt(pos)

          if (node && node.type.name === 'image') {
            editor
              .chain()
              .focus()
              .deleteRange({ from: pos, to: pos + node.nodeSize })
              .run()
          }
        },
      },
    ],
  ]
}

const selectedNode = ref<{
  node: JSONContent
  pos: number
}>()

// The drag-handle's block-menu items. `editor.isActive(...)`/`editor.can()`
// run inside `mapEditorItems`, so this must never be called from a template
// expression or a computed — see `useEditorSnapshot.ts` for why. Instead,
// plain callbacks rebuild it: the drag handle's own `node-change` event,
// and the dropdown's `update:open` event (in case the dropdown opens before
// a node-change fires for the block under it).
const blockMenuItems = shallowRef<DropdownMenuItem[][]>([])

function rebuildBlockMenu(editor: Editor) {
  if (!selectedNode.value?.node?.type) {
    blockMenuItems.value = []
    return
  }

  blockMenuItems.value = mapEditorItems(
    editor,
    createBlockMenuItemTree(editor, selectedNode.value),
    customHandlers
  ) as DropdownMenuItem[][]
}

const ui = computed(() =>
  tv({ extend: theme })({ placeholderMode: 'everyLine' })
)

const editorProps = {
  attributes: {
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'off',
    class: ui.value.base({ class: props.ui?.base ?? 'p-8 sm:px-16 py-13.5' }),
  },
}

const extensions = [
  Markdown.configure({ markedOptions: { gfm: true } }),
  StarterKit.configure({
    code: false,
    horizontalRule: false,
    dropcursor: { color: 'var(--ui-primary)', width: 2 },
    link: { openOnClick: false },
  }),
  Code.extend({ excludes: 'code' }),
  Image,
  Placeholder.configure({
    // A function, so the text follows the admin language. It runs each time
    // the editor draws the placeholder.
    placeholder: () =>
      props.placeholder ?? t('supabase-blog.editor.placeholder'),
    showOnlyWhenEditable: false,
    showOnlyCurrent: true,
  }),
]

// The markdown-at-the-boundary sync.
//
// The document lives as native ProseMirror state while the user types.
// `getMarkdown()` serializes the whole document, so it must never run on
// every keystroke — that is what froze the page under fast typing or a
// held backspace with the old editor. Instead, `onUpdate` only marks the
// document dirty, and a debounce timer (or a blur) does the real
// serialization later.
let lastEmitted = value.value ?? ''
let dirty = false
let flushTimer: ReturnType<typeof setTimeout> | undefined

// `flush` and `scheduleFlush` must be declared before `useEditor()` — see
// the note above `onBeforeUnmount`. They still reference `editor` (defined
// below), which is safe: neither function runs until after `useEditor()`
// has returned, since Vue only calls `onUpdate`/`onBlur`/the unmount hook
// once the editor exists.
/* eslint-disable ts/no-use-before-define -- forward reference is safe, see comment above */
function flush() {
  if (!editor.value || editor.value.isDestroyed || !dirty) {
    return
  }
  dirty = false
  let markdown: string
  try {
    markdown = editor.value.getMarkdown()
  } catch {
    markdown = editor.value.getText()
  }
  if (markdown === lastEmitted) {
    return
  }
  lastEmitted = markdown
  value.value = markdown
}

function scheduleFlush() {
  clearTimeout(flushTimer)
  flushTimer = setTimeout(flush, 400)
}
/* eslint-enable ts/no-use-before-define -- see note above flush() */

// Register before useEditor() so this unmount hook runs before the one
// useEditor() registers internally to destroy the editor (Vue runs
// onBeforeUnmount hooks in registration order).
onBeforeUnmount(() => {
  clearTimeout(flushTimer)
  flush()
})

const editor = useEditor({
  extensions,
  editorProps,
  autofocus: false,
  onCreate: ({ editor }) => {
    if (value.value) {
      editor.commands.setContent(value.value, {
        contentType: 'markdown',
        emitUpdate: false,
      })
      lastEmitted = value.value
    }
    if (props.placeholder !== undefined) {
      editor.view.dispatch(editor.state.tr) // force placeholder decoration, mirrors Editor.vue's own onCreate
    }
  },
  onUpdate: ({ transaction, appendedTransactions }) => {
    if (
      !transaction.docChanged &&
      !appendedTransactions.some((tr) => tr.docChanged)
    ) {
      return
    }
    dirty = true
    scheduleFlush()
  },
  onBlur: () => {
    clearTimeout(flushTimer)
    flush()
  },
})

function onInsertMedia(chosen: PlutoMedia[]) {
  const [image] = chosen

  if (!image) {
    return
  }

  editor.value
    ?.chain()
    .focus()
    .setImage({ src: image.url, alt: image.alt || undefined })
    .run()

  isMediaModalOpen.value = false
}

watch(value, (incoming) => {
  if (!editor.value || editor.value.isDestroyed) {
    return
  }
  const next = incoming ?? ''
  if (next === lastEmitted) {
    return // our own echo (flush() or blur already set this) — ignore, do NOT re-serialize to check
  }
  clearTimeout(flushTimer)
  dirty = false
  lastEmitted = next
  const pos = editor.value.state.selection.from
  editor.value.commands.setContent(next, {
    contentType: 'markdown',
    emitUpdate: false,
  })
  if (pos <= editor.value.state.doc.content.size) {
    editor.value.commands.setTextSelection(pos)
  }
})

// The placeholder is drawn from editor state. An empty transaction makes the
// editor draw it again, so a language switch updates it at once.
watch(locale, () => {
  if (editor.value && !editor.value.isDestroyed) {
    editor.value.view.dispatch(editor.value.state.tr)
  }
})

const handlers = computed(() => ({ ...createHandlers(), ...customHandlers }))
provide('editorHandlers', handlers)

// The menus (the bubble toolbars, the dropdowns, the slash and block menus)
// open on top of the editor, which has the same background in dark mode. A
// darker background sets them apart.
const MENU_BG = 'dark:bg-neutral-950'
</script>

<template>
  <div :class="ui.root({ class: props.ui?.root })">
    <UTheme
      v-if="editor"
      :ui="{
        dropdownMenu: { content: MENU_BG },
        popover: { content: MENU_BG },
      }"
    >
      <EditorToolbar
        :editor="editor"
        :items="fixedToolbarItems"
        class="border-b border-muted sticky top-0 inset-x-0 p-2 z-10 bg-default flex-wrap"
      >
        <template #link>
          <EditorLinkPopover :editor="editor" auto-open />
        </template>
      </EditorToolbar>

      <EditorToolbar
        :editor="editor"
        :items="bubbleToolbarItems"
        :should-show="
          ({ editor, view, state }) => {
            if (editor.isActive('imageUpload') || editor.isActive('image')) {
              return false
            }
            const { selection } = state
            return view.hasFocus() && !selection.empty
          }
        "
        :ui="{ base: MENU_BG }"
        layout="bubble"
      >
        <template #link>
          <EditorLinkPopover :editor="editor" />
        </template>
      </EditorToolbar>

      <EditorToolbar
        :editor="editor"
        :items="imageToolbarItems"
        :should-show="
          ({ editor, view }) => {
            return editor.isActive('image') && view.hasFocus()
          }
        "
        :ui="{ base: MENU_BG }"
        layout="bubble"
      />

      <UEditorDragHandle
        v-slot="{ ui: dragHandleUi, onClick }"
        :editor="editor"
        @node-change="
          (event) => {
            selectedNode = event
            if (!editor) return
            rebuildBlockMenu(editor)
          }
        "
      >
        <UButton
          :class="dragHandleUi.handle()"
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="
            (e) => {
              e.stopPropagation()

              if (!editor) return

              const selected = onClick()
              handlers.suggestion?.execute(editor, { pos: selected?.pos }).run()
            }
          "
        />

        <UDropdownMenu
          v-slot="{ open }"
          :modal="false"
          :items="blockMenuItems"
          :content="{ side: 'left' }"
          :ui="{ content: `w-48 ${MENU_BG}`, label: 'text-xs' }"
          @update:open="
            (isOpen) => {
              if (!editor) return
              editor.chain().setMeta('lockDragHandle', isOpen).run()
              if (isOpen) rebuildBlockMenu(editor)
            }
          "
        >
          <UButton
            :active="open"
            :class="dragHandleUi.handle()"
            color="neutral"
            variant="ghost"
            active-variant="soft"
            size="sm"
            icon="i-lucide-grip-vertical"
          />
        </UDropdownMenu>
      </UEditorDragHandle>

      <UEditorSuggestionMenu
        :editor="editor"
        :items="suggestionItems"
        :ui="{ content: MENU_BG }"
      />

      <EditorContent
        :editor="editor"
        :class="ui.content({ class: props.ui?.content })"
        role="presentation"
        data-slot="content"
      />
    </UTheme>
  </div>

  <PlutoMediaPicker
    v-model:open="isMediaModalOpen"
    :accept="['image/*']"
    @select="onInsertMedia"
  />
</template>
