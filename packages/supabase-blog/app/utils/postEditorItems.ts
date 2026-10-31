import type {
  EditorCustomHandlers,
  EditorSuggestionMenuItem,
  EditorToolbarItem,
} from '@nuxt/ui'
import type { Editor, JSONContent } from '@tiptap/vue-3'
import { upperFirst } from 'scule'

// PostEditor.vue defines `customHandlers` itself, since it closes over a
// component-local ref (`isMediaModalOpen`). This alias only needs its shape,
// so the `satisfies` checks below can type-check the item arrays without
// importing the component's own value.
//
// This must stay a `type`, not an `interface`: `EditorCustomHandlers` is
// `Record<string, EditorHandler>`, and only a type literal gets the implicit
// string index signature TypeScript needs to satisfy that constraint.
// eslint-disable-next-line ts/consistent-type-definitions -- see note above
type ImageUploadHandlers = {
  imageUpload: EditorCustomHandlers['imageUpload']
}

/** A translate function: a message key in, the text out. */
export type EditorItemsTranslate = (key: string) => string

// The node types that the block menu names. Each key is a full literal, so
// the locale-file test can see it.
const NODE_TYPE_KEYS: Record<string, string> = {
  paragraph: 'supabase-blog.editor.nodes.paragraph',
  heading: 'supabase-blog.editor.nodes.heading',
  bulletList: 'supabase-blog.editor.nodes.bulletList',
  orderedList: 'supabase-blog.editor.nodes.orderedList',
  listItem: 'supabase-blog.editor.nodes.listItem',
  blockquote: 'supabase-blog.editor.nodes.blockquote',
  codeBlock: 'supabase-blog.editor.nodes.codeBlock',
  image: 'supabase-blog.editor.nodes.image',
}

function headingItems(t: EditorItemsTranslate, levels: (1 | 2 | 3 | 4)[]) {
  const labels = {
    1: t('supabase-blog.editor.heading1'),
    2: t('supabase-blog.editor.heading2'),
    3: t('supabase-blog.editor.heading3'),
    4: t('supabase-blog.editor.heading4'),
  }

  return levels.map((level) => ({
    kind: 'heading' as const,
    level,
    icon: `i-lucide-heading-${level}` as const,
    label: labels[level],
  }))
}

function markItems(t: EditorItemsTranslate) {
  return [
    {
      kind: 'mark' as const,
      mark: 'bold' as const,
      icon: 'i-lucide-bold',
      tooltip: { text: t('supabase-blog.editor.bold') },
    },
    {
      kind: 'mark' as const,
      mark: 'italic' as const,
      icon: 'i-lucide-italic',
      tooltip: { text: t('supabase-blog.editor.italic') },
    },
    {
      kind: 'mark' as const,
      mark: 'underline' as const,
      icon: 'i-lucide-underline',
      tooltip: { text: t('supabase-blog.editor.underline') },
    },
    {
      kind: 'mark' as const,
      mark: 'strike' as const,
      icon: 'i-lucide-strikethrough',
      tooltip: { text: t('supabase-blog.editor.strikethrough') },
    },
    {
      kind: 'mark' as const,
      mark: 'code' as const,
      icon: 'i-lucide-code',
      tooltip: { text: t('supabase-blog.editor.code') },
    },
  ]
}

function linkAndImageItems(t: EditorItemsTranslate) {
  return [
    { slot: 'link' as const, icon: 'i-lucide-link' },
    {
      kind: 'imageUpload' as const,
      icon: 'i-lucide-image',
      tooltip: { text: t('supabase-blog.editor.image') },
    },
  ]
}

/** The fixed toolbar items, with text from `t`. */
export function createFixedToolbarItems(t: EditorItemsTranslate) {
  return [
    [
      {
        kind: 'undo',
        icon: 'i-lucide-undo',
        tooltip: { text: t('supabase-blog.editor.undo') },
      },
      {
        kind: 'redo',
        icon: 'i-lucide-redo',
        tooltip: { text: t('supabase-blog.editor.redo') },
      },
    ],
    [
      {
        icon: 'i-lucide-heading',
        tooltip: { text: t('supabase-blog.editor.headings') },
        content: { align: 'start' },
        items: headingItems(t, [1, 2, 3, 4]),
      },
      {
        icon: 'i-lucide-list',
        tooltip: { text: t('supabase-blog.editor.lists') },
        content: { align: 'start' },
        items: [
          {
            kind: 'bulletList',
            icon: 'i-lucide-list',
            label: t('supabase-blog.editor.bulletList'),
          },
          {
            kind: 'orderedList',
            icon: 'i-lucide-list-ordered',
            label: t('supabase-blog.editor.orderedList'),
          },
        ],
      },
      {
        kind: 'blockquote',
        icon: 'i-lucide-text-quote',
        tooltip: { text: t('supabase-blog.editor.blockquote') },
      },
      {
        kind: 'codeBlock',
        icon: 'i-lucide-square-code',
        tooltip: { text: t('supabase-blog.editor.codeBlock') },
      },
    ],
    markItems(t),
    linkAndImageItems(t),
  ] satisfies EditorToolbarItem<ImageUploadHandlers>[][]
}

