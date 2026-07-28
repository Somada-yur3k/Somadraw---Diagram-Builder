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
const NUDGE_STEP = 1
const NUDGE_STEP_LARGE = 10
const NUDGE_DELTAS = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
}

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

// A collaborator's live pointer. Positioned in logical/diagram coordinates
// (like Shape, so the parent canvas div's `scale(zoom)` transform places it
// correctly), but counter-scaled by 1/zoom so the marker and label stay a
// constant, legible on-screen size instead of shrinking to a speck at low
// zoom or ballooning at high zoom.
function CursorMarker({ x, y, email, color, zoom }) {
  return (
    <div
      className="pointer-events-none absolute z-40 flex items-center gap-1"
      style={{ left: x, top: y, transform: `scale(${1 / zoom})`, transformOrigin: 'top left' }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={color} stroke="white" strokeWidth="1.5" className="shrink-0">
        <path d="M4 3 L20 12 L12.5 13.5 L9.5 20.5 Z" />
      </svg>
      <span
        className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {email}
      </span>
    </div>
  )
}

// canvasNodeRef is optional - when passed (by Editor.jsx, for the PDF
// export panel), it's kept pointed at the same DOM node as this
// component's own internal canvasRef, so the export code can read the live
// canvas without EditorCanvas needing to know anything about exporting.
function EditorCanvas({ canvasNodeRef }) {
  const { state, dispatch, readOnly, cursors, updateCursor, clearCursor } = useDiagramEditorContext()
  const zoom = state.viewport.zoom
  const wrapperRef = useRef(null)
  const canvasRef = useRef(null)
  const marqueeDragRef = useRef(null)
  const zoomAnchorRef = useRef(null)
  const prevZoomRef = useRef(zoom)
  const [marqueeRect, setMarqueeRect] = useState(null)

  // The scrollable area only reserved exactly CANVAS_WIDTH*zoom /
  // CANVAS_HEIGHT*zoom of space - fine at 100% zoom on a normal-size window,
  // but zooming out (or just having a big monitor) could leave the wrapper
  // visibly larger than that, showing a dead plain-bg-canvas margin past the
  // grid's edge instead of dot pattern all the way to the panel's own
  // border. Measuring the wrapper lets the scrollable area (and the grid
  // background drawn on it below) grow to always cover at least the visible
  // viewport, at any zoom level or window size - CANVAS_WIDTH/CANVAS_HEIGHT
  // themselves stay untouched (ArrowLayer's SVG bounds and PDF export both
  // key off those), only the decorative grid margin around them expands.
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])
  const renderWidth = Math.max(CANVAS_WIDTH, viewport.width / zoom)
  const renderHeight = Math.max(CANVAS_HEIGHT, viewport.height / zoom)

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
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'c') {
        if (state.selection?.kind !== 'shape') return
        event.preventDefault()
        dispatch({ type: 'COPY_SELECTED' })
      }
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        dispatch({ type: 'PASTE' })
      }
      // Nudge the selected shape(s) - Shift for the larger 10px step, plain
      // arrow for 1px, matching the usual design-tool convention. Dispatched
      // as its own MOVE_SHAPE(s)-then-DRAG_END pair (not left mid-gesture)
      // so each key press becomes its own undo step, the same as releasing
      // a mouse drag would - MOVE_SHAPE is a "continuous" action (see
      // historyReducer's CONTINUOUS_TYPES), and leaving it dangling without
      // a DRAG_END would stick `isDragging` true forever, which blocks
      // undo/redo and the debounced DB save indefinitely.
      if (NUDGE_DELTAS[event.key] && !readOnly && state.selection?.kind === 'shape') {
        event.preventDefault()
        const step = event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP
        const { dx, dy } = NUDGE_DELTAS[event.key]
        for (const id of state.selection.ids) {
          const shape = state.shapes[id]
          if (!shape) continue
          dispatch({ type: 'MOVE_SHAPE', id, x: shape.x + dx * step, y: shape.y + dy * step })
        }
        dispatch({ type: 'DRAG_END' })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.selection, state.pendingArrowSourceId, state.shapes, readOnly, dispatch])

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
    updateCursor(hoverPoint.x, hoverPoint.y)

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
      <div
        style={{
          width: renderWidth * zoom,
          height: renderHeight * zoom,
          ...(state.showGrid
            ? {
                backgroundImage:
                  'radial-gradient(circle, color-mix(in srgb, var(--color-ink) 18%, transparent) 1.25px, transparent 1.25px)',
                backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              }
            : {}),
        }}
      >
        <div
          ref={(node) => {
            canvasRef.current = node
            if (canvasNodeRef) canvasNodeRef.current = node
          }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={endMarquee}
          onPointerCancel={endMarquee}
          onPointerLeave={clearCursor}
          className="relative"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            cursor: state.tool === 'select' ? 'default' : 'crosshair',
          }}
        >
          <ArrowLayer />
          {state.shapeOrder.map((id) => (
            <Shape key={id} shape={state.shapes[id]} zoom={zoom} />
          ))}
          <ArrowLabels />
          {cursors.map((cursor) => (
            <CursorMarker
              key={cursor.clientId}
              x={cursor.x}
              y={cursor.y}
              email={cursor.email}
              color={cursor.color}
              zoom={zoom}
            />
          ))}
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
