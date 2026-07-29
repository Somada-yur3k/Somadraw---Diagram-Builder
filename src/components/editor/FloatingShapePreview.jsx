import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDiagramEditorContext } from './DiagramEditorContext'
import ShapeIcon from './ShapeIcon'
import { PLACEABLE_SHAPE_LABEL_BY_KEY } from './shapeCatalog'

// Picking a shape from the sidebar arms `state.tool` with that shape's key -
// the *next* click anywhere on the canvas is what actually places it (see
// EditorCanvas's handleCanvasPointerDown / ADD_SHAPE). This component adds
// the missing visual feedback for that gap: a small ghost card that tracks
// the cursor the whole time a shape tool stays armed, so it reads like
// dragging the shape into place instead of a blind two-click sequence.
// Disappears the instant a tool stops being placeable, which covers every
// way that already happens today - clicking the canvas to place it (ADD_SHAPE
// resets tool to 'select'), picking Select & Move, or picking a different
// tool/shape entirely.
function FloatingShapePreview() {
  const { state, readOnly } = useDiagramEditorContext()
  const label = PLACEABLE_SHAPE_LABEL_BY_KEY[state.tool]
  const isPlaceable = Boolean(label) && !readOnly

  // Tracked independently of `pos` below (and always listening, regardless
  // of isPlaceable) purely so that the moment a tool *becomes* placeable,
  // the ghost can seed its first position from wherever the cursor already
  // is - otherwise it would only appear once the mouse next moves, flashing
  // at a stale spot (or nowhere) right when the user picked the tool.
  const lastPointerRef = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const trackPointer = (event) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
    }
    window.addEventListener('pointermove', trackPointer)
    return () => window.removeEventListener('pointermove', trackPointer)
  }, [])

  const [pos, setPos] = useState(null)
  // Adjusting state during render (React's own documented pattern for
  // "reset/seed state when a prop changes", same idiom EditorTopbar.jsx
  // already uses for its own popover-closing transitions) rather than an
  // effect - seeds the ghost's first position from wherever the cursor
  // already is the instant a tool becomes placeable, instead of a stale spot
  // (or nothing) until the next pointermove fires.
  const [wasPlaceable, setWasPlaceable] = useState(isPlaceable)
  if (isPlaceable !== wasPlaceable) {
    setWasPlaceable(isPlaceable)
    setPos(isPlaceable ? lastPointerRef.current : null)
  }

  useEffect(() => {
    if (!isPlaceable) return
    const handleMove = (event) => setPos({ x: event.clientX, y: event.clientY })
    window.addEventListener('pointermove', handleMove)
    return () => window.removeEventListener('pointermove', handleMove)
  }, [isPlaceable])

  if (!isPlaceable || !pos) return null

  return createPortal(
    <div
      className="pointer-events-none fixed z-40 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-lg border border-line bg-white/95 px-3 py-2 shadow-lg"
      style={{ left: pos.x, top: pos.y }}
    >
      <span className="scale-150">
        <ShapeIcon toolKey={state.tool} />
      </span>
      <span className="whitespace-nowrap text-[12.5px] font-medium text-ink">{label}</span>
    </div>,
    document.body,
  )
}

export default FloatingShapePreview