/** The bubble toolbar items, with text from `t`. */
export function createBubbleToolbarItems(t: EditorItemsTranslate) {
  return [
    [
      {
        label: t('supabase-blog.editor.turnInto'),
        trailingIcon: 'i-lucide-chevron-down',
        activeColor: 'neutral',
        activeVariant: 'ghost',
        tooltip: { text: t('supabase-blog.editor.turnInto') },
        content: { align: 'start' },
        ui: { label: 'text-xs' },
        items: [
          { type: 'label', label: t('supabase-blog.editor.turnInto') },
          {
            kind: 'paragraph',
            label: t('supabase-blog.editor.paragraph'),
            icon: 'i-lucide-type',
          },
          ...headingItems(t, [1, 2, 3, 4]),
          {
            kind: 'bulletList',
            icon: 'i-lucide-list',
            label: t('supabase-blog.editor.bulletList'),
          },
          {
            kind: 'orderedList',
            icon: 'i-lucide-list-ordered',
            label: t('supabase-blog.editor.orderedList'),
          },
          {
            kind: 'blockquote',
            icon: 'i-lucide-text-quote',
            label: t('supabase-blog.editor.blockquote'),
          },
          {
            kind: 'codeBlock',
            icon: 'i-lucide-square-code',
            label: t('supabase-blog.editor.codeBlock'),
          },
        ],
      },
    ],
    markItems(t),
    linkAndImageItems(t),
  ] satisfies EditorToolbarItem<ImageUploadHandlers>[][]
}

/** The suggestion menu items, with text from `t`. */
export function createSuggestionItems(t: EditorItemsTranslate) {
  return [
    [
      { type: 'label', label: t('supabase-blog.editor.style') },
      {
        kind: 'paragraph',
        label: t('supabase-blog.editor.paragraph'),
        icon: 'i-lucide-type',
      },
      ...headingItems(t, [1, 2, 3]),
      {
        kind: 'bulletList',
        label: t('supabase-blog.editor.bulletList'),
        icon: 'i-lucide-list',
      },
      {
        kind: 'orderedList',
        label: t('supabase-blog.editor.numberedList'),
        icon: 'i-lucide-list-ordered',
      },
      {
        kind: 'blockquote',
        label: t('supabase-blog.editor.blockquote'),
        icon: 'i-lucide-text-quote',
      },
      {
        kind: 'codeBlock',
        label: t('supabase-blog.editor.codeBlock'),
        icon: 'i-lucide-square-code',
      },
    ],
    [
      { type: 'label', label: t('supabase-blog.editor.insert') },
      {
        kind: 'imageUpload',
        label: t('supabase-blog.editor.image'),
        icon: 'i-lucide-image',
      },
    ],
  ] satisfies EditorSuggestionMenuItem<ImageUploadHandlers>[][]
}

/** The block menu items of the selected node, with text from `t`. */
export function createBlockMenuItemTree(
  t: EditorItemsTranslate,
  editor: Editor,
  selectedNode: { node: JSONContent; pos: number }
) {
  const nodeType = selectedNode.node.type ?? ''
  const nodeKey = NODE_TYPE_KEYS[nodeType]

  return [
    [
      {
        type: 'label',
        label: nodeKey ? t(nodeKey) : upperFirst(nodeType),
      },
      {
        label: t('supabase-blog.editor.turnInto'),
        icon: 'i-lucide-repeat-2',
        children: [
          {
            kind: 'paragraph',
            label: t('supabase-blog.editor.paragraph'),
            icon: 'i-lucide-type',
          },
          ...headingItems(t, [1, 2, 3, 4]),
          {
            kind: 'bulletList',
            label: t('supabase-blog.editor.bulletList'),
            icon: 'i-lucide-list',
          },
          {
            kind: 'orderedList',
            label: t('supabase-blog.editor.orderedList'),
            icon: 'i-lucide-list-ordered',
          },
          {
            kind: 'blockquote',
            label: t('supabase-blog.editor.blockquote'),
            icon: 'i-lucide-text-quote',
          },
          {
            kind: 'codeBlock',
            label: t('supabase-blog.editor.codeBlock'),
            icon: 'i-lucide-square-code',
          },
        ],
      },
      {
        kind: 'clearFormatting',
        pos: selectedNode.pos,
        label: t('supabase-blog.editor.resetFormatting'),
        icon: 'i-lucide-rotate-ccw',
      },
    ],
    [
      {
        kind: 'duplicate',
        pos: selectedNode.pos,
        label: t('supabase-blog.editor.duplicate'),
        icon: 'i-lucide-copy',
      },
      {
        label: t('supabase-blog.editor.copyToClipboard'),
        icon: 'i-lucide-clipboard',
        onSelect: async () => {
          const node = editor.state.doc.nodeAt(selectedNode.pos)
          if (node) {
            await navigator.clipboard.writeText(node.textContent)
          }
        },
      },
    ],
    [
      {
        kind: 'moveUp',
        pos: selectedNode.pos,
        label: t('supabase-blog.editor.moveUp'),
        icon: 'i-lucide-arrow-up',
      },
      {
        kind: 'moveDown',
        pos: selectedNode.pos,
        label: t('supabase-blog.editor.moveDown'),
        icon: 'i-lucide-arrow-down',
      },
    ],
    [
      {
        kind: 'delete',
        pos: selectedNode.pos,
        label: t('pluto.common.delete'),
        icon: 'i-lucide-trash',
      },
    ],
  ]
}
