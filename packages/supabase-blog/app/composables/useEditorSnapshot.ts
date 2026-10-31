import type { Editor } from '@tiptap/vue-3'
import type { ShallowRef } from 'vue'
import { shallowRef, watch } from 'vue'

/**
 * Builds a snapshot of editor-derived data, throttled to at most one rebuild
 * per animation frame.
 *
 * `@tiptap/vue-3` makes `editor.state` reactive with its own `customRef`.
 * That ref schedules a double `requestAnimationFrame` on every transaction,
 * with no guard against an overlapping schedule. Under a sustained input
 * burst (for example, a held Backspace key), the schedules stack up. Each
 * one fires a Vue re-render of every effect that reads `editor.state`, and
 * the page freezes.
 *
 * This composable adds the missing guard: a transaction schedules a rebuild
 * only when no rebuild is already pending. `build` always runs from a
 * `requestAnimationFrame` callback, outside any Vue effect, so it can safely
 * call `editor.isActive(...)`, `editor.can()...`, or read `editor.state` /
 * `editor.view.state` without becoming a tracked dependency.
 *
 * The optional `rebuildOn` getter names extra reactive sources. When one of
 * them changes, the snapshot rebuilds at once. The toolbars use it to follow
 * a change of their items or of the admin language.
 *
 * Each call to this composable owns its own `scheduled`/`rafId` state. Do
 * not hoist that state to module scope — multiple toolbars call this
 * composable at once, and a shared guard would make one toolbar's pending
 * frame suppress another toolbar's update.
 */
export function useEditorSnapshot<T>(
  editor: () => Editor | undefined,
  build: (editor: Editor) => T,
  rebuildOn?: () => unknown
): Readonly<ShallowRef<T | undefined>> {
  const snapshot = shallowRef<T | undefined>()

  let scheduled = false
  let rafId: number | undefined

  function run() {
    // Clear the guard before building. If a transaction arrives while
    // `build` runs, it schedules a fresh frame instead of being dropped.
    scheduled = false

    const current = editor()
    if (!current || current.isDestroyed) {
      return
    }

    snapshot.value = build(current)
  }

  function schedule() {
    if (scheduled) {
      return
    }
    scheduled = true
    rafId = requestAnimationFrame(run)
  }

  watch(
    editor,
    (current, _previous, onCleanup) => {
      if (!current) {
        return
      }

      // Build once immediately, so the snapshot is not `undefined` before
      // the first transaction fires.
      run()

      current.on('transaction', schedule)

      onCleanup(() => {
        current.off('transaction', schedule)
        if (rafId !== undefined) {
          cancelAnimationFrame(rafId)
        }
        scheduled = false
      })
    },
    { immediate: true }
  )

  if (rebuildOn) {
    watch(rebuildOn, run)
  }

  return snapshot
}
