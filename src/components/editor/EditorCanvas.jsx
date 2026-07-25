import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Shape from './Shape'
import ArrowLayer from './ArrowLayer'
import ArrowLabels from './ArrowLabels'
import { useDiagramEditorContext } from './DiagramEditorContext'
import { containsPoint } from './arrowRouting'

export const CANVAS_WIDTH = 2400
export const CANVAS_HEIGHT = 1400
const MARQUEE_THRESHOLD = 3
const ZOOM_STEP = 0.1

function shapeRect(shape) {
  return {
    left: shape.x,
    top: shape.y,
    right: shape.x + shape.width,
    bottom: shape.y + shape.height,
  }
}

function rectsIntersect(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
}

// canvasNodeRef is optional - when passed (by Editor.jsx, for the PDF
// export panel), it's kept pointed at the same DOM node as this
// component's own internal canvasRef, so the export code can read the live
// canvas without EditorCanvas needing to know anything about exporting.
function EditorCanvas({ canvasNodeRef }) {
  const { state, dispatch } = useDiagramEditorContext()
  const zoom = state.viewport.zoom
  const wrapperRef = useRef(null)
  const canvasRef = useRef(null)
  const marqueeDragRef = useRef(null)
  const zoomAnchorRef = useRef(null)
  const prevZoomRef = useRef(zoom)
  const [marqueeRect, setMarqueeRect] = useState(null)

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target
      const isEditingText =
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      if (isEditingText) return
      if ((event.key === 'Delete' || event.key === 'Backspace') && state.selection) {
        event.preventDefault()
        dispatch({ type: 'DELETE_SELECTED' })
      }
      if (event.key === 'Escape' && state.pendingArrowSourceId) {
        dispatch({ type: 'CANCEL_PENDING_ARROW' })
      }
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        dispatch({ type: event.shiftKey ? 'REDO' : 'UNDO' })
      }
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        dispatch({ type: 'REDO' })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.selection, state.pendingArrowSourceId, dispatch])

  // Native (not JSX onWheel) so preventDefault reliably stops page-zoom -
  // matches this file's existing native window keydown listener precedent.
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const handleWheel = (event) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      zoomAnchorRef.current = { clientX: event.clientX, clientY: event.clientY }
      const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      dispatch({ type: 'SET_ZOOM', zoom: state.viewport.zoom + delta })
    }
    wrapper.addEventListener('wheel', handleWheel, { passive: false })
    return () => wrapper.removeEventListener('wheel', handleWheel)
  }, [state.viewport.zoom, dispatch])

  // Keeps whatever point was under the cursor (or the viewport center, for
  // toolbar-button zoom changes) visually anchored across a zoom change,
  // instead of the canvas jumping toward its top-left corner.
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current
    const prevZoom = prevZoomRef.current
    prevZoomRef.current = zoom
    if (!wrapper || prevZoom === zoom) return

    const wrapperRect = wrapper.getBoundingClientRect()
    const anchor = zoomAnchorRef.current
    zoomAnchorRef.current = null
    const offsetX = anchor ? anchor.clientX - wrapperRect.left : wrapperRect.width / 2
    const offsetY = anchor ? anchor.clientY - wrapperRect.top : wrapperRect.height / 2

    const contentX = (wrapper.scrollLeft + offsetX) / prevZoom
    const contentY = (wrapper.scrollTop + offsetY) / prevZoom
    wrapper.scrollLeft = contentX * zoom - offsetX
    wrapper.scrollTop = contentY * zoom - offsetY
  }, [zoom])

  const handleCanvasPointerDown = (event) => {
    if (event.target !== event.currentTarget) return

    if (state.tool === 'arrow') {
      if (state.pendingArrowSourceId) dispatch({ type: 'CANCEL_PENDING_ARROW' })
      return
    }

    const rect = canvasRef.current.getBoundingClientRect()

    if (state.tool === 'select') {
      // Prevents the browser's native drag-to-select-text from hijacking the
      // marquee gesture (there's no editable text on the canvas background
      // itself, so unlike Shape.jsx's drag this has no blur-on-mousedown
      // behavior worth preserving).
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      marqueeDragRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startLogicalX: (event.clientX - rect.left) / zoom,
        startLogicalY: (event.clientY - rect.top) / zoom,
        moved: false,
      }
      return
    }

    dispatch({
      type: 'ADD_SHAPE',
      shapeType: state.tool,
      x: (event.clientX - rect.left) / zoom,
      y: (event.clientY - rect.top) / zoom,
    })
  }

  const handleCanvasPointerMove = (event) => {
    // Geometric hover detection (point-in-rect against every shape, not DOM
    // hit-testing) - see containsPoint's comment for why. Runs on every
    // move over the canvas, including moves bubbled up from a captured
    // drag elsewhere in this subtree (a shape move, resize/rotate, or an
    // arrow-endpoint reconnect), since pointer capture changes the event's
    // target but not its normal bubbling.
    const hoverRect = canvasRef.current.getBoundingClientRect()
    const hoverPoint = {
      x: (event.clientX - hoverRect.left) / zoom,
      y: (event.clientY - hoverRect.top) / zoom,
    }
    let hoveredId = null
    for (let i = state.shapeOrder.length - 1; i >= 0; i--) {
      const id = state.shapeOrder[i]
      if (containsPoint(state.shapes[id], hoverPoint)) {
        hoveredId = id
        break
      }
    }
    if (hoveredId !== state.hoveredShapeId) {
      dispatch({ type: 'SET_HOVERED_SHAPE', shapeId: hoveredId })
    }

    const drag = marqueeDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const screenDx = event.clientX - drag.startClientX
    const screenDy = event.clientY - drag.startClientY
    if (!drag.moved && Math.hypot(screenDx, screenDy) < MARQUEE_THRESHOLD) return
    drag.moved = true

    const rect = canvasRef.current.getBoundingClientRect()
    const currentLogicalX = (event.clientX - rect.left) / zoom
    const currentLogicalY = (event.clientY - rect.top) / zoom

    setMarqueeRect({
      left: Math.min(drag.startLogicalX, currentLogicalX),
      top: Math.min(drag.startLogicalY, currentLogicalY),
      right: Math.max(drag.startLogicalX, currentLogicalX),
      bottom: Math.max(drag.startLogicalY, currentLogicalY),
    })
  }

  const endMarquee = (event) => {
    const drag = marqueeDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    marqueeDragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setMarqueeRect(null)

    if (!drag.moved) {
      dispatch({ type: 'DESELECT' })
      return
    }

    const rect = canvasRef.current.getBoundingClientRect()
    const endLogicalX = (event.clientX - rect.left) / zoom
    const endLogicalY = (event.clientY - rect.top) / zoom
    const finalRect = {
      left: Math.min(drag.startLogicalX, endLogicalX),
      top: Math.min(drag.startLogicalY, endLogicalY),
      right: Math.max(drag.startLogicalX, endLogicalX),
      bottom: Math.max(drag.startLogicalY, endLogicalY),
    }

    // shift+drag is intentionally not a union-select in this phase - the
    // marquee always replaces the current selection.
    const ids = state.shapeOrder.filter((id) =>
      rectsIntersect(shapeRect(state.shapes[id]), finalRect),
    )
    dispatch({ type: 'SELECT', kind: 'shape', ids })
  }

  return (
    <div ref={wrapperRef} className="min-h-0 flex-1 overflow-auto bg-canvas">
      <div style={{ width: CANVAS_WIDTH * zoom, height: CANVAS_HEIGHT * zoom }}>
        <div
          ref={(node) => {
            canvasRef.current = node
            if (canvasNodeRef) canvasNodeRef.current = node
          }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={endMarquee}
          onPointerCancel={endMarquee}
          className="relative"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            ...(state.showGrid
              ? {
                  backgroundImage:
                    'radial-gradient(circle, color-mix(in srgb, var(--color-ink) 18%, transparent) 1.25px, transparent 1.25px)',
                  backgroundSize: '20px 20px',
                }
              : {}),
            cursor: state.tool === 'select' ? 'default' : 'crosshair',
          }}
        >
          <ArrowLayer />
          {state.shapeOrder.map((id) => (
            <Shape key={id} shape={state.shapes[id]} zoom={zoom} />
          ))}
          <ArrowLabels />
          {marqueeRect && (
            <div
              className="pointer-events-none absolute border border-brand-purple bg-brand-purple/10"
              style={{
                left: marqueeRect.left,
                top: marqueeRect.top,
                width: marqueeRect.right - marqueeRect.left,
                height: marqueeRect.bottom - marqueeRect.top,
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default EditorCanvas
