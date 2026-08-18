import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Shape from './Shape'
import ArrowLayer from './ArrowLayer'
import ArrowLabels from './ArrowLabels'
import ArrowCardinalityPickers from './ArrowCardinalityPickers'
import CommentLayer from './CommentLayer'
import EditorContextMenu from './EditorContextMenu'
import { useDiagramEditorContext } from './DiagramEditorContext'
import { containsPoint } from './arrowRouting'
import { readClipboard, MIN_ZOOM, MAX_ZOOM } from './useDiagramEditor'

// One CSS background per state.gridStyle value (see EditorTopbar's grid
// style picker) - all built from plain gradients (no image assets), scaled
// by the same `zoom` the dot grid already was, so every style stays a
// constant on-screen size regardless of how far zoomed in/out the diagram
// is instead of the pattern itself scaling with content.
function gridBackgroundStyle(gridStyle, zoom) {
  if (gridStyle === 'lines') {
    const line = 'color-mix(in srgb, var(--color-ink) 12%, transparent) 1px, transparent 1px'
    return {
      backgroundImage: `linear-gradient(to right, ${line}), linear-gradient(to bottom, ${line})`,
      backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
    }
  }
  if (gridStyle === 'graphPaper') {
    // Minor lines every cell (same 20px unit as 'lines'), major lines every
    // 5 cells and more visible - the classic engineering-graph-paper look.
    const major = 'color-mix(in srgb, var(--color-ink) 22%, transparent) 1px, transparent 1px'
    const minor = 'color-mix(in srgb, var(--color-ink) 10%, transparent) 1px, transparent 1px'
    return {
      backgroundImage: `linear-gradient(to right, ${major}), linear-gradient(to bottom, ${major}), linear-gradient(to right, ${minor}), linear-gradient(to bottom, ${minor})`,
      backgroundSize: `${100 * zoom}px ${100 * zoom}px, ${100 * zoom}px ${100 * zoom}px, ${20 * zoom}px ${20 * zoom}px, ${20 * zoom}px ${20 * zoom}px`,
    }
  }
  // 'dots' - the original/default look.
  return {
    backgroundImage:
      'radial-gradient(circle, color-mix(in srgb, var(--color-ink) 18%, transparent) 1.25px, transparent 1.25px)',
    backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
  }
}

export const CANVAS_WIDTH = 2400
export const CANVAS_HEIGHT = 1400
// How much clear room to always keep past the furthest shape edge, as a
// fraction of how far out that edge already is - a diagram that's grown
// close to (or past) the default CANVAS_WIDTH/HEIGHT would otherwise leave
// nowhere left to drop a new shape near whatever's already out at the edge,
// short of first scrolling/zooming out to make room by hand.
const CONTENT_MARGIN_RATIO = 0.25

// Shapes are already clamped to non-negative x/y (see clampShapePosition in
// useDiagramEditor.js), so unlike ArrowLayer's own bounds computation this
// only ever needs to grow outward from (0, 0), never track a negative
// min - the canvas div's own origin stays anchored at (0, 0) throughout.
function computeCanvasSize(shapes, shapeOrder) {
  let maxX = 0
  let maxY = 0
  for (const id of shapeOrder) {
    const shape = shapes[id]
    maxX = Math.max(maxX, shape.x + shape.width)
    maxY = Math.max(maxY, shape.y + shape.height)
  }
  return {
    width: Math.max(CANVAS_WIDTH, maxX * (1 + CONTENT_MARGIN_RATIO)),
    height: Math.max(CANVAS_HEIGHT, maxY * (1 + CONTENT_MARGIN_RATIO)),
  }
}

const MARQUEE_THRESHOLD = 3
// Native dblclick isn't reliable for the empty-canvas pan gesture below -
// the marquee/shape-placement pointerdown handling calls setPointerCapture
// on the very first click, which can redirect the second click's event
// target away from this element (same reasoning EditableText.jsx's own
// double-click detection already documents). Detected manually from
// pointerdown timing instead.
const DOUBLE_CLICK_MS = 400
// Exported so EditorTopbar's zoom in/out buttons move by the exact same
// amount as this file's own Ctrl+Wheel zoom below - one shared step, not
// two magic numbers that happen to match today.
export const ZOOM_STEP = 0.1
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
function CursorMarker({ x, y, name, email, color, zoom }) {
  return (
    <div
      // Lets diagramExport.js's filter exclude these from an export - a
      // collaborator's live cursor is exactly the kind of thing that
      // shouldn't show up as a stray colored arrow in a printout. Same flag
      // ArrowCardinalityPickers.jsx uses for its own selection-only chips.
      data-export-hidden
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
        {name || email}
      </span>
    </div>
  )
}

