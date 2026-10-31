// Converts a Tiptap `JSONContent` document to an HTML string, with no
// ProseMirror or Tiptap import. Pulling in `@tiptap/core` just to render a
// public page would add roughly 150KB to the public bundle for a job a
// small recursive function can do.
//
// This only needs to cover the node and mark types `PostEditor.vue`'s
// schema can produce (StarterKit + `Code.extend` + `Image` — see that
// file's `extensions` array). The output still passes through
// `sanitizeRichtextHtml` afterward, so an unexpected shape here cannot
// become unsafe HTML, only wrong-looking HTML.

interface JsonNode {
  type?: string
  attrs?: Record<string, unknown>
  content?: JsonNode[]
  text?: string
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;')
}

function renderChildren(nodes: JsonNode[] | undefined): string {
  if (!Array.isArray(nodes)) {
    return ''
  }
  return nodes.map((node) => renderNode(node)).join('')
}

// Marks wrap the text node in this fixed order, innermost first — `code`
// sits closest to the text, `link` outermost. A text node's `marks` array
// can list marks in any order, so nesting always follows this table
// rather than the array's own order. Any mark type not in this list (an
// unknown mark) is ignored.
const MARK_ORDER = [
  'code',
  'bold',
  'italic',
  'strike',
  'underline',
  'link',
] as const

const MARK_TAGS: Record<string, string> = {
  code: 'code',
  bold: 'strong',
  italic: 'em',
  strike: 's',
  underline: 'u',
}

function renderText(node: JsonNode): string {
  let html = escapeText(node.text ?? '')
  const marks = node.marks ?? []

  for (const type of MARK_ORDER) {
    const mark = marks.find((candidate) => candidate.type === type)
    if (!mark) {
      continue
    }

    if (type === 'link') {
      const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : ''
      const title =
        typeof mark.attrs?.title === 'string' ? mark.attrs.title : undefined
      const titleAttr = title ? ` title="${escapeAttribute(title)}"` : ''
      html = `<a href="${escapeAttribute(href)}"${titleAttr}>${html}</a>`
      continue
    }

    const tag = MARK_TAGS[type]
    html = `<${tag}>${html}</${tag}>`
  }

  return html
}

function renderNode(node: JsonNode): string {
  switch (node.type) {
    case 'doc':
      return renderChildren(node.content)
    case 'paragraph':
      return `<p>${renderChildren(node.content)}</p>`
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1))
      return `<h${level}>${renderChildren(node.content)}</h${level}>`
    }
    case 'text':
      return renderText(node)
    case 'hardBreak':
      return '<br>'
    case 'bulletList':
      return `<ul>${renderChildren(node.content)}</ul>`
    case 'orderedList': {
      const start = Number(node.attrs?.start)
      const startAttr = start > 1 ? ` start="${start}"` : ''
      return `<ol${startAttr}>${renderChildren(node.content)}</ol>`
    }
    case 'listItem':
      return `<li>${renderChildren(node.content)}</li>`
    case 'blockquote':
      return `<blockquote>${renderChildren(node.content)}</blockquote>`
    case 'codeBlock': {
      const language =
        typeof node.attrs?.language === 'string' ? node.attrs.language : ''
      const classAttr = language
        ? ` class="language-${escapeAttribute(language)}"`
        : ''
      return `<pre><code${classAttr}>${renderChildren(node.content)}</code></pre>`
    }
    case 'horizontalRule':
      return '<hr>'
    case 'image': {
      const src = typeof node.attrs?.src === 'string' ? node.attrs.src : ''
      const alt =
        typeof node.attrs?.alt === 'string' ? node.attrs.alt : undefined
      const title =
        typeof node.attrs?.title === 'string' ? node.attrs.title : undefined
      const altAttr = alt ? ` alt="${escapeAttribute(alt)}"` : ''
      const titleAttr = title ? ` title="${escapeAttribute(title)}"` : ''
      return `<img src="${escapeAttribute(src)}"${altAttr}${titleAttr}>`
    }
    default:
      // Unknown node type: this is not a real ProseMirror renderer, so an
      // unsupported node renders as just its children, with no wrapper.
      return renderChildren(node.content)
  }
}

/**
 * Render a Tiptap JSON document to an HTML string.
 *
 * `doc` should be a Tiptap `JSONContent` object (or a JSON string of one),
 * as produced by `editor.getJSON()`. Anything else renders as an empty
 * string.
 */
export function richtextJsonToHtml(doc: unknown): string {
  const root = typeof doc === 'string' ? (safeParse(doc) ?? undefined) : doc

  if (!root || typeof root !== 'object' || Array.isArray(root)) {
    return ''
  }

  return renderNode(root as JsonNode)
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}
