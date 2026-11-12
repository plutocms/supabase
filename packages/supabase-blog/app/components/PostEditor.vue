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
  /** The look of the core post editor: the toolbar is a rounded bar in one row (see PlutoRichtextField). */
  canvas?: boolean
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
  // A content component of the site, from the slash menu (`createSuggestionItems`).
  plutoComponent: {
    canExecute: () => true,
    execute: (editor: Editor, item: { name: string }) =>
      editor.chain().focus().insertPlutoComponent(item.name),
    isActive: () => false,
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

// The block under the drag handle, from its `hover` event (`node-change` fires on a click only).
const selectedNode = ref<{
  node: JSONContent
  pos: number
}>()
// The block of the open menu of the handle: the pointer can hover other blocks while it is open.
const menuNode = ref<{
  node: JSONContent
  pos: number
}>()
const handleOnEmptyLine = computed(
  () =>
    selectedNode.value?.node.type === 'paragraph' &&
    !selectedNode.value.node.content?.length
)

// The drag-handle's block-menu items. `editor.isActive(...)`/`editor.can()`
// run inside `mapEditorItems`, so this must never be called from a template
// expression or a computed — see `useEditorSnapshot.ts` for why. Instead,
// plain callbacks rebuild it: the drag handle's own `node-change` event,
// and the dropdown's `update:open` event (in case the dropdown opens before
// a node-change fires for the block under it).
const blockMenuItems = shallowRef<DropdownMenuItem[][]>([])

function rebuildBlockMenu(editor: Editor) {
  const current = menuNode.value ?? selectedNode.value
  if (!current?.node?.type) {
    blockMenuItems.value = []
    return
  }

  blockMenuItems.value = mapEditorItems(
    editor,
    createBlockMenuItemTree(editor, current),
    customHandlers
  ) as DropdownMenuItem[][]
}

/** A menu of the handle opens or closes: keep its block, and keep the handle in place. */
function onHandleMenu(editor: Editor, open: boolean) {
  menuNode.value = open ? selectedNode.value : undefined
  editor.chain().setMeta('lockDragHandle', open).run()
}

/**
 * The Markdown of the editor, without the blank lines at the end: the empty last line of the editor
 * (`PlutoTrailingParagraph`) never reaches the post, and an open post stays unchanged.
 */
function trimEnd(markdown: string): string {
  return markdown.replace(/(?:\s|&nbsp;)+$/u, '')
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
  // A content component (`::name{props}` then `::`): a chip with a props form. From core.
  PlutoContentComponentNode,
  // An empty line at the end, so the "+" has a place after the last block. From core.
  PlutoTrailingParagraph,
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
  markdown = trimEnd(markdown)
  if (markdown === trimEnd(lastEmitted)) {
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

// The form calls this before a save and before a backup write (the `onFlush` hook of
// PlutoRichtextField.vue), so the last keystrokes are in the v-model. It cancels the pending
// debounce timer, then runs the same flush as a blur.
function flushNow() {
  clearTimeout(flushTimer)
  flush()
}

defineExpose({ flush: flushNow })

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

/**
 * The menu of the "+" of an empty line: the items of the slash menu (`suggestionItems`). An item
 * puts the caret in that line and runs its handler there. No "/" goes into the text.
 */
const insertMenuItems = computed<DropdownMenuItem[][]>(() =>
  suggestionItems.value.map((group) =>
    group.map((item): DropdownMenuItem => {
      if ('type' in item && item.type) {
        return { type: item.type, label: item.label }
      }
      const { kind, label, icon } = item as {
        kind: string
        label?: string
        icon?: string
      }
      return {
        label,
        icon,
        onSelect: () => {
          const current = menuNode.value ?? selectedNode.value
          const handler = (
            handlers.value as Record<string, EditorCustomHandlers[string]>
          )[kind]
          if (!editor.value || !current || !handler) {
            return
          }
          editor.value
            .chain()
            .focus()
            .setTextSelection(current.pos + 1)
            .run()
          handler.execute(editor.value, item).run()
        },
      }
    })
  )
)

// The menus (the bubble toolbars, the dropdowns, the slash and block menus)
// open on top of the editor, which has the same background in dark mode. A
// darker background sets them apart.
const MENU_BG = 'dark:bg-neutral-950'
// The arrow of a menu has the same color as the menu.
const MENU_ARROW = 'dark:fill-neutral-950'
</script>

<template>
  <div :class="ui.root({ class: props.ui?.root })">
    <UTheme
      v-if="editor"
      :ui="{
        dropdownMenu: { content: MENU_BG, arrow: MENU_ARROW },
        popover: { content: MENU_BG, arrow: MENU_ARROW },
      }"
    >
      <!-- In the post editor (`canvas`), the toolbar is a separate rounded bar, one step darker than
           the text in dark mode, white with a soft shadow in light mode, in one row: the rest goes into
           More. It is as wide as the focused title (`-mx-2`), and `data-pluto-editor-toolbar` tells
           the post editor its height (the Outline scrolls a heading under it). -->
      <EditorToolbar
        :editor="editor"
        :items="fixedToolbarItems"
        :overflow="canvas"
        :data-pluto-editor-toolbar="canvas ? '' : undefined"
        :class="
          canvas
            ? 'border border-[oklch(0_0_0/0.19)] bg-white shadow-[0px_12px_15px_-15px_#0000007a] dark:border-default dark:bg-(--pluto-admin-sidebar) sticky top-2 z-10 -mx-2 rounded-lg px-2 py-1.5'
            : 'border-b border-muted sticky top-0 inset-x-0 p-2 z-10 bg-default flex-wrap'
        "
      >
        <template #link>
          <EditorLinkPopover :editor="editor" auto-open />
        </template>
        <template #component>
          <PlutoBlockInsertMenu :editor="editor" />
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

      <!-- In the gutter at the left of the text: the grip of a block (drag to move; a click opens the
           block menu), or the "+" of an empty line (the slash items, for that line). No flip: the
           buttons stay in the gutter, so the editor does not scroll sideways. -->
      <UEditorDragHandle
        v-slot="{ ui: dragHandleUi }"
        :editor="editor"
        :options="{ flip: false }"
        @hover="(event) => (selectedNode = event)"
      >
        <UDropdownMenu
          v-if="handleOnEmptyLine"
          :modal="false"
          :items="insertMenuItems"
          :content="{ side: 'bottom', align: 'start' }"
          :ui="{ content: `max-h-80 ${MENU_BG}`, label: 'text-xs' }"
          arrow
          @update:open="(isOpen) => editor && onHandleMenu(editor, isOpen)"
        >
          <UTooltip
            :text="t('supabase-blog.editor.addBlock')"
            :content="{ side: 'left' }"
          >
            <UButton
              :aria-label="t('supabase-blog.editor.addBlock')"
              :class="dragHandleUi.handle()"
              icon="i-lucide-plus"
              color="neutral"
              variant="ghost"
              size="sm"
            />
          </UTooltip>
        </UDropdownMenu>

        <UDropdownMenu
          v-else
          v-slot="{ open }"
          :modal="false"
          :items="blockMenuItems"
          :content="{ side: 'left' }"
          :ui="{ content: `w-48 ${MENU_BG}`, label: 'text-xs' }"
          @update:open="
            (isOpen) => {
              if (!editor) return
              onHandleMenu(editor, isOpen)
              if (isOpen) rebuildBlockMenu(editor)
            }
          "
        >
          <UTooltip
            :text="t('supabase-blog.editor.blockMenu')"
            :content="{ side: 'left' }"
          >
            <UButton
              :active="open"
              :aria-label="t('supabase-blog.editor.blockMenu')"
              :class="dragHandleUi.handle()"
              color="neutral"
              variant="ghost"
              active-variant="soft"
              size="sm"
              icon="i-lucide-grip-vertical"
            />
          </UTooltip>
        </UDropdownMenu>
      </UEditorDragHandle>

      <UEditorSuggestionMenu
        :editor="editor"
        :items="suggestionItems"
        :suggestion="{ allow: plutoSlashMenuAllowed }"
        :ui="{ content: MENU_BG }"
      />

      <!-- Outside the canvas, a left gutter for the block buttons, from `sm` (under it, Nuxt UI hides
           the drag handle). In the canvas, the post editor gives the column its gutter (see
           PlutoRichtextField). -->
      <EditorContent
        :editor="editor"
        :class="
          ui.content({
            class: [!canvas && 'px-4 sm:ps-16 sm:pe-0', props.ui?.content],
          })
        "
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