// Smart alignment guides - the dashed lines shown while dragging a shape
// once it lines up with another one's edge/center (see Shape.jsx, which
// computes these via alignmentSnap.js and clears them on drop). Positioned
// in the same logical/diagram coordinates as Shape/CursorMarker above (the
// canvas's own scale(zoom) transform handles the screen-pixel side), so
// unlike CursorMarker this needs no counter-scaling - a 1px guide line
// should get visually thinner at low zoom and thicker at high zoom, the
// same as a shape's own border would. Never present during an actual
// export capture (a user can't be mid-drag and clicking Export at the same
// time), so unlike CursorMarker this doesn't need its own exclusion hook
// into diagramExport.js's filter.
function AlignmentGuideLines({ guides }) {
  return (
    <>
      {guides.vertical && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-30 border-l border-dashed border-brand-pink"
          style={{
            left: guides.vertical.x,
            top: guides.vertical.y1,
            height: guides.vertical.y2 - guides.vertical.y1,
          }}
        />
      )}
      {guides.horizontal && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-30 border-t border-dashed border-brand-pink"
          style={{
            left: guides.horizontal.x1,
            top: guides.horizontal.y,
            width: guides.horizontal.x2 - guides.horizontal.x1,
          }}
        />
      )}
    </>
  )
}

