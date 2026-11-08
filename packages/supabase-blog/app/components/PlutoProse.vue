<script setup lang="ts">
import { renderRichtext } from '../utils/richtext'

// The prose look is `.pluto-prose` of core (app/assets/css/pluto-base.css): plain
// CSS that a site imports with `@plutocms/css/base`. No Tailwind class here, so
// the component works on a site with no Tailwind. See the public-components
// skill of core.
const props = defineProps<{
  content?: unknown
  format?: 'auto' | 'markdown' | 'html' | 'json'
  tag?: string
  class?: any
}>()

// `renderRichtext` always finishes with `sanitizeRichtextHtml` (see
// `app/utils/richtext-sanitize.ts`), which strips the value down to a
// strict element and attribute allowlist. The string is safe for
// `PlutoHtml` of core, which shows it: the base path of a site under a sub
// path, and the players of the embed providers in place of a URL alone on
// its line (see the content-model skill of core, "Embeds").
const html = computed(() =>
  renderRichtext(props.content, props.format ?? 'auto')
)
</script>

<template>
  <PlutoHtml
    v-if="html"
    :html="html"
    :tag="tag ?? 'div'"
    :class="props.class"
  />
  <slot v-else name="empty" />
</template>
