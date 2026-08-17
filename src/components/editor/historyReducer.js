// Every MOVE_SHAPE/RESIZE_SHAPE/ROTATE_SHAPE dispatch sequence must eventually
// be followed by a matching DRAG_END, or `isDragging` gets stuck true and all
// future drags silently stop creating undo checkpoints. If a future feature
// dispatches one of these continuous actions outside a pointer gesture (e.g.
// arrow-key nudging), make sure it still fires a DRAG_END when the gesture ends.
const CONTINUOUS_TYPES = new Set([
  'MOVE_SHAPE',
  'RESIZE_SHAPE',
  'ROTATE_SHAPE',
  'RECONNECT_ARROW_ENDPOINT',
  'MOVE_ARROW_LABEL',
  'ROTATE_ARROW_LABEL',
  'SET_ARROW_ROUTE_OFFSET',
  // The corner-radius slider (EditorTopbar) dispatches this on every drag
  // tick, same as a mouse-drag dispatches MOVE_SHAPE on every pointermove -
  // without coalescing, dragging the slider once from 0 to 48 would create
  // 48 separate undo steps instead of one.
  'SET_SHAPE_CORNER_RADIUS',
  // The opacity slider (EditorTopbar) is the same continuous drag-tick
  // gesture as corner radius above, just for a different field/target kind.
  'SET_SHAPE_OPACITY',
  'SET_ARROW_OPACITY',
  // Dragging an ERD row to reorder it (Shape.jsx's ErdTableBody) dispatches
  // this once per row-height crossed, same "many dispatches, one undo step"
  // reasoning as every other entry above.
  'REORDER_ERD_ROW',
])

const MAX_HISTORY = 100

// Reused for shapes/arrows AND shapeOrder/arrowOrder below: keeps *this*
// client's existing reference for any entry (or, for the order arrays, the
// whole array) whose content is unchanged, instead of adopting the
// freshly-deserialized copy from the wire wholesale. React.memo on
// <Shape>/ArrowLayer's per-arrow component compares its own record prop by
// reference (see Shape.jsx's own comment on why), and EditorCanvas/ArrowLayer
// each memoize a bounds calculation keyed on [shapes, shapeOrder] - without
// this, every throttled remote broadcast (up to ~20/sec while any
// collaborator drags something) gave literally everything a new reference at
// once, forcing every shape/arrow to re-render and every bounds recompute
// regardless of whether any of it actually changed, not just whichever one
// thing someone's actively moving.
function contentEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

// `removedIds` tells apart the two shapes a patch's id-map can arrive in:
// - undefined: `changed` IS the complete set (a full DB row - the
//   visibility-change refetch in useDiagramEditor.js applies one of these
//   verbatim). Anything in `current` missing from `changed` was deleted.
// - an array (even `[]`): `changed` is only what's DIFFERENT since this
//   sender's last broadcast (see buildBroadcastDiff there) - everything
//   else in `current` is untouched and stays exactly as it is, and only the
//   ids explicitly listed here were removed.
function applyIdPatch(current, changed, removedIds) {
  if (removedIds === undefined) {
    if (!changed) return current
    let allSame = Object.keys(current).length === Object.keys(changed).length
    const next = {}
    for (const id in changed) {
      const currentEntry = current[id]
      if (currentEntry && contentEqual(currentEntry, changed[id])) {
        next[id] = currentEntry
      } else {
        next[id] = changed[id]
        allSame = false
      }
    }
    return allSame ? current : next
  }

  if ((!changed || Object.keys(changed).length === 0) && removedIds.length === 0) return current
  let same = true
  const next = { ...current }
  if (changed) {
    for (const id in changed) {
      const currentEntry = current[id]
      if (currentEntry && contentEqual(currentEntry, changed[id])) continue
      next[id] = changed[id]
      same = false
    }
  }
  for (const id of removedIds) {
    if (id in next) {
      delete next[id]
      same = false
    }
  }
  return same ? current : next
}

function mergeOrder(current, incoming) {
  if (current.length === incoming.length && current.every((id, i) => id === incoming[i])) {
    return current
  }
  return incoming
}