// canvasNodeRef is optional - when passed (by Editor.jsx, for the PDF
// export panel), it's kept pointed at the same DOM node as this
// component's own internal canvasRef, so the export code can read the live
// canvas without EditorCanvas needing to know anything about exporting.
function EditorCanvas({ canvasNodeRef }) {
  const { state, dispatch, readOnly, isDragging, cursors, updateCursor, clearCursor, showComments } =
    useDiagramEditorContext()
  const zoom = state.viewport.zoom
  // Lets each memoized <Shape> read fresh state (e.g. other selected shapes'
  // positions at the start of a group drag) from inside an event handler
  // without itself being a reactive prop - see Shape.jsx's own comment on
  // why that matters for memo to actually skip unaffected shapes.
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })
  const wrapperRef = useRef(null)
  const canvasRef = useRef(null)
  const marqueeDragRef = useRef(null)
  const zoomAnchorRef = useRef(null)
  const prevZoomRef = useRef(zoom)
  // Set by handleZoomToFit just before dispatching SET_ZOOM - { x, y } in
  // canvas/world coordinates to center the viewport on once the zoom
  // effect below actually runs, taking priority over zoomAnchorRef's own
  // "keep this screen point anchored" logic (fitting content wants a
  // specific world point centered, not whatever was already under the
  // cursor/viewport-center before the zoom changed).
  const fitTargetRef = useRef(null)
  const [marqueeRect, setMarqueeRect] = useState(null)
  // Double-click-and-hold empty canvas to pan by dragging, instead of
  // hunting for the scrollbar - panRef tracks the in-progress gesture
  // (wrapper's own scroll position at grab time, so drag delta maps
  // straight onto it), isPanning only drives the cursor.
  const panRef = useRef(null)
  const lastCanvasClickAtRef = useRef(0)
  const [isPanning, setIsPanning] = useState(false)
  // A brand-new, not-yet-submitted comment's canvas position - local-only
  // (not dispatched) until actually posted, so clicking around with the
  // Comment tool active can't litter the shared, synced commentThreads with
  // empty drafts (see ADD_COMMENT_THREAD's own comment on why it requires
  // real content). Cleared whenever the Comment tool is deselected, so
  // switching to a different tool mid-compose can't leave an orphaned
  // composer floating with no way back to it.
  const [pendingCommentPos, setPendingCommentPos] = useState(null)
  // Adjusting state during render (comparing against last-seen state, not
  // a ref - this project's stricter lint rule disallows reading/writing
  // refs during render) - same pattern useDiagramEditor.js's own
  // lastPersisted/persistedChanged uses, for the same underlying reason: a
  // plain setState-inside-a-useEffect here would risk a cascading extra
  // render.
  const [lastToolSeen, setLastToolSeen] = useState(state.tool)
  if (lastToolSeen !== state.tool) {
    setLastToolSeen(state.tool)
    if (state.tool !== 'comment' && pendingCommentPos) setPendingCommentPos(null)
  }
  // Right-click menu (EditorContextMenu) - shape-only by design, see its own
  // comment. Just a screen position + open/closed; the menu itself reads
  // everything else it needs straight from `state`/`dispatch`.
  const [contextMenu, setContextMenu] = useState(null)

  // The actual interactive canvas div (pointer handlers, click-to-place,
  // marquee hit-testing) grows past the CANVAS_WIDTH/HEIGHT default once
  // shapes are placed out near or past its edge - see CONTENT_MARGIN_RATIO
  // above. Memoized the same way ArrowLayer's own bounds are, since
  // state.shapes changes reference on every dispatch.
  const canvasSize = useMemo(
    () => computeCanvasSize(state.shapes, state.shapeOrder),
    [state.shapes, state.shapeOrder],
  )

  // The scrollable area only reserved exactly canvasSize.width*zoom /
  // canvasSize.height*zoom of space - fine at 100% zoom on a normal-size
  // window, but zooming out (or just having a big monitor) could leave the
  // wrapper visibly larger than that, showing a dead plain-bg-canvas margin
  // past the grid's edge instead of dot pattern all the way to the panel's
  // own border. Measuring the wrapper lets the scrollable area (and the grid
  // background drawn on it below) grow to always cover at least the visible
  // viewport too, at any zoom level or window size.
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
  const renderWidth = Math.max(canvasSize.width, viewport.width / zoom)
  const renderHeight = Math.max(canvasSize.height, viewport.height / zoom)

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
        // Read fresh from the shared clipboard slot at the moment of paste
        // (not this diagram's own state.clipboard) - this is what lets a
        // copy made in a different diagram or browser tab paste in here.
        dispatch({ type: 'PASTE', clip: readClipboard() })
      }
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        dispatch({ type: 'SELECT', kind: 'shape', ids: state.shapeOrder })
      }
      // Ctrl+D - standard "duplicate in place" shortcut this app didn't have
      // yet (Figma/Slides/etc. convention); browsers bind this natively to
      // "bookmark page", same as Ctrl+S would collide with "save page" -
      // preventDefault suppresses that the same way every shortcut above
      // already does for its own native collision.
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'd') {
        if (state.selection?.kind !== 'shape') return
        event.preventDefault()
        dispatch({ type: 'DUPLICATE_SELECTED' })
      }
      // Ctrl+G / Ctrl+Shift+G - same actions as the right-click menu's Group
      // / Ungroup items (see EditorContextMenu.jsx), offered as shortcuts
      // too since Copy/Paste/Undo already work both ways.
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'g') {
        event.preventDefault()
        dispatch({ type: event.shiftKey ? 'UNGROUP_SELECTED' : 'GROUP_SELECTED' })
      }
      // Ctrl+]/Ctrl+[ step one position forward/backward, Ctrl+Shift+]/
      // Ctrl+Shift+[ jump all the way to front/back - same four-way split
      // Illustrator/Figma use, offered here as shortcuts for the same
      // actions the topbar/context-menu's own z-order buttons already
      // dispatch (BRING_TO_FRONT/SEND_TO_BACK didn't have a shortcut at
      // all before this; BRING_FORWARD/SEND_BACKWARD are brand new).
      if ((event.ctrlKey || event.metaKey) && (event.key === ']' || event.key === '[')) {
        if (state.selection?.kind !== 'shape') return
        event.preventDefault()
        const forward = event.key === ']'
        dispatch({ type: event.shiftKey ? (forward ? 'BRING_TO_FRONT' : 'SEND_TO_BACK') : (forward ? 'BRING_FORWARD' : 'SEND_BACKWARD') })
      }
      // Ctrl+Shift+L - same "toggle" convention Figma uses for lock/unlock.
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'l') {
        if (state.selection?.kind !== 'shape') return
        event.preventDefault()
        dispatch({ type: 'TOGGLE_SHAPE_LOCK' })
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
  }, [state.selection, state.pendingArrowSourceId, state.shapes, state.shapeOrder, readOnly, dispatch])

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

    const fitTarget = fitTargetRef.current
    fitTargetRef.current = null
    if (fitTarget) {
      wrapper.scrollLeft = fitTarget.x * zoom - wrapperRect.width / 2
      wrapper.scrollTop = fitTarget.y * zoom - wrapperRect.height / 2
      return
    }

    const anchor = zoomAnchorRef.current
    zoomAnchorRef.current = null
    const offsetX = anchor ? anchor.clientX - wrapperRect.left : wrapperRect.width / 2
    const offsetY = anchor ? anchor.clientY - wrapperRect.top : wrapperRect.height / 2

    const contentX = (wrapper.scrollLeft + offsetX) / prevZoom
    const contentY = (wrapper.scrollTop + offsetY) / prevZoom
    wrapper.scrollLeft = contentX * zoom - offsetX
    wrapper.scrollTop = contentY * zoom - offsetY
  }, [zoom])

  // "Zoom to fit" (EditorTopbar's own button) - dispatches
  // REQUEST_ZOOM_TO_FIT (just a counter bump, see its own comment in
  // useDiagramEditor.js) rather than computing everything there, since the
  // reducer has no way to measure the actual visible viewport - only this
  // component has wrapperRef. Skipped on the very first render (the ref
  // starts at 0 and nothing requested a fit yet) via the "already handled"
  // ref below, same guard pattern prevZoomRef uses for the effect above.
  const handledFitRequestIdRef = useRef(state.zoomFitRequestId)
  useEffect(() => {
    if (handledFitRequestIdRef.current === state.zoomFitRequestId) return
    handledFitRequestIdRef.current = state.zoomFitRequestId
    const wrapper = wrapperRef.current
    if (!wrapper || state.shapeOrder.length === 0) return

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const id of state.shapeOrder) {
      const shape = state.shapes[id]
      minX = Math.min(minX, shape.x)
      minY = Math.min(minY, shape.y)
      maxX = Math.max(maxX, shape.x + shape.width)
      maxY = Math.max(maxY, shape.y + shape.height)
    }

    const FIT_PADDING = 80
    const contentWidth = Math.max(1, maxX - minX)
    const contentHeight = Math.max(1, maxY - minY)
    const nextZoom = Math.min(
      MAX_ZOOM,
      Math.max(
        MIN_ZOOM,
        Math.min(
          (wrapper.clientWidth - FIT_PADDING * 2) / contentWidth,
          (wrapper.clientHeight - FIT_PADDING * 2) / contentHeight,
        ),
      ),
    )
    const target = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }

    if (nextZoom === zoom) {
      // The zoom effect above only runs on an actual zoom *change* - if the
      // fit zoom happens to already match the current one, nothing would
      // ever apply fitTargetRef, so scroll straight to the target instead.
      const wrapperRect = wrapper.getBoundingClientRect()
      wrapper.scrollLeft = target.x * zoom - wrapperRect.width / 2
      wrapper.scrollTop = target.y * zoom - wrapperRect.height / 2
    } else {
      fitTargetRef.current = target
      dispatch({ type: 'SET_ZOOM', zoom: nextZoom })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.zoomFitRequestId])

  const handleCanvasPointerDown = (event) => {
    if (event.target !== event.currentTarget) return

    // Double-click-and-hold empty canvas to pan by dragging - checked before
    // any tool-specific handling below (marquee-select, shape placement, the
    // pending-arrow cancel) so it always wins on the second click regardless
    // of which tool is active, the same way this gesture would in any other
    // canvas-based editor.
    const now = Date.now()
    const isDoubleClick = now - lastCanvasClickAtRef.current < DOUBLE_CLICK_MS
    lastCanvasClickAtRef.current = now
    if (isDoubleClick) {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      panRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startScrollLeft: wrapperRef.current.scrollLeft,
        startScrollTop: wrapperRef.current.scrollTop,
      }
      setIsPanning(true)
      return
    }

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

    // Comment tool: opens the composer at the click point rather than
    // placing anything immediately - see pendingCommentPos's own comment
    // above for why this is local state, not a dispatch.
    if (state.tool === 'comment') {
      setPendingCommentPos({
        x: (event.clientX - rect.left) / zoom,
        y: (event.clientY - rect.top) / zoom,
      })
      return
    }

    dispatch({
      type: 'ADD_SHAPE',
      shapeType: state.tool,
      x: (event.clientX - rect.left) / zoom,
      y: (event.clientY - rect.top) / zoom,
    })
  }

  // Shape-only (matches what was asked for - right-clicking empty canvas or
  // an arrow keeps the browser's own default menu). Right-clicking a shape
  // that's *not* already part of the current selection replaces the
  // selection with it first (SELECT's own group-expansion picks up the
  // whole group if it's grouped) - same as most apps' right-click behavior.
  // Right-clicking something already selected leaves the selection alone,
  // so a right-click inside an existing multi-selection acts on all of it
  // instead of collapsing down to just the one shape under the cursor.
  const handleContextMenu = (event) => {
    if (readOnly) return
    const shapeEl = event.target.closest('[data-shape-id]')
    if (!shapeEl) return
    event.preventDefault()
    const shapeId = shapeEl.getAttribute('data-shape-id')
    const alreadySelected =
      state.selection?.kind === 'shape' && state.selection.ids.includes(shapeId)
    if (!alreadySelected) {
      dispatch({ type: 'SELECT', kind: 'shape', ids: [shapeId] })
    }
    setContextMenu({ x: event.clientX, y: event.clientY })
  }

  const handleCanvasPointerMove = (event) => {
    const pan = panRef.current
    if (pan && pan.pointerId === event.pointerId) {
      const wrapper = wrapperRef.current
      // Content follows the cursor 1:1 in screen px (not divided by zoom -
      // scrollLeft/Top are already in the same screen-px space this drag
      // delta is measured in), same "grab and slide" feel as a hand tool.
      wrapper.scrollLeft = pan.startScrollLeft - (event.clientX - pan.startClientX)
      wrapper.scrollTop = pan.startScrollTop - (event.clientY - pan.startClientY)
      return
    }

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

  // Handles the pointerup/cancel end of either empty-canvas gesture this
  // element can be mid - the double-click pan started above, or the plain
  // marquee-select drag - they never overlap (pan's own pointerdown branch
  // always returns early, before marqueeDragRef could get set for that same
  // pointer), so checking pan first and returning is enough to keep them
  // from tripping over each other.
  const endCanvasGesture = (event) => {
    const pan = panRef.current
    if (pan && pan.pointerId === event.pointerId) {
      panRef.current = null
      setIsPanning(false)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      return
    }

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
          ...(state.showGrid ? gridBackgroundStyle(state.gridStyle, zoom) : {}),
        }}
      >
        <div
          ref={(node) => {
            canvasRef.current = node
            if (canvasNodeRef) canvasNodeRef.current = node
          }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={endCanvasGesture}
          onPointerCancel={endCanvasGesture}
          onPointerLeave={clearCursor}
          onContextMenu={handleContextMenu}
          className="relative"
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            cursor: isPanning ? 'grabbing' : state.tool === 'select' ? 'default' : 'crosshair',
          }}
        >
          <ArrowLayer />
          {state.shapeOrder.map((id) => {
            const isSelected = state.selection?.kind === 'shape' && state.selection.ids.includes(id)
            const isMultiSelected = isSelected && state.selection.ids.length > 1
            // A viewer can still select a shape (harmless, purely local) but
            // never drag/resize/rotate it - handles that would silently do
            // nothing on drag are worse than no handles at all, so they
            // don't render rather than rendering disabled. A locked shape
            // gets the same treatment for the same reason - see
            // TOGGLE_SHAPE_LOCK's own comment in useDiagramEditor.js.
            const showHandles =
              isSelected &&
              state.tool === 'select' &&
              state.selection.ids.length === 1 &&
              !readOnly &&
              !state.shapes[id]?.locked
            return (
              <Shape
                key={id}
                shape={state.shapes[id]}
                zoom={zoom}
                dispatch={dispatch}
                readOnly={readOnly}
                stateRef={stateRef}
                isSelected={isSelected}
                isMultiSelected={isMultiSelected}
                // A drag/resize/rotate gesture always operates on exactly
                // the current selection, so "selected while a local gesture
                // is in flight" is equivalent to "this specific shape is one
                // of the ones being moved right now."
                isLocallyDragging={isSelected && isDragging}
                isPendingArrowSource={state.pendingArrowSourceId === id}
                isArrowTool={state.tool === 'arrow'}
                isSelectTool={state.tool === 'select'}
                isConnectHover={state.hoveredShapeId === id}
                showHandles={showHandles}
              />
            )
          })}
          <ArrowLabels />
          <ArrowCardinalityPickers />
          {showComments && (
            <CommentLayer
              zoom={zoom}
              pendingCommentPos={pendingCommentPos}
              onCancelPending={() => {
                setPendingCommentPos(null)
                if (state.tool === 'comment') dispatch({ type: 'SET_TOOL', tool: 'select' })
              }}
            />
          )}
          <AlignmentGuideLines guides={state.alignmentGuides} />
          {cursors.map((cursor) => (
            <CursorMarker
              key={cursor.clientId}
              x={cursor.x}
              y={cursor.y}
              name={cursor.name}
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
      {contextMenu && (
        <EditorContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          state={state}
          dispatch={dispatch}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

export default EditorCanvas
