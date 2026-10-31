import { renderRichtext, richtextToPlainText } from '../../app/utils/richtext'

/**
 * The public answer of the `post` type (`hooks.toPublic`). The stored body (`content`) can be
 * Markdown, HTML or Tiptap JSON. A public site in any stack needs HTML, so:
 *
 * - A list item has no `content`. It has `excerpt`: the start of the body as plain text.
 * - One item keeps `content` and adds `html`: the body rendered and sanitized by the same code as
 *   `PlutoProse` (`renderRichtext`). It is safe to set as `innerHTML`.
 */

/** The length of an excerpt, in characters. */
export const POST_EXCERPT_LENGTH = 200

/** The start of a text, cut at a word, with an ellipsis when it is cut. */
export function cutText(text: string, max = POST_EXCERPT_LENGTH): string {
  if (text.length <= max) {
    return text
  }
  const cut = text.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`
}

export const postToPublic: PlutoContentToPublic = (_ctx, data, info) => {
  const result = { ...data }
  if (info.view === 'item') {
    result.html = renderRichtext(info.item.content)
    return result
  }
  delete result.content
  result.excerpt = cutText(richtextToPlainText(info.item.content))
  return result
}
