---
name: prose
description: PlutoProse, the component that displays a stored richtext value (markdown, HTML, or Tiptap JSON) as sanitized, styled HTML.
---

# Prose

`PlutoProse` (`app/components/PlutoProse.vue`) displays a stored richtext value on a public
page. It is the read side of `PostEditor.vue`: the editor writes markdown (see the
`blog-posts` skill), and `PlutoProse` renders that markdown back as real HTML, with the same
typography the editor itself uses.

Use it in app code that holds the raw stored value. A page that reads the public API
(`usePlutoPublicItem`) gets the body as sanitized `html` already, and renders it with
`PlutoHtml` from `@plutocms/core`, not `PlutoProse`. `pluto-blog-template` does that, for both
backends.

## The pipeline

Four pure functions, each in its own file under `app/utils/`, run in this order:

1. **Detect** — `detectRichtextFormat()` (`richtext.ts`) guesses whether a stored value is
   markdown, HTML, or Tiptap JSON.
2. **Convert** — `renderRichtext()` (`richtext.ts`) turns that value into an HTML string.
   Markdown goes through `marked` (with `gfm: true`, matching the editor). JSON goes through
   `richtextJsonToHtml()` (`richtext-json.ts`), a small hand-written serializer. HTML passes
   through unchanged.
3. **Sanitize** — every path, with no exception, finishes by calling
   `sanitizeRichtextHtml()` (`richtext-sanitize.ts`) before the HTML leaves `renderRichtext()`.
4. **Output** — `PlutoProse.vue` sets the sanitized string as `innerHTML` on its root element.

`richtextToPlainText()` (`richtext.ts`) runs the same pipeline, then strips the result down to
plain text, for use outside `PlutoProse` (an excerpt, a `<meta description>`, and so on).

## Format detection, in order

`detectRichtextFormat()` checks, in this order:

1. `null` or `undefined` → empty.
2. A non-null object or array → JSON (already-parsed Tiptap JSON).
3. Anything else that is not a string → empty.
4. A blank or whitespace-only string → empty.
5. A string starting with `{` that parses as JSON with `type: 'doc'` → JSON.
6. A string that looks like an HTML fragment (starts with a tag or comment, and has a closing
   tag or a void/self-closing tag) → HTML.
7. Otherwise → markdown.

**Known failure mode**: this is a guess, not a guarantee. Markdown text that happens to start
with a raw HTML block (for example, a post that opens with `<div>` before any markdown) can
misdetect as HTML. Pass `PlutoProse`'s `format` prop (`'markdown' | 'html' | 'json'`) to skip
detection when the stored format is known ahead of time.

## Why the renderer is not a Tiptap instance

`PlutoProse` does not build a `@tiptap/vue-3` editor to display content. This was tried and
rejected during planning, for reasons that all come down to the same thing: Tiptap's HTML
generation is not SSR-safe.

- `useEditor()` only builds the editor once the component mounts. On the server, mount never
  happens, so `<EditorContent>` renders empty. A page depending on it would ship a blank body
  in its initial HTML and only fill in after client-side JavaScript runs.
- Tiptap's `elementFromString()` helper throws with no `window` — it needs a real DOM, which
  the server does not have.
- `generateHTML()` and `getHTMLFromFragment()` need a document, so they only work if the
  server first calls `document.implementation.createHTMLDocument()` to fake one.
- Even the markdown-to-JSON path in `@tiptap/markdown` is not SSR-deterministic once the
  markdown contains embedded raw HTML.

Do not "fix" `PlutoProse` back to a `useEditor()`-based renderer. If a future need calls for
richer rendering, solve it inside the pure functions in `app/utils/`, not by reaching for
Tiptap on the server.

