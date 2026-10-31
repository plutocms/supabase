<script setup lang="ts">
import { tv } from '@nuxt/ui/utils/tv'
import theme from '#build/ui/editor'
import { renderRichtext } from '../utils/richtext'

const props = defineProps<{
  content?: unknown
  format?: 'auto' | 'markdown' | 'html' | 'json'
  tag?: string
  class?: any
}>()

const ui = computed(() => tv({ extend: theme })())

// `renderRichtext` always finishes with `sanitizeRichtextHtml` (see
// `app/utils/richtext-sanitize.ts`), which strips the value down to a
// strict element and attribute allowlist. The string below is safe to
// set as `innerHTML`.
const html = computed(() =>
  renderRichtext(props.content, props.format ?? 'auto')
)
</script>

<template>
  <!-- This binds `innerHTML` as a plain prop, NOT the `v-html` directive,
       and NOT hyphenated (`:inner-h-t-m-l`) despite this project's
       `vue/attribute-hyphenation` rule. Both alternatives are broken here:

       - `v-html` on a dynamic `<component :is>` root silently drops the
         value in Vue's SSR codegen — it never reaches the server-rendered
         HTML, though it works fine on the client.
       - The hyphenated spelling breaks it a different way: since `tag`
         resolves to a plain string (a host element, not a real Vue
         component with declared props), the SSR-rendered element gets a
         literal `inner-h-t-m-l` attribute instead of the `innerHTML` DOM
         property, so no content lands there either.

       Only the exact camelCase prop name, bound directly (not via
       `v-html`), compiles correctly on both server and client. Verified
       against `@vue/compiler-sfc`'s own SSR codegen output for all three
       forms — do not "fix" this back to either one. -->
  <!-- A block disable, not `disable-next-line`: the attribute is not on the next line, and
       `eslint --fix` hyphenated it once. test/prose-binding.test.ts checks the spelling. -->
  <!-- eslint-disable vue/attribute-hyphenation -- must stay camelCase, see comment above -->
  <component
    :is="tag ?? 'div'"
    v-if="html"
    :class="ui.base({ class: props.class })"
    :innerHTML="html"
  />
  <!-- eslint-enable vue/attribute-hyphenation -->
  <slot v-else name="empty" />
</template>
