import { describe, expect, it } from 'vitest'
import { richtextJsonToHtml } from '../app/utils/richtext-json'

describe('richtextJsonToHtml', () => {
  it('renders a paragraph', () => {
    const html = richtextJsonToHtml({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] },
      ],
    })

    expect(html).toBe('<p>hello</p>')
  })

  it('renders a heading at its level', () => {
    const html = richtextJsonToHtml({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Title' }],
        },
      ],
    })

    expect(html).toBe('<h2>Title</h2>')
  })

  it('nests marks innermost first: code, bold, italic, strike, underline, link', () => {
    const html = richtextJsonToHtml({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [
                { type: 'link', attrs: { href: '/a' } },
                { type: 'underline' },
                { type: 'strike' },
                { type: 'italic' },
                { type: 'bold' },
                { type: 'code' },
              ],
            },
          ],
        },
      ],
    })

    expect(html).toBe(
      '<p><a href="/a"><u><s><em><strong><code>x</code></strong></em></s></u></a></p>'
    )
  })

  it('renders a link with href and title', () => {
    const html = richtextJsonToHtml({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'go',
              marks: [{ type: 'link', attrs: { href: '/x', title: 'X' } }],
            },
          ],
        },
      ],
    })

    expect(html).toBe('<p><a href="/x" title="X">go</a></p>')
  })

  it('renders an image', () => {
    const html = richtextJsonToHtml({
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: '/img.png', alt: 'a picture' } },
      ],
    })

    expect(html).toBe('<img src="/img.png" alt="a picture">')
  })

  it('renders a code block with a language class', () => {
    const html = richtextJsonToHtml({
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language: 'ts' },
          content: [{ type: 'text', text: 'const x = 1' }],
        },
      ],
    })

    expect(html).toBe('<pre><code class="language-ts">const x = 1</code></pre>')
  })

  it('renders an ordered list with a start attribute', () => {
    const html = richtextJsonToHtml({
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          attrs: { start: 3 },
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'c' }] },
              ],
            },
          ],
        },
      ],
    })

    expect(html).toBe('<ol start="3"><li><p>c</p></li></ol>')
  })

  it('renders the children of an unknown node type, with no wrapper', () => {
    const html = richtextJsonToHtml({
      type: 'doc',
      content: [
        { type: 'mystery', content: [{ type: 'text', text: 'still here' }] },
      ],
    })

    expect(html).toBe('still here')
  })

  it('escapes <, >, and & in text', () => {
    const html = richtextJsonToHtml({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '<b> & </b>' }] },
      ],
    })

    expect(html).toBe('<p>&lt;b&gt; &amp; &lt;/b&gt;</p>')
  })
})
