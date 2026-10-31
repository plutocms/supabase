import type { Editor } from '@tiptap/vue-3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'
import { usePostEditorItems } from '../app/composables/post-editor-items'
import { createI18nStub } from './fixtures/i18n-stub'

function plain(value: unknown) {
  return JSON.parse(JSON.stringify(value))
}

// The snapshots hold the English editor items. They keep the English editor
// text the same from one release to the next.
describe('usePostEditorItems in English', () => {
  beforeEach(() => {
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('usePlutoI18n', () => createI18nStub())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('gives the fixed toolbar', () => {
    expect(
      plain(usePostEditorItems().fixedToolbarItems.value)
    ).toMatchSnapshot()
  })

  it('gives the bubble toolbar', () => {
    expect(
      plain(usePostEditorItems().bubbleToolbarItems.value)
    ).toMatchSnapshot()
  })

  it('gives the suggestion menu', () => {
    expect(plain(usePostEditorItems().suggestionItems.value)).toMatchSnapshot()
  })

  it('gives the block menu', () => {
    const editor = {} as Editor

    for (const type of [
      'paragraph',
      'heading',
      'bulletList',
      'orderedList',
      'listItem',
      'blockquote',
      'codeBlock',
      'image',
      'taskList',
    ]) {
      const selected = { node: { type }, pos: 3 }

      // A JSON round trip drops the `onSelect` function.
      expect(
        plain(usePostEditorItems().createBlockMenuItemTree(editor, selected)),
        type
      ).toMatchSnapshot(type)
    }
  })
})
