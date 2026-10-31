<script lang="ts">
import theme from '#build/ui/editor-toolbar'
</script>

<script setup lang="ts">
import type { DropdownMenuItem, EditorToolbarItem } from '@nuxt/ui'
import type { BubbleMenuPluginProps } from '@tiptap/extension-bubble-menu'
import type { Editor } from '@tiptap/vue-3'
import { omit, pick } from '@nuxt/ui/utils'
import { createHandlers } from '@nuxt/ui/utils/editor'
import { tv } from '@nuxt/ui/utils/tv'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { useEditorSnapshot } from '../composables/useEditorSnapshot'
import EditorToolbarItems from './EditorToolbarItems.vue'

// Local stand-in for a resolved toolbar item. Kept structurally compatible
// with `EditorToolbarResolvedItem` from `EditorToolbarItems.vue` — declared
// here too (rather than imported) so this file does not depend on that
// component's internal script block ordering.
interface ResolvedItem {
  key: string
  slot?: string
  active: boolean
  disabled: boolean
  buttonProps: Record<string, unknown>
  ui?: Record<string, unknown>
  tooltip?: Record<string, unknown>
  dropdownItems?: DropdownMenuItem[][]
  dropdownProps?: Record<string, unknown>
  onClick: (event: MouseEvent) => void
}

// A single toolbar item, before it is resolved against the live editor. The
// vendor `UEditorToolbar` types this union in `../types/editor` — this repo
// only needs the loose shape below to read the fields every handler below
// touches, so it stays a plain record instead of importing that private
// union.
type Item = Record<string, any>

const props = withDefaults(
  defineProps<{
    editor: Editor
    items: EditorToolbarItem[][] | ((editor: Editor) => EditorToolbarItem[][])
    layout?: 'fixed' | 'bubble'
    shouldShow?: BubbleMenuPluginProps['shouldShow']
    options?: Record<string, unknown>
    class?: string
    ui?: Record<string, string>
  }>(),
  {
    layout: 'fixed',
  }
)

// Same default control styling as the vendor `UEditorToolbar` (`color`,
// `variant`, `activeColor`, `activeVariant`, `size` props there). Nothing in
// this layer overrides them today, so they are constants rather than props.
const DEFAULTS = {
  color: 'neutral',
  variant: 'ghost',
  activeColor: 'primary',
  activeVariant: 'soft',
  size: 'sm',
} as const

const handlers = inject(
  'editorHandlers',
  computed(() => createHandlers() as Record<string, any>)
)

const ui = computed(() => tv({ extend: theme })({ layout: props.layout }))

const resolvedOptions = computed(() => ({
  offset: 8,
  shift: { padding: 8 },
  ...props.options,
}))

/** Shallow-merges `defaults` under `base`, without a `defu` dependency. */
function applyDefaults<T extends Record<string, unknown>>(
  base: T,
  defaults: Record<string, unknown>
): T {
  return { ...defaults, ...base } as T
}

/**
 * Flattens a value that may be one level of nested arrays, otherwise
 * returns it as-is. Same semantics as `@nuxt/ui/utils`'s own
 * `isArrayOfArray` (an array is "nested" when its first entry is itself an
 * array), reimplemented locally: feeding this file's loosely-typed `Item`
 * values through that generic-constrained helper made TypeScript narrow
 * the flattened branch to `never`.
 */
function flattenItems(items: Item[] | Item[][]): Item[] {
  return Array.isArray((items as Item[])[0])
    ? (items as Item[][]).flat()
    : (items as Item[])
}

// The functions below are a straight port of `UEditorToolbar`'s own script
// (`node_modules/@nuxt/ui/dist/runtime/components/EditorToolbar.vue`,
// lines ~63-174), unchanged in logic. The only difference is that each one
// takes `editor` as an explicit argument instead of closing over
// `props.editor` — this component calls them from `buildGroups`, which runs
// outside any Vue effect (see `useEditorSnapshot`), so an explicit argument
// makes that non-reactive read obvious at every call site.
function isActive(editor: Editor, item: Item): boolean {
  if (!editor.isEditable) {
    return false
  }
  if ('items' in item && item.items?.length) {
    return item.items.some((child: Item) => isActive(editor, child)) || false
  }
  if (!('kind' in item)) {
    return item.active ?? false
  }
  const handler = handlers.value?.[item.kind]
  return handler?.isActive(editor, item) || false
}

function isDisabled(editor: Editor, item: Item): boolean {
  if (!editor.isEditable) {
    return true
  }
  if ('items' in item && item.items?.length) {
    const items = flattenItems(item.items)
    const actionableItems = items.filter(
      (child: Item) => child.type !== 'separator' && child.type !== 'label'
    )
    if (actionableItems.length === 0) {
      return true
    }
    return actionableItems.every((child: Item) => isDisabled(editor, child))
  }
  if (!('kind' in item)) {
    return item.disabled ?? false
  }
  const handler = handlers.value?.[item.kind]
  if (!handler) {
    return false
  }
  if (handler.isDisabled?.(editor, item)) {
    return true
  }
  return !handler.canExecute(editor, item)
}

