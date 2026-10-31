import { Marked } from 'marked'
import { ELEMENT_NODE, parse, TEXT_NODE, walkSync } from 'ultrahtml'
import { richtextJsonToHtml } from './richtext-json'
import { sanitizeRichtextHtml } from './richtext-sanitize'

export type RichtextFormat = 'markdown' | 'html' | 'json'

// One `Marked` instance, reused across every render. `gfm: true` matches
// `Markdown.configure({ markedOptions: { gfm: true } })` in
// `PostEditor.vue`, so a post renders the same GFM extras (tables, task
// lists, strikethrough, autolinks) on the public page as the editor
// understands while writing it. `breaks` stays at its default (false).
const markedInstance = new Marked({ gfm: true })

const STARTS_WITH_TAG = /^<(?:!--|[a-z][a-z0-9-]*)[\s>/]/i
const HAS_CLOSING_TAG = /<\/[a-z][a-z0-9-]*\s*>/i
const HAS_VOID_TAG = /<(?:br|hr|img|input)\b/i
const HAS_SELF_CLOSING_TAG = /<[a-z][^>]*\/>/i

/**
 * Guess the format of a stored richtext value.
 *
 * Checks run in this order:
 * 1. `null`/`undefined` → `'empty'`.
 * 2. A non-null object or array → `'json'` (already-parsed Tiptap JSON).
 * 3. Anything else that is not a string → `'empty'`.
 * 4. A blank or whitespace-only string → `'empty'`.
 * 5. A string starting with `{` that parses as JSON with `type: 'doc'` →
 *    `'json'`.
 * 6. A string that looks like an HTML fragment → `'html'`.
 * 7. Otherwise → `'markdown'`.
 *
 * This is a guess, not a guarantee. Markdown text that happens to start
 * with a raw HTML block can misdetect as `'html'`. Pass the `format` prop
 * on `PlutoProse` to skip detection when the stored format is known.
 */
export function detectRichtextFormat(value: unknown): RichtextFormat | 'empty' {
  if (value === null || value === undefined) {
    return 'empty'
  }

  if (typeof value === 'object') {
    return 'json'
  }

  if (typeof value !== 'string') {
    return 'empty'
  }

  const trimmed = value.trim()

  if (trimmed === '') {
    return 'empty'
  }

  if (trimmed.startsWith('{')) {
    const parsed = safeParseJson(trimmed)
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      (parsed as { type?: unknown }).type === 'doc'
    ) {
      return 'json'
    }
    // Parses (or fails to parse) as something other than a Tiptap
    // document — do not misdetect it as JSON content.
  }

  const looksLikeHtml =
    STARTS_WITH_TAG.test(trimmed) &&
    (HAS_CLOSING_TAG.test(trimmed) ||
      HAS_VOID_TAG.test(trimmed) ||
      HAS_SELF_CLOSING_TAG.test(trimmed))

  if (looksLikeHtml) {
    return 'html'
  }

  return 'markdown'
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

/**
 * Render a stored richtext value to sanitized HTML.
 *
 * `format` overrides detection (`'auto'`, the default, calls
 * `detectRichtextFormat`). The result always passes through
 * `sanitizeRichtextHtml` before it is returned, no matter which path
 * produced it — see `app/utils/richtext-sanitize.ts`.
 */
export function renderRichtext(
  value: unknown,
  format: RichtextFormat | 'auto' = 'auto'
): string {
  const resolved = format === 'auto' ? detectRichtextFormat(value) : format

  let html: string

  switch (resolved) {
    case 'empty':
      return ''
    case 'json':
      html = richtextJsonToHtml(value)
      break
    case 'markdown':
      html = markedInstance.parse(String(value), { async: false })
      break
    case 'html':
      html = String(value)
      break
    default:
      return ''
  }

  return sanitizeRichtextHtml(html)
}

/**
 * Render a stored richtext value, then strip it down to plain text.
 *
 * Block elements get a separating space, HTML entities are decoded, and
 * repeated whitespace collapses to one space. This does not truncate the
 * result — truncating to a length is the caller's job (see `blog.vue`'s
 * `excerpt()` in the template for an example).
 */
export function richtextToPlainText(
  value: unknown,
  format: RichtextFormat | 'auto' = 'auto'
): string {
  const html = renderRichtext(value, format)

  if (!html) {
    return ''
  }

  const doc = parse(html)
  const parts: string[] = []

  walkSync(doc, (node) => {
    if (node.type === TEXT_NODE) {
      parts.push(decodeEntities(node.value))
    } else if (node.type === ELEMENT_NODE) {
      // Block-level tags need a separating space, or two adjacent blocks'
      // text would run together (e.g. "</h1><p>" must not merge into one
      // word).
      parts.push(' ')
    }
  })

  return parts.join('').replace(/\s+/g, ' ').trim()
}

const NAMED_TEXT_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decodeEntities(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, body: string) => {
      if (body[0] === '#') {
        const isHex = body[1] === 'x' || body[1] === 'X'
        const codePoint = Number.parseInt(
          isHex ? body.slice(2) : body.slice(1),
          isHex ? 16 : 10
        )
        return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint)
      }
      return NAMED_TEXT_ENTITIES[body] ?? match
    }
  )
}
