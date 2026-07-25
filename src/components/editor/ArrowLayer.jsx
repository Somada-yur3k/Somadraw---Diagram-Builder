import { useRef, useState } from 'react'
import { useDiagramEditorContext } from './DiagramEditorContext'
import { computeArrowRoute, containsPoint, nearestBorderPoint } from './arrowRouting'

const CANVAS_WIDTH = 2400
const CANVAS_HEIGHT = 1400
const HANDLE_RADIUS = 5
const ROUTE_HANDLE_SIZE = 8
// Fixed pixel offset (not a fraction of the segment's length) for where the
// visible route handle sits, away from the segment's exact midpoint -
// that midpoint is also exactly where the arrow's label renders
// (ArrowLabels.jsx uses the same point as its anchor). Labels are plain
// HTML, rendered as a later sibling of this SVG at the same z-index, so
// they'd otherwise paint over - and hit-test above - the handle. A fixed
// pixel offset (rather than e.g. 25% along the segment) still clears the
// label even when the segment itself is very short or near-zero-length -
// which is the common case for two same-height/same-x shapes, since a
// fresh connection's auto-picked t defaults to each shape's exact center.
// The invisible drag stroke still spans the whole segment, so the handle
// only needs to be visible somewhere clear of the label.
const ROUTE_HANDLE_OFFSET = 30

