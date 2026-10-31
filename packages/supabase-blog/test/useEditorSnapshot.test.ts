import type { Editor } from '@tiptap/vue-3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useEditorSnapshot } from '../app/composables/useEditorSnapshot'

// A minimal Editor-shaped fake: just enough `on`/`off`/`emit` to drive the
// composable, mirroring `@tiptap/core`'s own `EventEmitter` (a plain
// synchronous emitter — see the comment in `useEditorSnapshot.ts`).
function createFakeEditor() {
  const callbacks = new Map<string, Set<(...args: unknown[]) => void>>()

  return {
    isDestroyed: false,
    on(event: string, fn: (...args: unknown[]) => void) {
      if (!callbacks.has(event)) {
        callbacks.set(event, new Set())
      }
      callbacks.get(event)!.add(fn)
      return this
    },
    off(event: string, fn: (...args: unknown[]) => void) {
      callbacks.get(event)?.delete(fn)
      return this
    },
    emit(event: string, ...args: unknown[]) {
      for (const fn of callbacks.get(event) ?? []) {
        fn(...args)
      }
    },
  }
}

// This test project runs vitest under the plain `node` environment (see
// `vitest.config.ts`), which has no `requestAnimationFrame` global at all.
// Stub a minimal, manually-flushed one instead of reaching for
// `vi.useFakeTimers({ toFake: ['requestAnimationFrame'] })`, which fakes an
// existing global rather than creating a missing one.
function installFakeRaf() {
  let nextId = 1
  const pending = new Map<number, () => void>()

  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextId
    nextId += 1
    pending.set(id, () => callback(0))
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    pending.delete(id)
  })

  return {
    /** Runs every frame callback scheduled so far, once each. */
    flush() {
      const callbacks = [...pending.values()]
      pending.clear()
      for (const callback of callbacks) {
        callback()
      }
    },
  }
}

describe('useEditorSnapshot', () => {
  let raf: ReturnType<typeof installFakeRaf>

  beforeEach(() => {
    raf = installFakeRaf()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('collapses N synchronous transaction emits into exactly one rebuild per frame', () => {
    const fakeEditor = createFakeEditor()
    let buildCalls = 0

    // `useEditorSnapshot` calls `watch`, which needs a reactive-effect
    // owner to clean up correctly — an `effectScope` stands in for the
    // component that would normally own it.
    const scope = effectScope()
    scope.run(() => {
      useEditorSnapshot(
        () => fakeEditor as unknown as Editor,
        (editor) => {
          buildCalls += 1
          return editor
        }
      )
    })

    // `watch(..., { immediate: true })` builds once right away, before any
    // transaction fires.
    expect(buildCalls).toBe(1)

    // Simulate a held key's OS auto-repeat: many transactions land in the
    // same tick, all still inside the current animation frame. This is
    // exactly the pattern that froze the page before the fix: the vendor
    // `@tiptap/vue-3` `customRef` schedules one independent double-rAF
    // chain per transaction, with no guard against an already-pending one.
    for (let i = 0; i < 20; i += 1) {
      fakeEditor.emit('transaction')
    }

    // None of the 20 transactions have rebuilt yet — the frame has not
    // fired.
    expect(buildCalls).toBe(1)

    raf.flush()

    // The guard in `schedule()` collapses all 20 transactions into exactly
    // one rebuild. Without it (the vendor's own behavior), this would be 21.
    expect(buildCalls).toBe(2)

    scope.stop()
  })

  it('schedules a fresh frame for a transaction that arrives while building', () => {
    const fakeEditor = createFakeEditor()
    let buildCalls = 0

    const scope = effectScope()
    scope.run(() => {
      useEditorSnapshot(
        () => fakeEditor as unknown as Editor,
        (editor) => {
          buildCalls += 1
          // A transaction arriving mid-build (e.g. from a nested handler)
          // must not be dropped.
          if (buildCalls === 2) {
            fakeEditor.emit('transaction')
          }
          return editor
        }
      )
    })

    expect(buildCalls).toBe(1)

    fakeEditor.emit('transaction')
    raf.flush() // runs build #2, which itself emits again

    expect(buildCalls).toBe(2)

    raf.flush() // runs build #3, for the transaction emitted during build #2

    expect(buildCalls).toBe(3)

    scope.stop()
  })
})