function onItemClick(editor: Editor, e: MouseEvent, item: Item) {
  if (!editor.isEditable || isDisabled(editor, item)) {
    return
  }
  if ('items' in item || !('kind' in item)) {
    if ('onClick' in item) {
      for (const onClick of Array.isArray(item.onClick)
        ? item.onClick
        : [item.onClick]) {
        onClick?.(e)
      }
    }
    return
  }
  const handler = handlers.value?.[item.kind]
  if (handler) {
    handler.execute(editor, item).run()
  }
}

function getActiveChildItem(editor: Editor, item: Item): Item | undefined {
  if (!item.items) {
    return undefined
  }
  const items = flattenItems(item.items)
  return items.find((child: Item) => {
    if (!('kind' in child)) {
      return false
    }
    return isActive(editor, child)
  })
}

function getButtonProps(editor: Editor, item: Item): Record<string, unknown> {
  const baseProps = omit(item, [
    'kind',
    'mark',
    'align',
    'level',
    'href',
    'src',
    'pos',
    'items',
    'slot',
    'checkedIcon',
    'loadingIcon',
    'externalIcon',
    'content',
    'arrow',
    'portal',
    'modal',
    'tooltip',
    'onClick',
  ])
  if ('items' in item && item.items?.length) {
    const activeChild = getActiveChildItem(editor, item)
    if (activeChild?.icon) {
      baseProps.icon = activeChild.icon
    }
    if (activeChild?.label && baseProps.label !== undefined) {
      baseProps.label = activeChild.label
    }
  }
  return applyDefaults(baseProps, DEFAULTS)
}

function getDropdownProps(item: Item): Record<string, unknown> {
  const baseProps = pick(item, [
    'size',
    'checkedIcon',
    'loadingIcon',
    'externalIcon',
    'content',
    'arrow',
    'portal',
    'modal',
    'ui',
  ])
  return applyDefaults(baseProps, { modal: false, size: DEFAULTS.size })
}

function mapDropdownItem(editor: Editor, item: Item): Item {
  const children =
    'children' in item && Array.isArray(item.children)
      ? item.children.map((child: Item) => mapDropdownItem(editor, child))
      : undefined
  if (!('kind' in item)) {
    return children ? { ...item, children } : item
  }
  return {
    ...item,
    ...(children && { children }),
    active: isActive(editor, item),
    disabled: isDisabled(editor, item),
    onSelect: (e: Event) =>
      onItemClick(editor, e as unknown as MouseEvent, item),
  }
}

function getDropdownItems(editor: Editor, item: Item): DropdownMenuItem[][] {
  if (!item.items) {
    return []
  }
  const items = item.items as Item[] | Item[][]
  return Array.isArray(items[0])
    ? (items as Item[][]).map((group) =>
        group.map((child) => mapDropdownItem(editor, child))
      )
    : [(items as Item[]).map((child) => mapDropdownItem(editor, child))]
}

function resolveItem(editor: Editor, item: Item, key: string): ResolvedItem {
  const hasDropdown = 'items' in item && !!item.items?.length

  return {
    key,
    slot: item.slot,
    active: isActive(editor, item),
    disabled: isDisabled(editor, item),
    buttonProps: getButtonProps(editor, item),
    ui: item.ui,
    tooltip: item.tooltip,
    dropdownItems: hasDropdown ? getDropdownItems(editor, item) : undefined,
    dropdownProps: hasDropdown ? getDropdownProps(item) : undefined,
    onClick: (e: MouseEvent) => onItemClick(editor, e, item),
  }
}

function buildGroups(editor: Editor): ResolvedItem[][] {
  const groups =
    typeof props.items === 'function' ? props.items(editor) : props.items

  return (groups ?? []).map((group, groupIndex) =>
    group.map((item, index) =>
      resolveItem(editor, item as Item, `${groupIndex}-${index}`)
    )
  )
}

const { locale } = usePlutoI18n()

// Rebuild when the items or the admin language change. A function `items`
// prop keeps its identity, so the language is a source on its own.
const snapshot = useEditorSnapshot(
  () => props.editor,
  buildGroups,
  () => [props.items, locale.value]
)
</script>

<template>
  <BubbleMenu
    v-if="layout === 'bubble'"
    :editor="editor"
    :should-show="shouldShow ?? undefined"
    :options="resolvedOptions"
    :class="ui.root({ class: props.ui?.root })"
    tabindex="-1"
  >
    <div
      :class="ui.base({ class: [props.ui?.base, props.class] })"
      role="toolbar"
      data-slot="base"
    >
      <EditorToolbarItems :groups="snapshot ?? []" :ui="ui">
        <template v-for="(_, name) in $slots" #[name]="slotProps">
          <slot :name="name" v-bind="slotProps" />
        </template>
      </EditorToolbarItems>
    </div>
  </BubbleMenu>

  <div
    v-else
    :class="ui.base({ class: [props.ui?.base, props.class] })"
    role="toolbar"
    data-slot="base"
  >
    <EditorToolbarItems :groups="snapshot ?? []" :ui="ui">
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
    </EditorToolbarItems>
  </div>
</template>
