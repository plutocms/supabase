import type {
  PlutoContentContext,
  PlutoContentItem,
} from '@plutocms/core/shared/types/content'
import { describe, expect, it } from 'vitest'
import {
  cutText,
  POST_EXCERPT_LENGTH,
  postToPublic,
} from '../server/utils/post-public'

const ctx = {} as PlutoContentContext

const item: PlutoContentItem = {
  id: 1,
  title: 'Hello',
  slug: 'hello',
  content: '# Title\n\nSome **bold** text.\n\n<script>alert(1)</script>',
  status: 'published',
}

describe('postToPublic', () => {
  it('drops the body from a list item and adds a plain-text excerpt', async () => {
    const data = await postToPublic(
      ctx,
      { id: 1, title: 'Hello', content: item.content },
      { view: 'list', item, batch: [item] }
    )

    expect(data).not.toHaveProperty('content')
    expect(data.excerpt).toBe('Title Some bold text.')
  })

  it('keeps the body of one item and adds sanitized html', async () => {
    const data = await postToPublic(
      ctx,
      { id: 1, title: 'Hello', content: item.content },
      { view: 'item', item, batch: [item] }
    )

    expect(data.content).toBe(item.content)
    expect(data.html).toContain('<strong>bold</strong>')
    expect(data.html).not.toContain('<script')
  })

  it('renders Tiptap JSON too', async () => {
    const json = {
      ...item,
      content: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'From JSON' }] },
        ],
      },
    }

    const data = await postToPublic(
      ctx,
      { id: 1 },
      { view: 'item', item: json, batch: [json] }
    )

    expect(data.html).toContain('From JSON')
  })
})

describe('cutText', () => {
  it('keeps a short text and cuts a long one at a word', () => {
    expect(cutText('short')).toBe('short')
    const long = cutText('word '.repeat(100).trim())
    expect(long.length).toBeLessThanOrEqual(POST_EXCERPT_LENGTH)
    expect(long.endsWith('word…')).toBe(true)
  })
})