There is a second, narrower trap inside `PlutoProse.vue` itself: the root element uses
`<component :is="tag ?? 'div'">` so callers can choose the wrapper tag, and its HTML is bound
as a plain `:innerHTML` prop, NOT the `v-html` directive, and NOT the hyphenated spelling
(`:inner-h-t-m-l`) that this project's lint rule would otherwise ask for. Both alternatives
are broken: `v-html` on a dynamic `<component :is>` root silently drops the value during Vue's
SSR render (confirmed against `@vue/compiler-sfc`'s own SSR codegen output), and the hyphenated
spelling reaches the DOM as a literal `inner-h-t-m-l` attribute instead of the `innerHTML`
property. Only the exact camelCase prop, bound directly, works on both server and client. The
component carries a comment on this; do not remove it.

## Allowed elements and attributes

`sanitizeRichtextHtml()` (`richtext-sanitize.ts`) is an allowlist, not a denylist — it does not
use `ultrahtml/transformers/sanitize`, because that transformer leaves `on*` event handlers and
`style` untouched, and does not check URL schemes at all.

- Kept elements: `p`, `h1`–`h6`, `strong`, `b`, `em`, `i`, `s`, `del`, `u`, `code`, `pre`,
  `blockquote`, `ul`, `ol`, `li`, `hr`, `br`, `a`, `img`, `table`/`thead`/`tbody`/`tr`/`th`/`td`,
  `input` (checkbox only).
- Hard-dropped elements (removed with every child, so a `<script>` body cannot survive):
  `script`, `style`, `iframe`, `object`, `embed`, `svg`, `form`, `video`, and about a dozen
  others in the same family — see the `DROP_ELEMENTS` set in `richtext-sanitize.ts` for the
  full list.
- Every other element (a `<div>`, a hyphenated custom element, and so on) is unwrapped: its
  children stay, the tag itself is dropped.
- Kept attributes are narrow and per-element: `href`/`title` on `a`, `src`/`alt`/`title`/
  `width`/`height` on `img`, a `language-*` class on `code`, `type`/`checked`/`disabled` on a
  checkbox `input`, `align` (`left`/`center`/`right` only) on `th`/`td`. Every other attribute
  on every other element is stripped — this alone removes every `on*` handler and every
  `style` attribute.
- `href` and `src` go through `isSafeUrl()`: it decodes HTML entities and strips embedded
  control characters first (so `java&#115;cript:` cannot hide a scheme), then accepts a
  relative path, `#anchor`, `?query`, `http:`, `https:`, `mailto:`, and a `data:image/*` URL
  limited to `png`/`jpeg`/`gif`/`webp`/`avif` — never `data:image/svg+xml`, which can carry a
  script.

GFM tables and task lists render even though `PostEditor.vue`'s schema cannot author them
today (`marked`'s `gfm: true` option, matching the editor's own markdown parsing, produces
tables and task-list checkboxes from plain markdown syntax, and the sanitizer's allowlist keeps
them). This is intentional, not a gap to close.

## Styling

`PlutoProse` needs no CSS of its own. It reuses the same theme the editor already ships:

```ts
import theme from '#build/ui/editor'
import { tv } from '@nuxt/ui/utils/tv'

const ui = computed(() => tv({ extend: theme })())
```

`ui.base(...)` returns the same class list `PostEditor.vue`'s `EditorContent` uses for its
content area — headings, links, code, lists, and images all already have rules for it. Any
consuming app already compiles this CSS in, through its own `@source` lines, so nothing new
needs to ship.

## Props and slots

- `content?: unknown` — the stored value. `unknown` on purpose: today it is a
  `string | null` markdown value, but a future field could store JSON.
- `format?: 'auto' | 'markdown' | 'html' | 'json'` — default `'auto'` (calls
  `detectRichtextFormat()`). Set it explicitly to skip detection.
- `tag?: string` — the wrapper element, default `'div'`.
- `class?: any` — merged onto the wrapper alongside the theme's own classes.
- Slots: `empty` only, rendered in place of the wrapper when the resolved HTML is empty.
- No emits.

## Current behavior and known limits

- **Links get no automatic `target`/`rel`.** `PlutoProse` keeps only `href` and `title` on an
  `<a>`. A site that wants external links to open in a new tab, or to carry
  `rel="noopener noreferrer"`, needs to add that itself (for example, with a small script pass
  over the rendered content, or a future opt-in prop). This is documented current behavior, not
  a bug.
- **Images get no automatic `loading="lazy"` or `decoding="async"`.** The serializer and
  sanitizer both stay minimal on purpose. Adding these is a reasonable follow-up, not something
  this pass does.
- **The JSON path is a small custom serializer, not real ProseMirror.** `richtextJsonToHtml()`
  understands exactly the node and mark types `PostEditor.vue`'s schema can produce. A node
  type it does not recognize renders as just its own children, with no wrapper element — it
  does not throw, and it does not drop the content.

## Translation

`PlutoProse` shows stored content, so it has no UI text of its own to translate. It does not use the
admin i18n system. The public site language belongs to the app (`usePlutoSiteI18n`).
