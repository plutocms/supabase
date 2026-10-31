import { describe, expect, it } from 'vitest'
import {
  detectRichtextFormat,
  renderRichtext,
  richtextToPlainText,
} from '../app/utils/richtext'

describe('detectRichtextFormat', () => {
  it('treats null and blank strings as empty', () => {
    expect(detectRichtextFormat(null)).toBe('empty')
    expect(detectRichtextFormat(undefined)).toBe('empty')
    expect(detectRichtextFormat('')).toBe('empty')
    expect(detectRichtextFormat('   ')).toBe('empty')
  })

  it('detects a markdown string', () => {
    expect(detectRichtextFormat('# Title\n\nSome *text*.')).toBe('markdown')
  })

  it('detects an HTML string', () => {
    expect(detectRichtextFormat('<p>hello</p>')).toBe('html')
  })

  it('detects a Tiptap JSON object', () => {
    expect(detectRichtextFormat({ type: 'doc', content: [] })).toBe('json')
  })

  it('detects a JSON string with type: "doc"', () => {
    expect(detectRichtextFormat('{"type":"doc","content":[]}')).toBe('json')
  })

  it('does not misdetect a markdown string that starts with "{"', () => {
    expect(detectRichtextFormat('{not json} rest of the sentence')).toBe(
      'markdown'
    )
  })
})

describe('renderRichtext', () => {
  it('renders markdown headings, lists, bold text, and code blocks', () => {
    const html = renderRichtext(
      '# Title\n\n- one\n- two\n\n**bold**\n\n```\ncode\n```'
    )

    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<pre>')
    expect(html).toContain('<code')
  })

  it('honors a format override on HTML-looking input', () => {
    const html = renderRichtext('<p>not really html</p>', 'markdown')

    // Marked treats it as an inline HTML block and passes it through,
    // then the sanitizer allows the plain <p>.
    expect(html).toContain('<p>not really html</p>')
  })

  it('is deterministic across repeated calls, for stable hydration', () => {
    const value = '# Title\n\nSome **bold** text with a [link](/x).'

    expect(renderRichtext(value)).toBe(renderRichtext(value))
  })
})

describe('richtextToPlainText', () => {
  it('strips tags, decodes entities, and separates blocks with a space', () => {
    const plain = richtextToPlainText('# Title\n\nFirst paragraph &amp; more.')

    expect(plain).not.toContain('<')
    expect(plain).toContain('Title')
    expect(plain).toContain('First paragraph & more.')
  })
})