function ArrowLayer() {
  const { state, dispatch } = useDiagramEditorContext()
  const zoom = state.viewport.zoom
  const svgRef = useRef(null)
  const dragRef = useRef(null)
  const routeDragRef = useRef(null)
  // Which handle (if any) is mid-drag - plain hover-driven visibility isn't
  // enough here, since a drag needs to travel through shapes/empty space
  // that aren't its own endpoints; without this override the handle being
  // dragged would unmount the moment the cursor left its origin shape,
  // dropping pointer capture and aborting the gesture partway through.
  const [draggingHandle, setDraggingHandle] = useState(null)

  const visibleArrows = state.arrowOrder
    .map((id) => state.arrows[id])
    .filter((arrow) => arrow && state.shapes[arrow.fromId] && state.shapes[arrow.toId])

  const routedArrows = visibleArrows.map((arrow) => {
    const isSelected = state.selection?.kind === 'arrow' && state.selection.id === arrow.id
    const { d, start, end, midSegment } = computeArrowRoute(
      state.shapes[arrow.fromId],
      arrow.fromSide,
      arrow.fromT,
      state.shapes[arrow.toId],
      arrow.toSide,
      arrow.toT,
      arrow.routeMidOffset ?? 0,
      arrow.connectorType ?? 'shape',
    )
    return { arrow, isSelected, d, start, end, midSegment }
  })

  const toLogicalPoint = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect()
    return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom }
  }

  // Geometric point-in-rect lookup (same as EditorCanvas's hover tracker),
  // not DOM hit-testing - the dragged handle and this arrow's own path sit
  // right on top of shapes near their borders, so "topmost element at this
  // pixel" is an unreliable way to find the shape underneath.
  const findShapeIdAtPoint = (point) => {
    for (let i = state.shapeOrder.length - 1; i >= 0; i--) {
      const id = state.shapeOrder[i]
      if (containsPoint(state.shapes[id], point)) return id
    }
    return null
  }

  const beginReconnect = (arrowId, end, event) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, arrowId, end }
    setDraggingHandle({ arrowId, end })
  }

  const handleReconnectMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const arrow = state.arrows[drag.arrowId]
    if (!arrow) return

    const point = toLogicalPoint(event.clientX, event.clientY)
    const shapeId = findShapeIdAtPoint(point)

    // Self-loops stay unsupported, matching ARROW_TOOL_CLICK_SHAPE's
    // existing same-shape-cancels rule for newly drawn arrows.
    const otherShapeId = drag.end === 'from' ? arrow.toId : arrow.fromId
    if (!shapeId || shapeId === otherShapeId) {
      dispatch({ type: 'SET_HOVERED_SHAPE', shapeId: null })
      return
    }

    const { side, t } = nearestBorderPoint(state.shapes[shapeId], point)
    dispatch({ type: 'SET_HOVERED_SHAPE', shapeId })
    dispatch({
      type: 'RECONNECT_ARROW_ENDPOINT',
      id: drag.arrowId,
      end: drag.end,
      shapeId,
      side,
      t,
    })
  }

  const endReconnect = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    setDraggingHandle(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dispatch({ type: 'SET_HOVERED_SHAPE', shapeId: null })
    dispatch({ type: 'DRAG_END', id: drag.arrowId })
  }

  // Dragging the shared middle leg of a 2-bend route sideways - the manual
  // "adjust the routing" gesture. Mirrors ArrowLabels.jsx's drag pattern: a
  // dedicated ref (separate from the endpoint-reconnect one above, since the
  // two gestures track different fields), select-on-grab, offset stored
  // relative to whatever auto-routing already computed.
  const beginRouteDrag = (arrow, orientation, event) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dispatch({ type: 'SELECT', kind: 'arrow', id: arrow.id })
    routeDragRef.current = {
      pointerId: event.pointerId,
      arrowId: arrow.id,
      orientation,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffset: arrow.routeMidOffset ?? 0,
    }
  }

  const handleRouteDragMove = (event) => {
    const drag = routeDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    // The middle leg's own orientation determines which axis of movement
    // actually reroutes it - a vertical leg (H-V-H case) shifts sideways
    // with horizontal movement, a horizontal leg (V-H-V case) with vertical.
    const delta =
      drag.orientation === 'vertical'
        ? (event.clientX - drag.startClientX) / zoom
        : (event.clientY - drag.startClientY) / zoom
    dispatch({
      type: 'SET_ARROW_ROUTE_OFFSET',
      id: drag.arrowId,
      offset: drag.startOffset + delta,
    })
  }

  const endRouteDrag = (event) => {
    const drag = routeDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    routeDragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dispatch({ type: 'DRAG_END', id: drag.arrowId })
  }

  const resetRoute = (arrowId, event) => {
    event.stopPropagation()
    dispatch({ type: 'RESET_ARROW_ROUTE', id: arrowId })
  }

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute left-0 top-0 z-20"
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
    >
      <defs>
        <marker id="arrowhead" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
          <polygon points="0 0, 8 3.5, 0 7" fill="var(--color-soft)" />
        </marker>
        <marker
          id="arrowhead-selected"
          markerWidth="9"
          markerHeight="9"
          refX="7"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 8 3.5, 0 7" fill="var(--color-brand-purple)" />
        </marker>
      </defs>

      {routedArrows.map(({ arrow, isSelected, d }) => (
        <g key={arrow.id}>
          <path
            d={d}
            fill="none"
            stroke="transparent"
            strokeWidth={14}
            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
            onPointerDown={(event) => {
              event.stopPropagation()
              dispatch({ type: 'SELECT', kind: 'arrow', id: arrow.id })
            }}
            onDoubleClick={(event) => resetRoute(arrow.id, event)}
          />
          <path
            d={d}
            fill="none"
            stroke={isSelected ? 'var(--color-brand-purple)' : 'var(--color-soft)'}
            strokeWidth={isSelected ? 2 : 1.5}
            markerEnd={`url(#${isSelected ? 'arrowhead-selected' : 'arrowhead'})`}
            style={{ pointerEvents: 'none' }}
          />
        </g>
      ))}

      {/* Rendered as a second, later pass so every handle sits above every
          arrow's own hit-stroke - arrows converging on the same shape route
          close together near it, and a sibling arrow's 14px-wide invisible
          stroke would otherwise win the hit-test over this arrow's own
          circle when they're both rendered arrow-by-arrow in one pass. */}
      {routedArrows.map(({ arrow, isSelected, start, end, midSegment }) => {
        const isDraggingFrom = draggingHandle?.arrowId === arrow.id && draggingHandle.end === 'from'
        const isDraggingTo = draggingHandle?.arrowId === arrow.id && draggingHandle.end === 'to'
        const showFromHandle = isSelected || isDraggingFrom || state.hoveredShapeId === arrow.fromId
        const showToHandle = isSelected || isDraggingTo || state.hoveredShapeId === arrow.toId
        const showRouteHandle = isSelected && midSegment
        const routeCursor = midSegment?.orientation === 'vertical' ? 'ew-resize' : 'ns-resize'
        // The segment is always axis-aligned by construction (vertical:
        // x1===x2, only y varies; horizontal: y1===y2, only x varies), so
        // the fixed offset just goes into whichever coordinate the segment
        // itself varies along.
        const routeHandleCenter = midSegment && {
          x: (midSegment.x1 + midSegment.x2) / 2 + (midSegment.orientation === 'horizontal' ? ROUTE_HANDLE_OFFSET : 0),
          y: (midSegment.y1 + midSegment.y2) / 2 + (midSegment.orientation === 'vertical' ? ROUTE_HANDLE_OFFSET : 0),
        }

        return (
          <g key={arrow.id}>
            {showFromHandle && (
              <circle
                data-arrow-id={arrow.id}
                data-endpoint="from"
                cx={start.x}
                cy={start.y}
                r={HANDLE_RADIUS}
                className="fill-white stroke-brand-purple"
                strokeWidth={1.5}
                style={{ pointerEvents: 'all', cursor: 'grab' }}
                onPointerDown={(event) => beginReconnect(arrow.id, 'from', event)}
                onPointerMove={handleReconnectMove}
                onPointerUp={endReconnect}
                onPointerCancel={endReconnect}
              />
            )}
            {showToHandle && (
              <circle
                data-arrow-id={arrow.id}
                data-endpoint="to"
                cx={end.x}
                cy={end.y}
                r={HANDLE_RADIUS}
                className="fill-white stroke-brand-purple"
                strokeWidth={1.5}
                style={{ pointerEvents: 'all', cursor: 'grab' }}
                onPointerDown={(event) => beginReconnect(arrow.id, 'to', event)}
                onPointerMove={handleReconnectMove}
                onPointerUp={endReconnect}
                onPointerCancel={endReconnect}
              />
            )}
            {showRouteHandle && (
              <>
                <line
                  data-arrow-id={arrow.id}
                  data-route-handle=""
                  x1={midSegment.x1}
                  y1={midSegment.y1}
                  x2={midSegment.x2}
                  y2={midSegment.y2}
                  stroke="transparent"
                  strokeWidth={14}
                  style={{ pointerEvents: 'stroke', cursor: routeCursor }}
                  onPointerDown={(event) => beginRouteDrag(arrow, midSegment.orientation, event)}
                  onPointerMove={handleRouteDragMove}
                  onPointerUp={endRouteDrag}
                  onPointerCancel={endRouteDrag}
                  onDoubleClick={(event) => resetRoute(arrow.id, event)}
                />
                <rect
                  data-arrow-id={arrow.id}
                  data-route-handle="visible"
                  x={routeHandleCenter.x - ROUTE_HANDLE_SIZE / 2}
                  y={routeHandleCenter.y - ROUTE_HANDLE_SIZE / 2}
                  width={ROUTE_HANDLE_SIZE}
                  height={ROUTE_HANDLE_SIZE}
                  rx={2}
                  className="fill-white stroke-brand-purple"
                  strokeWidth={1.5}
                  style={{ pointerEvents: 'all', cursor: routeCursor }}
                  onPointerDown={(event) => beginRouteDrag(arrow, midSegment.orientation, event)}
                  onPointerMove={handleRouteDragMove}
                  onPointerUp={endRouteDrag}
                  onPointerCancel={endRouteDrag}
                  onDoubleClick={(event) => resetRoute(arrow.id, event)}
                />
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default ArrowLayer
