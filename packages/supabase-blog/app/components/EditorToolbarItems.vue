<script lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

/**
 * One toolbar entry, already resolved against the live editor.
 *
 * `EditorToolbar.vue` builds this data inside a throttled, non-reactive
 * callback (see `useEditorSnapshot`). This component only renders it — it
 * must never call an `editor` method itself, or the throttling in
 * `EditorToolbar.vue` would not protect it.
 */
export interface EditorToolbarResolvedItem {
  key: string
  slot?: string
  active: boolean
  disabled: boolean
  /** Props to forward to the rendered `UButton`. */
  buttonProps: Record<string, unknown>
  /** The item's own `ui` override. Only applied outside a dropdown, matching
   * the vendor `UEditorToolbar` template. */
  ui?: Record<string, unknown>
  tooltip?: Record<string, unknown>
  dropdownItems?: DropdownMenuItem[][]
  dropdownProps?: Record<string, unknown>
  onClick: (event: MouseEvent) => void
}

/**
 * The theme slots this component reads. A plain `Record<string, Fn>` would
 * let `noUncheckedIndexedAccess` type every lookup as possibly `undefined`
 * — list the two slots this component actually calls instead.
 */
export interface EditorToolbarItemsUi {
  group: (opts?: Record<string, unknown>) => string
  separator: (opts?: Record<string, unknown>) => string
}
</script>

<script setup lang="ts">
defineProps<{
  groups: EditorToolbarResolvedItem[][]
  ui: EditorToolbarItemsUi
}>()
</script>

<template>
  <template v-for="(group, groupIndex) in groups" :key="`group-${groupIndex}`">
    <div :class="ui.group()" role="group" data-slot="group">
      <template v-for="item in group" :key="item.key">
        <slot :name="item.slot || 'item'" :item="item">
          <UDropdownMenu
            v-if="item.dropdownItems"
            v-bind="item.dropdownProps"
            :items="item.dropdownItems"
          >
            <UTooltip
              v-if="item.tooltip"
              :disabled="item.disabled"
              v-bind="item.tooltip"
            >
              <UButton
                :active="item.active"
                :disabled="item.disabled"
                v-bind="item.buttonProps"
                @click="item.onClick"
              />
            </UTooltip>

            <UButton
              v-else
              :active="item.active"
              :disabled="item.disabled"
              v-bind="item.buttonProps"
              @click="item.onClick"
            />
          </UDropdownMenu>

          <UTooltip
            v-else-if="item.tooltip"
            :disabled="item.disabled"
            v-bind="item.tooltip"
          >
            <UButton
              :active="item.active"
              :disabled="item.disabled"
              v-bind="item.buttonProps"
              :ui="item.ui"
              @click="item.onClick"
            />
          </UTooltip>

          <UButton
            v-else
            :active="item.active"
            :disabled="item.disabled"
            v-bind="item.buttonProps"
            :ui="item.ui"
            @click="item.onClick"
          />
        </slot>
      </template>
    </div>

    <USeparator
      v-if="groupIndex < groups.length - 1"
      :class="ui.separator()"
      data-slot="separator"
      orientation="vertical"
    />
  </template>
</template>