// A patch is either a diff broadcast from another client's own
// buildBroadcastDiff (useDiagramEditor.js) - only changed shapes/arrows/
// comment-threads plus explicit removed-id lists - or a full DB row applied
// wholesale (the visibility-change refetch), which predates the
// removed-id-list fields entirely. applyIdPatch's own `removedIds`
// parameter is what tells those two apart; everything else here (order
// arrays, counters, showGrid) is small enough to always send/apply whole
// either way, so those fields alone can't tell a diff from a full snapshot
// the way the id-maps can.
function mergeRemotePatch(present, patch) {
  const result = {}
  if (patch.shapes || patch.removedShapeIds) {
    result.shapes = applyIdPatch(present.shapes, patch.shapes, patch.removedShapeIds)
  }
  if (patch.arrows || patch.removedArrowIds) {
    result.arrows = applyIdPatch(present.arrows, patch.arrows, patch.removedArrowIds)
  }
  if (patch.shapeOrder) result.shapeOrder = mergeOrder(present.shapeOrder, patch.shapeOrder)
  if (patch.arrowOrder) result.arrowOrder = mergeOrder(present.arrowOrder, patch.arrowOrder)
  if ('counters' in patch) result.counters = patch.counters
  if ('showGrid' in patch) result.showGrid = patch.showGrid
  if (patch.commentThreads || patch.removedCommentThreadIds) {
    result.commentThreads = applyIdPatch(
      present.commentThreads,
      patch.commentThreads,
      patch.removedCommentThreadIds,
    )
  }
  if (patch.commentThreadOrder) {
    result.commentThreadOrder = mergeOrder(present.commentThreadOrder, patch.commentThreadOrder)
  }
  return result
}

function contentChanged(prev, next) {
  return (
    prev.shapes !== next.shapes ||
    prev.shapeOrder !== next.shapeOrder ||
    prev.arrows !== next.arrows ||
    prev.arrowOrder !== next.arrowOrder ||
    prev.counters !== next.counters
  )
}

function pushPast(past, entry) {
  const next = [...past, entry]
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
}

export function initHistory(present) {
  return { past: [], present, future: [], isDragging: false }
}

// Wraps a plain content reducer with undo/redo history. UNDO/REDO are no-ops
// while a drag gesture is in progress (isDragging), so pressing Ctrl+Z with
// the mouse still held down can't corrupt the gesture's in-flight anchor -
// see the design notes in Phase 4 of the editor plan for why that matters.
export function createHistoryReducer(contentReducer) {
  return function historyReducer(history, action) {
    // A collaborator's content, applied live over the diagram's realtime
    // channel (see useDiagramChannel) - deliberately doesn't touch past/future
    // or isDragging. Folding a remote peer's edit into *your own* undo stack
    // would let your Ctrl+Z revert someone else's change out from under
    // them; instead it just updates what you're looking at, and your own
    // undo history stays exclusively a record of your own actions.
    if (action.type === 'APPLY_REMOTE_STATE') {
      const { patch } = action
      const present = history.present
      const merged = mergeRemotePatch(present, patch)
      if (!history.isDragging) {
        return { ...history, present: { ...present, ...merged } }
      }

      // Mid a local drag/resize/rotate. A remote snapshot reflects the
      // *sender's* last-known copy of whatever's selected here - which
      // predates whatever this gesture is doing to it (that hasn't reached
      // them yet). Applying it wholesale would yank the shape/arrow being
      // dragged back to a stale position out from under the user's own
      // cursor mid-gesture. Keep this client's own in-flight copy of
      // exactly what's selected; everything else in the patch - including
      // brand new shapes/arrows the sender just added - still applies
      // immediately.
      const selection = present.selection
      const next = { ...present, ...merged }
      if (selection?.kind === 'shape' && merged.shapes) {
        next.shapes = { ...merged.shapes }
        for (const id of selection.ids) {
          if (present.shapes[id]) next.shapes[id] = present.shapes[id]
        }
      } else if (selection?.kind === 'arrow' && merged.arrows) {
        next.arrows = { ...merged.arrows }
        if (present.arrows[selection.id]) next.arrows[selection.id] = present.arrows[selection.id]
      }
      return { ...history, present: next }
    }

    if (action.type === 'UNDO') {
      if (history.isDragging || history.past.length === 0) return history
      const previous = history.past[history.past.length - 1]
      return {
        past: history.past.slice(0, -1),
        present: previous,
        future: [history.present, ...history.future],
        isDragging: false,
      }
    }

    if (action.type === 'REDO') {
      if (history.isDragging || history.future.length === 0) return history
      const [next, ...rest] = history.future
      return {
        past: pushPast(history.past, history.present),
        present: next,
        future: rest,
        isDragging: false,
      }
    }

    const nextPresent = contentReducer(history.present, action)

    if (action.type === 'DRAG_END') {
      return { ...history, present: nextPresent, isDragging: false }
    }

    if (CONTINUOUS_TYPES.has(action.type)) {
      if (nextPresent === history.present) return history
      if (history.isDragging) {
        return { ...history, present: nextPresent }
      }
      return {
        past: pushPast(history.past, history.present),
        present: nextPresent,
        future: [],
        isDragging: true,
      }
    }

    if (nextPresent === history.present) return history

    if (contentChanged(history.present, nextPresent)) {
      return {
        past: pushPast(history.past, history.present),
        present: nextPresent,
        future: [],
        isDragging: false,
      }
    }

    // Transient UI-only change (selection, tool, pending arrow source) -
    // update present but don't create an undo checkpoint, and don't disturb
    // isDragging (a transient action firing mid-drag shouldn't end the
    // gesture's coalescing).
    return { ...history, present: nextPresent }
  }
}
